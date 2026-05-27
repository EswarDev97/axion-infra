#!/bin/bash
# AICodePath Environment Validation Script
#
# Delegates to the canonical pre-flight-check.js so there is one source of truth.
# The JS module performs all checks: plugins, MCP servers, DB, CI lints, CLAUDE.md.
#
# Usage: bash .aicodepath/scripts/validate-environment.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK="$SCRIPT_DIR/../hooks/pre-flight-check.js"

if [ ! -f "$HOOK" ]; then
  echo "ERROR: pre-flight-check.js not found at $HOOK" >&2
  exit 1
fi

exec node "$HOOK" "$@"
