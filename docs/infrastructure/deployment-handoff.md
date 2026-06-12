# Centari Alpha — Deployment Handoff

**Server:** 178.105.219.51 (Namnverket shared server)  
**Status:** Ready to deploy — SSH access pending  
**Repo root on server:** `/opt/centari`  
**Date prepared:** 2026-06-12

---

## Critical read before touching anything

This server already runs Namnverket. The current `docker-compose.yml` contains a port binding that will break Namnverket if started unchanged:

```yaml
nginx:
  ports:
    - "80:80"     # ← THIS will conflict if anything else holds port 80
    - "443:443"   # ← THIS will conflict if Namnverket serves HTTPS
```

The nginx config also uses `server_name _;` (catch-all), meaning if Centari's nginx reaches port 80 first it will intercept all traffic to the server — including Namnverket's.

**The first job after SSH access is restored is discovery, not deployment.** Section 6 lists exactly what to check. Until the port situation is understood, do not run `docker compose up`.

---

## 1. Current Docker stack summary

Five services in a single private bridge network named `centari`. Nothing in the network is reachable from outside except what nginx explicitly forwards.

| Service | Image | Role | Host ports |
|---------|-------|------|-----------|
| `nginx` | nginx:1.27-alpine | Reverse proxy, TLS termination | **80, 443** — *see conflict warning above* |
| `app` | built from `Dockerfile` | Next.js 15 application | none (internal :3000) |
| `postgres` | postgres:16-alpine | Local database for worker state | none (internal :5432) |
| `ollama` | ollama/ollama:latest | LLM inference (Qwen3 4B) | none (internal :11434) |
| `worker` | built from `worker/Dockerfile` | Scheduled research signal processor | none |

**Volumes:**

| Volume | Contents | Risk if deleted |
|--------|----------|----------------|
| `centari_postgres_data` | Worker run history, signal records | Recoverable from backup |
| `centari_ollama_data` | Pulled model files (~2.7 GB) | Re-downloadable, slow |

**Networks:**

| Network | Purpose |
|---------|---------|
| `centari` | Private bridge — all inter-service traffic stays here |

Postgres and Ollama have no `ports:` mappings. They are unreachable from the host network or the internet. Only `nginx` touches the outside world.

---

## 2. Required environment variables

Create `/opt/centari/.env` on the server. Never commit this file to git and never let `deploy.sh` overwrite it.

```bash
# ── Supabase (remote — existing project) ─────────────────────────────────────
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# SUPABASE_SERVICE_ROLE_KEY must NEVER be prefixed with NEXT_PUBLIC_
# It grants full database access. It is only used in server-side code.

# ── MapLibre / MapTiler (public, read-only) ───────────────────────────────────
NEXT_PUBLIC_MAPTILER_KEY=YOUR_MAPTILER_KEY

# ── PostgreSQL (local container — not Supabase) ───────────────────────────────
POSTGRES_USER=centari
POSTGRES_PASSWORD=CHOOSE_A_STRONG_RANDOM_PASSWORD
POSTGRES_DB=centari

# ── Ollama (internal Docker network — do not change) ─────────────────────────
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen3:4b

# ── Research worker ───────────────────────────────────────────────────────────
WORKER_CRON=0 */6 * * *
LOG_LEVEL=info
```

`NEXT_PUBLIC_MAPTILER_KEY` is baked into the Next.js image at build time (Next.js static generation). If it changes, rebuild the image:
```bash
docker compose build --no-cache app
docker compose up -d app
```

All other variables can be changed in `.env` and applied with `docker compose up -d` (no rebuild needed except for `app`).

---

## 3. Safe deploy steps

### Step A — Resolve the Namnverket port conflict first

Run the discovery commands in Section 6 before this step. Based on what you find, choose one of the two approaches below.

---

**Approach 1 — Centari on a non-standard port (recommended for alpha)**

Centari runs on port 8080 instead of 80. Namnverket keeps port 80 untouched. Access Centari at `http://178.105.219.51:8080` during development.

Create `/opt/centari/docker-compose.override.yml` on the server:

```yaml
services:
  nginx:
    ports:
      - "8080:80"    # replaces 80:80 from docker-compose.yml
      - []           # clears the 443 binding — no HTTPS yet
```

Then in the Hetzner Cloud Firewall (or `ufw`), open port 8080 inbound.

---

**Approach 2 — Virtual host via Namnverket's existing nginx**

If Namnverket already runs nginx on port 80, add a server block for Centari's subdomain/IP into Namnverket's nginx config. Centari's own nginx is removed from the equation entirely.

Create `/opt/centari/docker-compose.override.yml` on the server:

```yaml
services:
  nginx:
    ports: []    # bind no ports — Namnverket's nginx reaches app directly
  app:
    ports:
      - "127.0.0.1:3000:3000"    # app reachable on localhost only
```

Then add to Namnverket's nginx config (path confirmed in discovery step):

