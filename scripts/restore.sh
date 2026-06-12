#!/usr/bin/env bash
# restore.sh — restore Postgres from a backup file
#
# Usage:
#   ./scripts/restore.sh backups/centari_2026-06-12_120000.sql.gz
#
# WARNING: This DROPS and recreates the database. All current data will be lost.
# Only run this when you know what you are doing.

set -euo pipefail

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  exit 1
fi
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: File not found: $BACKUP_FILE" >&2
  exit 1
fi

# ── Confirm ───────────────────────────────────────────────────────────────────
echo "WARNING: This will DROP the current database and restore from:"
echo "  $BACKUP_FILE"
echo ""
read -r -p "Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

# ── Load env ──────────────────────────────────────────────────────────────────
if [[ -f .env ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

POSTGRES_USER="${POSTGRES_USER:-centari}"
POSTGRES_DB="${POSTGRES_DB:-centari}"

# ── Drop and recreate database ────────────────────────────────────────────────
echo "→ Dropping database ${POSTGRES_DB}..."
docker compose exec -T postgres \
  psql --username="$POSTGRES_USER" --dbname=postgres \
       --command="DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";" 2>&1

docker compose exec -T postgres \
  psql --username="$POSTGRES_USER" --dbname=postgres \
       --command="CREATE DATABASE \"${POSTGRES_DB}\";" 2>&1

# ── Restore ───────────────────────────────────────────────────────────────────
echo "→ Restoring from ${BACKUP_FILE}..."
gzip -dc "$BACKUP_FILE" | docker compose exec -T postgres \
  psql \
    --username="$POSTGRES_USER" \
    --dbname="$POSTGRES_DB" \
    --quiet

echo "✓ Restore complete."
echo "  Restart services if needed: docker compose restart app worker"
