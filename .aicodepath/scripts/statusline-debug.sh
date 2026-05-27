#!/bin/bash
# Debug wrapper for statusline

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${TMPDIR:-/tmp}/statusline-debug.log"

# Log that we were called
echo "$(date): Statusline called" >> "$LOG_FILE"

# Read and log input
INPUT=$(cat)
echo "Input: $INPUT" >> "$LOG_FILE"

# Call the real statusline script
echo "$INPUT" | "$SCRIPT_DIR/statusline.sh"