```nginx
server {
    listen 80;
    server_name centari.yourdomain.com;   # or the server IP

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Reload Namnverket's nginx: `sudo nginx -s reload`

---

### Step B — First-time server setup

```bash
# 1. Install Docker (if not present)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in

# 2. Verify Docker Compose v2
docker compose version

# 3. Create the app directory
sudo mkdir -p /opt/centari
sudo chown $USER:$USER /opt/centari
```

### Step C — Upload files and credentials

From your local machine:

```bash
# Upload environment file (do this before deploy.sh — script checks for it)
scp .env user@178.105.219.51:/opt/centari/.env

# Upload the override file you chose in Step A
scp docker-compose.override.yml user@178.105.219.51:/opt/centari/docker-compose.override.yml

# Sync all repo files
./scripts/deploy.sh user@178.105.219.51
```

### Step D — Start services

```bash
ssh user@178.105.219.51
cd /opt/centari

# Start everything
docker compose up -d

# Watch startup — postgres and ollama take ~30 seconds to become healthy
docker compose ps
docker compose logs -f
```

Expected healthy state (takes 1–2 minutes):

```
NAME                STATUS
centari-nginx-1     running (healthy)
centari-app-1       running (healthy)
centari-postgres-1  running (healthy)
centari-ollama-1    running (healthy)
centari-worker-1    running
```

### Step E — Pull Ollama model (one-time, ~2.7 GB)

```bash
docker compose exec ollama ollama pull qwen3:4b

# Verify
docker compose exec ollama ollama list
```

### Step F — Smoke test

```bash
# Health endpoint
curl -s http://localhost:3000/api/health
# Expected: {"status":"ok"}

# Research map page
curl -sI http://localhost:8080/research
# Expected: HTTP/1.1 200 OK  (or check via browser at http://178.105.219.51:8080/research)

# Worker manual run
docker compose exec worker node dist/index.js --once
# Expected last line: {"level":"info","msg":"Worker run complete","processed":1}
```

---

## 4. Rollback steps

### Rollback a bad code deploy (app or worker only)

```bash
cd /opt/centari

# Stop affected service
docker compose stop app   # or worker

# On local machine: revert the commit and redeploy
git revert HEAD --no-edit
./scripts/deploy.sh user@178.105.219.51
```

### Rollback by reverting to a previous image

Docker keeps the previous image until pruned. To restart the old one:

```bash
# List all images for the app service
docker images | grep centari

# Find the image ID before the bad deploy and tag it
docker tag IMAGE_ID centari-app:rollback

# Edit docker-compose.yml to use that tag temporarily, then:
docker compose up -d app
```

### Rollback Postgres data

```bash
# From local machine — restore from most recent backup
./scripts/restore.sh backups/centari_YYYY-MM-DD_HHMMSS.sql.gz
```

Backups are in `backups/` in the repo root on your local machine. Run `./scripts/backup.sh user@178.105.219.51` before any risky migration to create a snapshot first.

### Nuclear rollback — remove Centari entirely

This leaves Namnverket completely untouched:

```bash
cd /opt/centari

# Stop and remove all Centari containers and networks
docker compose down

# Optionally remove volumes (destroys Postgres data and Ollama model cache)
docker compose down -v

# Remove the app directory
sudo rm -rf /opt/centari

# Remove Docker images
docker images | grep centari | awk '{print $3}' | xargs docker rmi -f
```

Namnverket's processes, nginx configuration, and data are not touched by any of the above.

---

## 5. How to avoid breaking Namnverket

### The four rules

**1. Never run `docker compose up` without the port override in place.**  
The default `docker-compose.yml` binds ports 80 and 443. If anything already holds those ports, Docker will fail to start nginx, or — if the port was briefly free — Centari's nginx will take it and intercept Namnverket's traffic.

**2. Never use `server_name _;` if Centari's nginx is on port 80.**  
The current `nginx/nginx.conf` uses `server_name _;` (match any hostname). This is fine when Centari is the only thing on port 80. If it shares port 80 via virtual hosting with Namnverket's nginx, Centari's nginx is not involved at all (Approach 2). The `_;` only becomes dangerous if Centari's nginx somehow ends up listening on port 80 directly.

**3. Do not modify Namnverket's nginx config without testing the syntax first.**  
If you add a Centari server block to Namnverket's nginx: always run `sudo nginx -t` before `sudo nginx -s reload`. A syntax error will take down Namnverket immediately.

**4. The Centari Postgres container is isolated — it will not interfere with any other database.**  
It has no `ports:` mapping. It is only reachable from within the `centari` Docker network. It will not conflict with any Postgres instance Namnverket may run on the host.

### What Centari touches on the host

| What | Notes |
|------|-------|
| `/opt/centari/` directory | Only Centari files |
| Docker bridge network `centari` | Isolated, no host network impact |
| Volumes `centari_postgres_data`, `centari_ollama_data` | Named volumes, no host path |
| Port 8080 (if using Approach 1) | New port — does not conflict with anything |
| `127.0.0.1:3000` (if using Approach 2) | Loopback only, not exposed externally |

### What Centari does NOT touch

- Namnverket's files, processes, or database
- Host-level nginx configuration
- Any existing Docker containers or networks
- `/etc/` system configuration
- UFW/iptables rules (unless you explicitly change them for port 8080)

---

## 6. Ports and services used

### Centari internal ports (Docker network only — not reachable from internet)

| Port | Service | Direction |
|------|---------|-----------|
| 3000 | app (Next.js) | nginx → app |
| 5432 | postgres | worker → postgres |
| 11434 | ollama | worker → ollama |

### Centari external ports (host-facing)

| Port | Used when | Notes |
|------|-----------|-------|
| 8080 | Approach 1 (alpha) | Must be opened in Hetzner firewall |
| 80 | Approach 2 + Namnverket nginx | Namnverket's nginx handles this |
| 443 | Future HTTPS activation | Not used in alpha |

---

## 7. First commands to run after SSH access is restored

Run these in order. Do not start Centari until you reach the end of this list and have made a decision about ports.

```bash
# ── 1. Confirm you are on the right server ─────────────────────────────────
hostname
uname -a
cat /etc/os-release | grep PRETTY

