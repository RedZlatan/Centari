# Sprint — Centari Alpha Infrastructure

**Goal:** Establish a persistent Centari development environment on Hetzner.  
**Status:** Files complete — requires server details to execute  
**Not in scope:** Production launch, public marketing site

---

## Architecture

```
Internet :80/:443
     │
     ▼
┌─────────────────────────────────────────────┐
│  nginx:1.27-alpine  (reverse proxy)         │
│  ports: 80, 443 → host                      │
└────────────────────┬────────────────────────┘
                     │ proxy_pass :3000
                     ▼
┌─────────────────────────────────────────────┐
│  app  (Next.js 15, standalone)              │
│  port: 3000 (internal only)                 │
│  reads: Supabase (remote), src/data/*.json  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  worker  (Node.js, scheduled via node-cron) │
│  triggers: every 6h (WORKER_CRON)           │
│  writes: postgres (local)                   │
│  calls: ollama (internal)                   │
└────────┬──────────────────┬─────────────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────────┐
│  postgres:16    │  │  ollama/ollama        │
│  port: 5432     │  │  port: 11434          │
│  (internal)     │  │  model: qwen3:4b      │
│  vol: pgdata    │  │  vol: ollama_data     │
└─────────────────┘  └──────────────────────┘

All services on Docker bridge network: centari
Only nginx is exposed to the host
Ollama is NOT reachable from outside the server
```

---

## Files delivered

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage Next.js build (standalone output) |
| `.dockerignore` | Excludes build artifacts and secrets from image |
| `docker-compose.yml` | All five services: nginx, app, postgres, ollama, worker |
| `nginx/nginx.conf` | Reverse proxy; static asset caching; HTTPS section commented |
| `nginx/ssl/.gitkeep` | Placeholder — mount real certs here when ready |
| `worker/Dockerfile` | Two-stage TypeScript build for the worker |
| `worker/package.json` | node-cron, pg, @supabase/supabase-js |
| `worker/tsconfig.json` | CommonJS output to dist/ |
| `worker/src/index.ts` | Scheduled worker: Ollama health, Postgres writes, graceful shutdown |
| `postgres/init/001_worker_schema.sql` | Auto-runs on first container start |
| `scripts/deploy.sh` | rsync + docker compose up from local to server |
| `scripts/backup.sh` | pg_dump → gzip, local or remote, 30-day retention |
| `scripts/restore.sh` | Drop/recreate DB + restore from .sql.gz |
| `src/app/api/health/route.ts` | `GET /api/health` for docker-compose healthcheck |
| `.env.example` | Environment variable template |

---

## Prerequisites (fill in before running)

From `docs/sprints/sprint-r3.md` Section 1 — confirm before executing any step:

- [ ] SSH: `user@server-ip`, key at `~/.ssh/id_ed25519_centari`
- [ ] Server: Ubuntu 22.04+, ≥ 8 GB RAM, ≥ 40 GB disk free
- [ ] Docker and Docker Compose v2 installed on server
- [ ] `.env` file ready locally (copy `.env.example`, fill in all values)
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` confirmed working

---

## Initial server setup (run once)

```bash
# 1. SSH into server
ssh user@SERVER_IP

# 2. Install Docker (if not installed)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group to apply

# 3. Verify Docker Compose v2
docker compose version   # expect Docker Compose version v2.x.x

# 4. Create app directory
sudo mkdir -p /opt/centari
sudo chown $USER:$USER /opt/centari
```

---

## First deploy

```bash
# On your local machine, from the repo root:

# 1. Copy and fill the environment file
cp .env.example .env
# Edit .env — fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# NEXT_PUBLIC_MAPTILER_KEY, and POSTGRES_PASSWORD

# 2. Upload .env to server (never let deploy.sh touch it)
scp .env user@SERVER_IP:/opt/centari/.env

# 3. Run deploy
./scripts/deploy.sh user@SERVER_IP

# 4. Pull the Ollama model (one time — ~2.7 GB download)
ssh user@SERVER_IP "cd /opt/centari && docker compose exec ollama ollama pull qwen3:4b"

# 5. Trigger a manual worker run to verify the pipeline
ssh user@SERVER_IP "cd /opt/centari && docker compose exec worker node dist/index.js --once"
```

Expected output from step 5:
```json
{"ts":"...","level":"info","msg":"Centari Research Worker starting","mode":"once"}
{"ts":"...","level":"info","msg":"Ollama inference OK","response":"Quantum error correction..."}
{"ts":"...","level":"info","msg":"Worker run complete","processed":1}
```

---

## Subsequent deploys (code changes)

```bash
# From local machine — redeploys app and worker only
./scripts/deploy.sh user@SERVER_IP

