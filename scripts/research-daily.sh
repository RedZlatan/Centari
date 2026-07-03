#!/usr/bin/env bash
# Run the daily Centari research ingestion and Journal curation pipeline.
#
# This is intentionally boring: one command for local use, cron, and the
# Hetzner server. Keep source-specific tuning here instead of in deployment docs.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
elif [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set." >&2
  exit 1
fi

MAX_OPENALEX="${MAX_OPENALEX:-80}"
MAX_ARXIV_PER_CATEGORY="${MAX_ARXIV_PER_CATEGORY:-8}"
MAX_NSF="${MAX_NSF:-130}"
MAX_OSTI="${MAX_OSTI:-120}"
MAX_CORDIS="${MAX_CORDIS:-90}"
MAX_NASA="${MAX_NASA:-30}"
LOOKBACK_DAYS="${LOOKBACK_DAYS:-30}"
CORDIS_START_YEAR="${CORDIS_START_YEAR:-2022}"
JOURNAL_DAYS="${JOURNAL_DAYS:-7}"
SNAPSHOT_PERIODS="${SNAPSHOT_PERIODS:-daily weekly}"

run_step() {
  echo ""
  echo "==> $*"
  "$@"
}

run_step npx tsx worker/src/openalex.ts --max="$MAX_OPENALEX" --days="$LOOKBACK_DAYS"
run_step npx tsx worker/src/arxiv.ts --per-category="$MAX_ARXIV_PER_CATEGORY" --days="$LOOKBACK_DAYS"
run_step npx tsx worker/src/nsf.ts --max="$MAX_NSF" --days="$LOOKBACK_DAYS"
run_step npx tsx worker/src/osti.ts --max="$MAX_OSTI" --days="$LOOKBACK_DAYS"
run_step npx tsx worker/src/cordis.ts --max="$MAX_CORDIS" --start-year="$CORDIS_START_YEAR"
run_step npx tsx worker/src/nasa.ts --max="$MAX_NASA"

for period in $SNAPSHOT_PERIODS; do
  run_step npx tsx worker/src/snapshots.ts --period="$period"
done
run_step npx tsx worker/src/journal-curator.ts --period=daily --days="$JOURNAL_DAYS"

echo ""
echo "Daily research pipeline complete."