# ── 2. Check what is holding ports 80 and 443 ─────────────────────────────
sudo ss -tlnp | grep -E ':80|:443|:8080|:3000'
# or:
sudo lsof -i :80 -i :443 2>/dev/null

# KEY QUESTION: Is nginx running on the host (not in Docker)?
#   If yes → what config file is it using?
#   If yes → is it handling Namnverket?

# ── 3. Identify the Namnverket nginx config ────────────────────────────────
# If nginx is running:
sudo nginx -t                              # confirms config path
sudo cat /etc/nginx/sites-enabled/*       # see what it serves
sudo cat /etc/nginx/nginx.conf            # main config
# Note: what server_name values are in use, what ports it listens on

# ── 4. Check existing Docker state ────────────────────────────────────────
docker ps -a                              # any running containers?
docker network ls                         # any existing networks?
docker volume ls                          # any existing volumes?
# Confirm nothing named centari_* already exists

# ── 5. Check disk space ────────────────────────────────────────────────────
df -h
# Ollama model: ~2.7 GB
# Docker images: ~1.5 GB
# Need at least 6 GB free, 10 GB recommended

# ── 6. Check RAM ───────────────────────────────────────────────────────────
free -h
# Need at least 6 GB available for Qwen3 4B
# If < 6 GB free: check what's using memory, or use a smaller model

# ── 7. Check Docker version ────────────────────────────────────────────────
docker --version
docker compose version
# Need Docker Compose v2 (not legacy docker-compose)

# ── 8. Decide on the port approach ────────────────────────────────────────
# After reviewing ss output and nginx configs:
#   - If port 80 is in use by Namnverket nginx → use Approach 2 (virtual host)
#   - If port 80 is free → can use Approach 1 OR 2
#   - If unsure → always use Approach 1 (port 8080) — it cannot break anything

# ── 9. Create the override file ───────────────────────────────────────────
# (Do this before uploading any other files)
# Approach 1:
cat > /opt/centari/docker-compose.override.yml << 'EOF'
services:
  nginx:
    ports:
      - "8080:80"
EOF

# OR Approach 2:
cat > /opt/centari/docker-compose.override.yml << 'EOF'
services:
  nginx:
    ports: []
  app:
    ports:
      - "127.0.0.1:3000:3000"
EOF

# ── 10. Then proceed to Section 3 Step C ──────────────────────────────────
# Upload .env and run deploy.sh from your local machine
```

---

## Appendix: quick reference

### Useful commands on the server

```bash
cd /opt/centari

# Status
docker compose ps

# Logs (live)
docker compose logs -f
docker compose logs -f app       # Next.js only
docker compose logs -f worker    # research worker only

# Manual worker run
docker compose exec worker node dist/index.js --once

# Restart single service
docker compose restart app

# Stop everything (does not delete volumes)
docker compose down

# Rebuild after code change
docker compose build app worker && docker compose up -d app worker
```

### Files that must exist on the server before starting

```
/opt/centari/
├── .env                              ← credentials — upload manually, never via deploy.sh
├── docker-compose.yml                ← synced by deploy.sh
├── docker-compose.override.yml       ← created manually per Section 7 step 9
├── Dockerfile
├── worker/
├── nginx/nginx.conf
└── postgres/init/001_worker_schema.sql
```

### If something goes wrong

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `nginx` container won't start | Port 80/443 already in use | Add docker-compose.override.yml with port 8080 |
| `app` container crashes immediately | Missing or malformed `.env` | Check `docker compose logs app`; verify `.env` exists |
| `worker` stays unhealthy | Ollama model not yet pulled | `docker compose exec ollama ollama pull qwen3:4b` |
| `postgres` unhealthy | POSTGRES_PASSWORD missing in `.env` | Check `.env`, then `docker compose up -d postgres` |
| Namnverket stops responding | Centari nginx took port 80 | `docker compose stop nginx`, verify Namnverket nginx is still running |
