#!/usr/bin/env bash
# phase0-baseline.sh — capture row counts of artifacts/links/units tables
#
# Sprint: Opus 4.7 Alignment & Sprint Persistence (2026-04-18), Batch 1 Task 1.
# Writes aicodepath-docs/temp/phase0-baseline.json with keys artifacts, links, units.
# The output is the pre-fix reference point for Phase 0 diagnostic measurement.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DB="${ROOT}/aicodepath-docs/aicodepath.db"
OUT_DIR="${ROOT}/aicodepath-docs/temp"
OUT="${OUT_DIR}/phase0-baseline.json"

if [ ! -f "${DB}" ]; then
  echo "phase0-baseline: DB not found at ${DB}" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

count() {
  sqlite3 "${DB}" "SELECT COUNT(*) FROM $1;" 2>/dev/null || echo 0
}

ARTIFACTS=$(count artifacts)
LINKS=$(count links)
UNITS=$(count units)

printf '{"artifacts":%d,"links":%d,"units":%d}\n' \
  "${ARTIFACTS}" "${LINKS}" "${UNITS}" > "${OUT}"

echo "phase0-baseline: wrote ${OUT} (artifacts=${ARTIFACTS} links=${LINKS} units=${UNITS})"
