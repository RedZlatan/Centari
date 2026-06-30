# Sprint R3 — Server Research Worker Bootstrap

**Status:** Blocked — awaiting server details (see Section 1)  
**Goal:** Prepare the Hetzner server to run the Centari Research Worker: Ollama + Qwen3, a Node/Python worker process, Supabase connection, manual test run, and a cron-ready service unit.

---

## 1. Credentials and server details checklist

**Nothing in this sprint can proceed until all items in this section are confirmed.**

### 1.1 SSH access

| Item | Value | Status |
|------|-------|--------|
| Server IPv4 address | `___________________` | ☐ |
| SSH port (default 22) | `___________________` | ☐ |
| SSH login user | `___________________` | ☐ |
| SSH key path (local) | e.g. `~/.ssh/id_ed25519_centari` | ☐ |
| Can `ssh user@ip` connect right now? | yes / no | ☐ |

### 1.2 Server specifications

These determine whether Qwen3 4B or 8B is viable.

| Item | Value | Status |
|------|-------|--------|
| Hetzner plan name | e.g. CX31, CPX41, CCX23 | ☐ |
| RAM (GB) | `___________________` | ☐ |
| vCPU count | `___________________` | ☐ |
| Disk free (GB) | `___________________` | ☐ |
| OS and version | e.g. Ubuntu 22.04 LTS | ☐ |
| GPU present? | yes (model) / no | ☐ |

**Model sizing guide:**

| Server RAM | Recommended model |
|-----------|------------------|
| ≤ 6 GB | Not viable — do not attempt |
| 8 GB | Qwen3 4B (q4_K_M quantisation) — leaves ~2 GB headroom |
| 16 GB | Qwen3 8B (q4_K_M) — comfortable; 4B leaves headroom for other processes |
| 32 GB+ | Qwen3 8B (q8) or 14B (q4) |

### 1.3 What is already installed?

Run these on the server and note the output:

```bash
which node && node --version
which python3 && python3 --version
which ollama && ollama --version
which git && git --version
systemctl is-active ollama 2>/dev/null || echo "ollama service: not found"
```

| Item | Installed? | Version |
|------|-----------|---------|
| Node.js | ☐ | |
| Python 3 | ☐ | |
| Ollama | ☐ | |
| Git | ☐ | |
| Ollama systemd service | ☐ | |

### 1.4 Supabase / database credentials

The worker needs to read and write the Supabase database. These must NOT be committed to the repository.

| Item | Available? | Notes |
|------|-----------|-------|
| `SUPABASE_URL` (project URL, e.g. `https://xyz.supabase.co`) | ☐ | Already in `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | ☐ | **Server-side only. Never prefix with NEXT_PUBLIC_.** |
| Direct Postgres connection string (optional) | ☐ | Only needed if bypassing Supabase SDK |

### 1.5 Network constraints

| Item | Value | Status |
|------|-------|--------|
| Is port 11434 (Ollama default) open inbound? | yes / no / unknown | ☐ |
| Is the worker expected to be publicly accessible? | yes / no | ☐ |
| Is there a firewall managed externally (Hetzner Cloud Firewall)? | yes / no | ☐ |
| Existing domain or subdomain for the server? | `___________________` | ☐ |

---

## 2. Installation plan

### Overview

```
Hetzner server
├── Ollama daemon (systemd service, listens on 127.0.0.1:11434)
│   └── Qwen3 4B or 8B model (~2.5–5 GB disk)
├── Research Worker (Node.js or Python, systemd service or cron)
│   ├── Calls Ollama HTTP API for inference
│   ├── Calls Supabase SDK to read/write signals
│   └── Reads .env from /etc/centari/worker.env (not in git)
└── Cron/systemd timer — scheduled signal refresh
```

### Phase 1 — System prerequisites

Install core dependencies that may be missing on a fresh VPS.

### Phase 2 — Ollama installation and model pull

Install Ollama via the official script, pull the chosen Qwen3 model, and verify it responds to a test prompt.

### Phase 3 — Worker code deployment

Copy the worker script from local to server, install its dependencies, configure its `.env`, and run a manual test against Supabase.

### Phase 4 — Service unit and schedule

Register the worker as a systemd service and configure either a systemd timer or cron entry for the production schedule.

### Phase 5 — Smoke test

Run the full pipeline end-to-end: worker calls Ollama, processes a test signal, writes to Supabase, confirm the row appears.

---

## 3. Exact commands

**All commands are run on the Hetzner server over SSH unless marked `[local]`.**

### 3.0 Connect

```bash
# [local] — replace with actual values confirmed in Section 1
ssh -i ~/.ssh/id_ed25519_centari USER@SERVER_IP
```

### 3.1 System prerequisites

```bash
# Update package index
sudo apt-get update