# The script:
#   1. rsyncs changed files (skipping .env, node_modules, .next)
#   2. rebuilds app and worker images
#   3. runs docker compose up -d --remove-orphans
#   4. prunes dangling images
```

---

## Day-to-day operations

### View logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f app
docker compose logs -f worker
docker compose logs -f nginx
```

### Check service status

```bash
docker compose ps
docker compose top
```

### Manual worker run

```bash
docker compose exec worker node dist/index.js --once
```

### Check Ollama model status

```bash
docker compose exec ollama ollama list
docker compose exec ollama ollama ps    # shows loaded models
```

### Restart a single service

```bash
docker compose restart app
docker compose restart worker
```

### Backup

```bash
# From local machine — pulls a backup from the remote server
./scripts/backup.sh user@SERVER_IP

# Or run locally against a local stack
./scripts/backup.sh

# Backups land in: backups/centari_YYYY-MM-DD_HHMMSS.sql.gz
# Files older than 30 days are pruned automatically
```

### Restore

```bash
# WARNING: drops and recreates the database
./scripts/restore.sh backups/centari_2026-06-12_120000.sql.gz
```

---

## Activating HTTPS (when ready)

1. Obtain a certificate (Let's Encrypt via certbot, or a paid cert):
   ```bash
   # On server — install certbot
   sudo apt install certbot
   sudo certbot certonly --standalone -d your.domain.com
   # Cert lands at /etc/letsencrypt/live/your.domain.com/
   ```

2. Copy certs into the nginx ssl directory:
   ```bash
   # On server
   cp /etc/letsencrypt/live/your.domain.com/fullchain.pem /opt/centari/nginx/ssl/cert.pem
   cp /etc/letsencrypt/live/your.domain.com/privkey.pem   /opt/centari/nginx/ssl/key.pem
   ```

3. Edit `nginx/nginx.conf`:
   - Uncomment the HTTPS server block
   - Replace the HTTP server block with: `return 301 https://$host$request_uri;`
   - Set `server_name your.domain.com;`

4. Reload nginx:
   ```bash
   docker compose exec nginx nginx -s reload
   ```

5. Automate cert renewal:
   ```bash
   # On server — add to crontab
   0 3 * * * certbot renew --quiet && \
     cp /etc/letsencrypt/live/your.domain.com/fullchain.pem /opt/centari/nginx/ssl/cert.pem && \
     cp /etc/letsencrypt/live/your.domain.com/privkey.pem   /opt/centari/nginx/ssl/key.pem && \
     docker compose -f /opt/centari/docker-compose.yml exec nginx nginx -s reload
   ```

---

## Rollback

```bash
# On server — roll back to a previous image
docker compose down
git checkout <previous-commit>  # or git pull and revert
docker compose build app worker
docker compose up -d
```

If the database is corrupted:
```bash
# Restore from most recent backup
./scripts/restore.sh backups/centari_<latest>.sql.gz
```

---

## Environment variable reference

| Variable | Used by | Required | Description |
|----------|---------|----------|-------------|
| `SUPABASE_URL` | app, worker | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | app, worker | Yes | **Server-side only. Never prefix NEXT_PUBLIC_.** |
| `NEXT_PUBLIC_MAPTILER_KEY` | app | No | MapTiler tile key (public, read-only) |
| `POSTGRES_USER` | postgres, worker | Yes | Local Postgres username |
| `POSTGRES_PASSWORD` | postgres, worker | Yes | Local Postgres password — choose strong |
| `POSTGRES_DB` | postgres, worker | Yes | Local Postgres database name |
| `OLLAMA_BASE_URL` | worker | Yes | Default: `http://ollama:11434` |
| `OLLAMA_MODEL` | worker | Yes | Default: `qwen3:4b` |
| `WORKER_CRON` | worker | No | Default: `0 */6 * * *` (every 6h) |
| `LOG_LEVEL` | worker | No | Default: `info` |

---

## Security checklist

- [ ] `.env` is on the server only — never in git, never in the image
- [ ] `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix
- [ ] Ollama is not exposed on a host port (no `ports:` in compose for ollama)
- [ ] Postgres is not exposed on a host port (no `ports:` in compose for postgres)
- [ ] SSH password auth disabled on server
- [ ] Hetzner firewall: only ports 22, 80, 443 open inbound
- [ ] SSL certs in `nginx/ssl/` are excluded from git (`.gitignore`)

---

## Next sprint dependencies

| Sprint | Depends on |
|--------|-----------|
| R3B — Worker logic (signal ingestion) | This sprint complete |
| R3C — Wire worker output to Research Map | R3B |
| SSL / domain activation | DNS record pointing to server |
