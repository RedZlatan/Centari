#!/usr/bin/env bash
# deploy.sh — sync and restart Centari on the Hetzner server
#
# Usage:
#   ./scripts/deploy.sh user@server-ip
#   SERVER=user@1.2.3.4 ./scripts/deploy.sh
#
# Environment variables:
#   SERVER    SSH target (user@host). Required if not passed as argument.
#   SSH_KEY   Path to SSH key. Optional — uses ssh-agent if not set.
#   BRANCH    Git branch to deploy. Default: current branch.

set -euo pipefail

# ── Arguments ─────────────────────────────────────────────────────────────────
SERVER="${1:-${SERVER:-}}"
if [[ -z "$SERVER" ]]; then
  echo "ERROR: specify the server as an argument or set SERVER=user@host" >&2
  exit 1
fi

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
fi

DEPLOY_DIR="/opt/centari"
BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
COMMIT=$(git rev-parse --short HEAD)

echo "→ Deploying branch '${BRANCH}' (${COMMIT}) to ${SERVER}:${DEPLOY_DIR}"

# ── 1. Ensure remote directory exists ────────────────────────────────────────
ssh "${SSH_OPTS[@]}" "$SERVER" "sudo mkdir -p ${DEPLOY_DIR} && sudo chown \$(whoami):\$(whoami) ${DEPLOY_DIR}"

# ── 2. Sync files (exclude build artifacts and secrets) ──────────────────────
echo "→ Syncing files..."
rsync -avz --progress \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  --exclude='data/' \
  --exclude='coverage/' \
  --filter=':- .gitignore' \
  -e "ssh ${SSH_OPTS[*]}" \
  ./ \
  "${SERVER}:${DEPLOY_DIR}/"

# ── 3. Verify .env exists on server (never sync it from local) ───────────────
echo "→ Checking .env on server..."
if ! ssh "${SSH_OPTS[@]}" "$SERVER" "test -f ${DEPLOY_DIR}/.env"; then
  echo ""
  echo "WARNING: ${DEPLOY_DIR}/.env does not exist on the server."
  echo "Copy it manually before starting services:"
  echo "  scp .env ${SERVER}:${DEPLOY_DIR}/.env"
  echo ""
fi

# ── 4. Build and restart services ────────────────────────────────────────────
echo "→ Building and restarting services..."
ssh "${SSH_OPTS[@]}" "$SERVER" bash <<REMOTE
  set -euo pipefail
  cd ${DEPLOY_DIR}

  # Pull latest Docker images (postgres, nginx, ollama)
  docker compose pull --quiet nginx postgres ollama 2>/dev/null || true

  # Rebuild application images (app, worker)
  docker compose build --no-cache app worker

  # Restart services with zero-downtime rolling update
  docker compose up -d --remove-orphans

  # Clean up dangling images
  docker image prune -f --filter "dangling=true" 2>/dev/null || true

  echo "Services running:"
  docker compose ps
REMOTE

echo ""
echo "✓ Deploy complete: ${COMMIT}"
echo "  App:    http://${SERVER%%@*} (or your server IP)"
echo "  Logs:   ssh ${SERVER} 'cd ${DEPLOY_DIR} && docker compose logs -f'"
echo "  Status: ssh ${SERVER} 'cd ${DEPLOY_DIR} && docker compose ps'"