# Install runtime dependencies
sudo apt-get install -y \
  curl \
  git \
  build-essential \
  ca-certificates \
  gnupg

# Install Node.js 22 LTS via NodeSource (skip if already installed)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version   # expect v22.x.x
npm --version

# Install Python 3 (skip if already installed)
sudo apt-get install -y python3 python3-pip python3-venv

# Verify
python3 --version
```

### 3.2 Install Ollama

```bash
# Official install script — pulls the latest release, creates systemd unit
curl -fsSL https://ollama.com/install.sh | sh

# Verify the service started
systemctl status ollama

# IMPORTANT: by default Ollama binds to 0.0.0.0:11434 after the install script.
# Lock it to localhost only (see Section 5 — Security).
sudo systemctl edit ollama
```

In the override editor that opens, add:

```ini
[Service]
Environment="OLLAMA_HOST=127.0.0.1:11434"
```

Save and reload:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
systemctl status ollama

# Confirm it is listening only on loopback
ss -tlnp | grep 11434
# Expected: 127.0.0.1:11434, NOT 0.0.0.0:11434
```

### 3.3 Pull Qwen3 model

```bash
# Pull Qwen3 4B (q4_K_M) — ~2.7 GB download
ollama pull qwen3:4b

# OR pull Qwen3 8B (q4_K_M) — ~5.2 GB download — only if server RAM >= 16 GB
# ollama pull qwen3:8b

# Verify the model is available
ollama list

# Smoke test: should return a coherent one-sentence reply
ollama run qwen3:4b "Summarise in one sentence: What is quantum computing?" --nowordwrap
```

### 3.4 Deploy worker code

```bash
# [local] — create the worker directory on the server
ssh USER@SERVER_IP "sudo mkdir -p /opt/centari/worker && sudo chown $USER:$USER /opt/centari/worker"

# [local] — copy worker files to server (once worker/ directory exists in repo)
rsync -avz --exclude node_modules --exclude .env \
  ./worker/ \
  USER@SERVER_IP:/opt/centari/worker/

# On server — install dependencies
cd /opt/centari/worker
npm install       # if Node worker
# OR
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt  # if Python worker
```

### 3.5 Configure environment

```bash
# On server — write credentials to a file outside the git tree
sudo mkdir -p /etc/centari
sudo tee /etc/centari/worker.env > /dev/null <<'EOF'
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...YOUR_KEY...
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:4b
LOG_LEVEL=info
EOF

# Restrict permissions — only root and the service user should read this
sudo chmod 600 /etc/centari/worker.env
sudo chown root:root /etc/centari/worker.env
```

### 3.6 Manual test run

```bash
# Run the worker once in foreground — confirms Ollama and Supabase both respond
cd /opt/centari/worker

# Node
node --env-file=/etc/centari/worker.env src/index.js --once

# OR Python
env $(cat /etc/centari/worker.env | xargs) python3 -m worker --once

# Expected output:
# [worker] Ollama OK: model qwen3:4b loaded
# [worker] Supabase OK: connected to project
# [worker] Processed N signals
# [worker] Done
```

### 3.7 Register as systemd service

