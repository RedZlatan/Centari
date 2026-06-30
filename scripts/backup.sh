#!/usr/bin/env bash
# backup.sh — dump Postgres to a compressed local file
#
# Usage:
#   ./scripts/backup.sh                 # dump from local Docker Compose
#   ./scripts/backup.sh user@server-ip  # dump from remote server via SSH
#
# Output: backups/centari_YYYY-MM-DD_HHMMSS.sql.gz
#
# The script NEVER touches Supabase — that is managed externally.

set -euo pipefail

BACKUP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
FILENAME="centari_${TIMESTAMP}.sql.gz"
TARGET="${BACKUP_DIR}/${FILENAME}"

mkdir -p "$BACKUP_DIR"

SERVER="${1:-}"

if [[ -z "$SERVER" ]]; then
  # ── Local backup ───────────────────────────────────────────────────────────
  echo "→ Backing up local Postgres..."

  # Load POSTGRES_USER and POSTGRES_DB from .env if present
  if [[ -f .env ]]; then
    set -o allexport
    # shellcheck disable=SC1091
    source .env
    set +o allexport
  fi

  POSTGRES_USER="${POSTGRES_USER:-centari}"
  POSTGRES_DB="${POSTGRES_DB:-centari}"

  docker compose exec -T postgres \
    pg_dump \
      --username="$POSTGRES_USER" \
      --dbname="$POSTGRES_DB" \
      --no-password \
      --format=plain \
      --no-owner \
      --no-acl \
    | gzip > "$TARGET"

else
  # ── Remote backup via SSH ──────────────────────────────────────────────────
  echo "→ Backing up remote Postgres at ${SERVER}..."
  DEPLOY_DIR="/opt/centari"

  SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
  if [[ -n "${SSH_KEY:-}" ]]; then
    SSH_OPTS+=(-i "$SSH_KEY")
  fi

  ssh "${SSH_OPTS[@]}" "$SERVER" bash <<REMOTE | gzip > "$TARGET"
    set -euo pipefail
    cd ${DEPLOY_DIR}
    source .env 2>/dev/null || true
    POSTGRES_USER="\${POSTGRES_USER:-centari}"
    POSTGRES_DB="\${POSTGRES_DB:-centari}"
    docker compose exec -T postgres \
      pg_dump \
        --username="\$POSTGRES_USER" \
        --dbname="\$POSTGRES_DB" \
        --no-password \
        --format=plain \
        --no-owner \
        --no-acl
REMOTE
fi

SIZE=$(du -sh "$TARGET" | cut -f1)
echo "✓ Backup written: ${TARGET} (${SIZE})"

# ── Prune backups older than 30 days ─────────────────────────────────────────
find "$BACKUP_DIR" -name "centari_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
REMAINING=$(find "$BACKUP_DIR" -name "centari_*.sql.gz" | wc -l | tr -d ' ')
echo "  Backups retained: ${REMAINING}"