```bash
sudo tee /etc/systemd/system/centari-worker.service > /dev/null <<'EOF'
[Unit]
Description=Centari Research Worker
After=network-online.target ollama.service
Wants=network-online.target
Requires=ollama.service

[Service]
Type=oneshot
User=www-data
Group=www-data
WorkingDirectory=/opt/centari/worker
EnvironmentFile=/etc/centari/worker.env
ExecStart=/usr/bin/node /opt/centari/worker/src/index.js --once
StandardOutput=journal
StandardError=journal
SyslogIdentifier=centari-worker

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload

# Test the service unit (manual trigger)
sudo systemctl start centari-worker
sudo journalctl -u centari-worker -f
```

### 3.8 Register systemd timer (cron equivalent)

```bash
sudo tee /etc/systemd/system/centari-worker.timer > /dev/null <<'EOF'
[Unit]
Description=Centari Research Worker — scheduled run
Requires=centari-worker.service

[Timer]
# Run every 6 hours; first run 2 minutes after boot
OnBootSec=2min
OnUnitActiveSec=6h
AccuracySec=5min
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable centari-worker.timer
sudo systemctl start centari-worker.timer

# Verify
systemctl list-timers --all | grep centari
```

---

## 4. Rollback notes

### Rollback Ollama model

```bash
# Remove the pulled model (frees disk space)
ollama rm qwen3:4b

# Re-pull a different variant if needed
ollama pull qwen3:4b  # or qwen3:8b
```

### Rollback Ollama service

```bash
# Stop and disable the service
sudo systemctl stop ollama
sudo systemctl disable ollama

# Remove the systemd override if you added one
sudo rm -f /etc/systemd/system/ollama.service.d/override.conf
sudo systemctl daemon-reload

# Uninstall Ollama binary
sudo rm /usr/local/bin/ollama

# Remove models (optional — large directory)
sudo rm -rf /usr/share/ollama
```

### Rollback worker service

```bash
# Stop and disable the timer and service
sudo systemctl stop centari-worker.timer centari-worker
sudo systemctl disable centari-worker.timer centari-worker

# Remove unit files
sudo rm /etc/systemd/system/centari-worker.service
sudo rm /etc/systemd/system/centari-worker.timer
sudo systemctl daemon-reload

# Remove worker files
sudo rm -rf /opt/centari/worker

# Remove credentials (irreversible — confirm keys are backed up elsewhere first)
sudo rm /etc/centari/worker.env
```

### Rollback Node.js

```bash
# Remove NodeSource Node.js
sudo apt-get remove --purge nodejs
sudo rm -f /etc/apt/sources.list.d/nodesource.list
sudo apt-get autoremove
```

### Rollback Supabase data

The worker only writes to Supabase — it does not modify the schema. If a bad run writes corrupt data:

```sql
-- In Supabase SQL editor — delete worker-generated rows newer than the bad run timestamp
DELETE FROM research_signals
WHERE ingested_at > '2026-06-12T00:00:00Z'
  AND source = 'worker';
```

---

## 5. Security notes

### Ollama must not be publicly accessible

The default Ollama install script exposes the API on `0.0.0.0:11434`. Anyone who can reach that port can make inference requests against your server, burning compute and potentially leaking data. The systemd override in Section 3.2 (`OLLAMA_HOST=127.0.0.1:11434`) restricts it to loopback. Verify with:

```bash
ss -tlnp | grep 11434
# Must show 127.0.0.1:11434, not 0.0.0.0 or :::11434
```

If the Hetzner Cloud Firewall is used, also block port 11434 inbound at the firewall level as a defence-in-depth measure.

### Service role key handling

- `SUPABASE_SERVICE_ROLE_KEY` lives only in `/etc/centari/worker.env` on the server, with `chmod 600`.
- It is never in the git repository, never in `.env.local` committed to the repo, never in a systemd unit file (which is world-readable), and never logged.
- The worker process runs as `www-data` (non-root). Root reads the env file once at service start and passes it into the process environment. `www-data` cannot read `/etc/centari/worker.env` directly.

### Worker runs as non-root

The `User=www-data` line in the service unit ensures the worker process cannot modify system files, install software, or access other users' files. If the worker is compromised, the blast radius is limited to `/opt/centari/worker/` and the Supabase connection.

### SSH hardening (verify these are already in place)

```bash
# On server — confirm password auth is disabled
grep PasswordAuthentication /etc/ssh/sshd_config
# Expected: PasswordAuthentication no

# Confirm root login is disabled
grep PermitRootLogin /etc/ssh/sshd_config
# Expected: PermitRootLogin no
```

If either is not set, apply and restart sshd:

```bash
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### Hetzner Cloud Firewall recommended rules (minimum)

| Direction | Protocol | Port | Source | Action |
|-----------|----------|------|--------|--------|
| Inbound | TCP | 22 | Your IP only | Allow |
| Inbound | TCP | 80, 443 | Any | Allow (if serving HTTP) |
| Inbound | TCP | 11434 | None | Block (Ollama — loopback only) |
| Outbound | All | All | Any | Allow |

---

## 6. Local-to-server deployment steps

These steps deploy updated worker code from your local machine to the server without downtime.

### First deploy

1. Confirm all Section 1 items are checked.
2. SSH into server: `ssh -i KEY USER@IP`
3. Run Sections 3.1 → 3.8 in order.
4. Confirm `sudo systemctl start centari-worker` succeeds and logs show clean output.
5. Confirm `systemctl list-timers` shows `centari-worker.timer` scheduled.

### Subsequent deploys (code update only)

```bash
# [local] — stop the timer so a run doesn't collide with deployment
ssh USER@SERVER_IP "sudo systemctl stop centari-worker.timer"

# [local] — sync updated worker code
rsync -avz --exclude node_modules --exclude .env \
  ./worker/ \
  USER@SERVER_IP:/opt/centari/worker/

# [local] — reinstall dependencies if package.json changed
ssh USER@SERVER_IP "cd /opt/centari/worker && npm install"

# [local] — run a manual test before re-enabling the timer
ssh USER@SERVER_IP "sudo systemctl start centari-worker && sudo journalctl -u centari-worker -n 50 --no-pager"

# [local] — re-enable the timer
ssh USER@SERVER_IP "sudo systemctl start centari-worker.timer"
```

### Checking worker health

```bash
# See last run result
sudo journalctl -u centari-worker -n 100 --no-pager

# See when next run is scheduled
systemctl list-timers centari-worker.timer

# See Ollama model memory usage
ollama ps

# See server resource usage
htop
# or: free -h && df -h
```

---

## Appendix: Qwen3 on CPU vs GPU

The worker can run without a GPU. CPU inference with Ollama is slower but sufficient for a batch research worker that does not need real-time response.

| Setup | 4B inference speed | 8B inference speed | Use case |
|-------|-------------------|-------------------|----------|
| CPU only (no AVX2) | ~3–5 tok/s | ~1–2 tok/s | Minimal — may time out |
| CPU with AVX2 (modern Intel/AMD) | ~8–15 tok/s | ~4–8 tok/s | Acceptable for batch jobs |
| GPU (NVIDIA, 8GB VRAM) | ~60–100 tok/s | ~30–60 tok/s | Comfortable, real-time viable |

To check for AVX2 support on the server:

```bash
grep avx2 /proc/cpuinfo | head -1
```

If no AVX2 output: consider Qwen3 4B only and set generous timeouts in the worker.

---

## Next steps (after server details confirmed)

1. Build the actual worker script (`worker/src/index.ts` or `worker/worker.py`) — Sprint R3B
2. Design the Supabase table schema for worker-generated signals — Sprint R3B
3. Define the prompt template Qwen3 will use to summarise/classify raw signals — Sprint R3B
4. Wire the worker output back to the Research Map data layer (V2 schema) — Sprint R3C
