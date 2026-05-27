#!/bin/bash
# =============================================================================
# AICodePath Statusline Script (Bash)
#
# Two-line display showing identity + git on line 1, metrics on line 2.
# Requires: jq (for JSON parsing)
#
# Line 1: [Model] 📁 dir | 🌿 branch [+staged ~modified]  [worktree]  [agent]
# Line 2: ████████░░ 45% | $0.0042 | ⏱ 8m 23s (API: 45s) | +156 -23
# =============================================================================

# ANSI Color Codes
RESET="\033[0m"
BOLD="\033[1m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
PURPLE="\033[35m"
BLUE="\033[34m"
DIM="\033[2m"

# Read JSON from stdin
INPUT=$(cat)

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "[statusline: jq not found — install jq]"
    exit 0
fi

# ---------------------------------------------------------------------------
# Provider-aware field extraction
# ---------------------------------------------------------------------------
PROVIDER_DATA=""
if command -v node > /dev/null 2>&1; then
  EXTRACTOR=""
  [ -f "$HOME/.aicodepath/scripts/provider-data-extractor.js" ] && \
    EXTRACTOR="$HOME/.aicodepath/scripts/provider-data-extractor.js"
  [ -z "$EXTRACTOR" ] && [ -f "$(dirname "$0")/provider-data-extractor.js" ] && \
    EXTRACTOR="$(dirname "$0")/provider-data-extractor.js"
  [ -z "$EXTRACTOR" ] && [ -f ".aicodepath/scripts/provider-data-extractor.js" ] && \
    EXTRACTOR=".aicodepath/scripts/provider-data-extractor.js"
  if [ -n "$EXTRACTOR" ]; then
    _RAW=$(echo "$INPUT" | node "$EXTRACTOR" 2>/dev/null)
    # The extractor may emit logger lines before the JSON — take only the last line
    PROVIDER_DATA=$(printf '%s' "$_RAW" | tail -n 1)
    # Validate it is actually JSON (starts with '{')
    case "$PROVIDER_DATA" in
      '{'*) ;;
      *) PROVIDER_DATA="" ;;
    esac
  fi
fi

# ---------------------------------------------------------------------------
# Parse fields
# ---------------------------------------------------------------------------
PROJECT_DIR=$(echo "$INPUT" | jq -r '.workspace.project_dir // .cwd // "unknown"')
DIR_NAME=$(basename "$PROJECT_DIR")

# Optional contextual fields (absent when not applicable)
AGENT=$(echo "$INPUT" | jq -r '.agent.name // empty')
WORKTREE=$(echo "$INPUT" | jq -r '.worktree.name // empty')
SESSION=$(echo "$INPUT" | jq -r '.session_name // empty')
EXCEEDS=$(echo "$INPUT" | jq -r '.exceeds_200k_tokens // false')

# Cost and duration (always from raw input — extractor does not expose these for z.ai)
COST=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // 0')
DURATION_MS=$(echo "$INPUT" | jq -r '.cost.total_duration_ms // 0')
API_MS=$(echo "$INPUT" | jq -r '.cost.total_api_duration_ms // 0')
LINES_ADD=$(echo "$INPUT" | jq -r '.cost.total_lines_added // 0')
LINES_DEL=$(echo "$INPUT" | jq -r '.cost.total_lines_removed // 0')

if [ -n "$PROVIDER_DATA" ]; then
  # Provider-aware path: use normalized fields from extractor
  MODEL=$(echo "$PROVIDER_DATA" | jq -r '.model_display // "Unknown"')
  MODEL_SHORT=$(echo "$PROVIDER_DATA" | jq -r '.model_display_short // "Unknown"')
  PERCENT=$(echo "$PROVIDER_DATA" | jq -r '.context_percent // 0' | cut -d. -f1)
  PERCENT=${PERCENT:-0}
  RATE_5H=$(echo "$PROVIDER_DATA" | jq -r 'if .rate_limits.five_hour == null then "" else (.rate_limits.five_hour | tostring) end')
  RATE_7D=$(echo "$PROVIDER_DATA" | jq -r 'if .rate_limits.seven_day == null then "" else (.rate_limits.seven_day | tostring) end')
  COST_USD=$(echo "$PROVIDER_DATA" | jq -r 'if .cost_usd == null then "" else (.cost_usd | tostring) end')
  # Override COST display if extractor has cost data
  [ -n "$COST_USD" ] && COST="$COST_USD"
else
  # Anthropic fallback: existing parsing unchanged
  MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "Unknown"')
  MODEL_SHORT=$(echo "$MODEL" | sed 's/^Claude //')

  # Context usage — prefer raw token sum (input + cache_create + cache_read) for accuracy.
  # used_percentage counts input tokens only and underestimates total context when caching is active.
  RAW_TOTAL=$(echo "$INPUT" | jq -r '
    ((.context_window.current_usage.input_tokens // 0) +
     (.context_window.current_usage.cache_creation_input_tokens // 0) +
     (.context_window.current_usage.cache_read_input_tokens // 0))
  ')
  CTX_SIZE=$(echo "$INPUT" | jq -r '.context_window.context_window_size // 0')
  USED_PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)

  if [ "${RAW_TOTAL:-0}" -gt 0 ] && [ "${CTX_SIZE:-0}" -gt 0 ]; then
    PERCENT=$((RAW_TOTAL * 100 / CTX_SIZE))
    # Never show less than used_percentage (take the higher of the two)
    [ "${USED_PCT:-0}" -gt "$PERCENT" ] && PERCENT=$USED_PCT
  else
    PERCENT=${USED_PCT:-0}
  fi
  PERCENT=${PERCENT:-0}

  # Rate limits (Pro/Max subscribers only — field absent for API key users)
  RATE_5H=$(echo "$INPUT" | jq -r '.rate_limits.five_hour.used_percentage // empty')
  RATE_7D=$(echo "$INPUT" | jq -r '.rate_limits.seven_day.used_percentage // empty')
fi

# ---------------------------------------------------------------------------
# Line 1: Identity — model, directory, git, worktree, agent
# ---------------------------------------------------------------------------

# Git branch + staged/modified (cached to avoid lag on large repos)
CACHE_FILE="/tmp/aicodepath-statusline-git-cache"
NOW=$(date +%s)
CACHE_AGE=0
if [ -f "$CACHE_FILE" ]; then
    CACHE_MTIME=$(stat -c %Y "$CACHE_FILE" 2>/dev/null || stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0)
    CACHE_AGE=$(( NOW - CACHE_MTIME ))
fi

if [ "$CACHE_AGE" -gt 5 ] || [ ! -f "$CACHE_FILE" ]; then
    if git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo "")
        GIT_STAGED=$(git diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
        GIT_MODIFIED=$(git diff --numstat 2>/dev/null | wc -l | tr -d ' ')
        GIT_UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
        echo "${GIT_BRANCH}|${GIT_STAGED}|${GIT_MODIFIED}|${GIT_UNTRACKED}" > "$CACHE_FILE"
    else
        echo "|||" > "$CACHE_FILE"
    fi
fi
IFS='|' read -r GIT_BRANCH GIT_STAGED GIT_MODIFIED GIT_UNTRACKED < "$CACHE_FILE"

LINE1="${CYAN}[${MODEL_SHORT}]${RESET} 📁 ${DIR_NAME}"

if [ -n "$GIT_BRANCH" ]; then
    # Append * if any uncommitted changes (staged, modified, or untracked)
    DIRTY=""
    if [ "${GIT_STAGED:-0}" -gt 0 ] 2>/dev/null || \
       [ "${GIT_MODIFIED:-0}" -gt 0 ] 2>/dev/null || \
       [ "${GIT_UNTRACKED:-0}" -gt 0 ] 2>/dev/null; then
        DIRTY="${YELLOW}*${RESET}"
    fi
    LINE1="${LINE1} | 🌿 ${PURPLE}${GIT_BRANCH}${RESET}${DIRTY}"
    [ "${GIT_STAGED:-0}" -gt 0 ] 2>/dev/null && LINE1="${LINE1} ${GREEN}+${GIT_STAGED}${RESET}"
    [ "${GIT_MODIFIED:-0}" -gt 0 ] 2>/dev/null && LINE1="${LINE1} ${YELLOW}~${GIT_MODIFIED}${RESET}"
    [ "${GIT_UNTRACKED:-0}" -gt 0 ] 2>/dev/null && LINE1="${LINE1} ${DIM}?${GIT_UNTRACKED}${RESET}"
fi

[ -n "$WORKTREE" ] && LINE1="${LINE1} | 🔀 ${BLUE}${WORKTREE}${RESET}"
[ -n "$AGENT" ]    && LINE1="${LINE1} | 🤖 ${CYAN}${AGENT}${RESET}"
[ -n "$SESSION" ]  && LINE1="${LINE1} | 📌 ${DIM}${SESSION}${RESET}"

# ---------------------------------------------------------------------------
# Line 2: Metrics — context bar, cost, duration, lines changed
# ---------------------------------------------------------------------------

# Context bar: color-coded (green <60%, yellow 60-79%, red ≥80%)
# Red at 80% because auto-compact triggers around that threshold.
if [ "$PERCENT" -ge 80 ]; then BAR_COLOR="$RED"
elif [ "$PERCENT" -ge 60 ]; then BAR_COLOR="$YELLOW"
else BAR_COLOR="$GREEN"; fi

FILLED=$((PERCENT / 10))
EMPTY=$((10 - FILLED))
BAR=""
for ((i=0; i<FILLED; i++)); do BAR+="█"; done
for ((i=0; i<EMPTY; i++)); do BAR+="░"; done

# Context overflow warning
CTX_WARN=""
[ "$EXCEEDS" = "true" ] && CTX_WARN=" ${RED}⚠ >200k${RESET}"

# Cost formatted to 4 decimal places (session costs are small)
COST_FMT=$(printf '$%.4f' "$COST")

# Wall-clock duration
WALL_MINS=$((DURATION_MS / 60000))
WALL_SECS=$(( (DURATION_MS % 60000) / 1000 ))

# API wait time (seconds)
API_SECS=$((API_MS / 1000))

LINE2="${BAR_COLOR}${BAR}${RESET} ${PERCENT}%${CTX_WARN}"
LINE2="${LINE2} | ${YELLOW}${COST_FMT}${RESET}"
LINE2="${LINE2} | ⏱ ${WALL_MINS}m ${WALL_SECS}s"
# Show API wait only if meaningful (>1s)
[ "$API_SECS" -gt 1 ] && LINE2="${LINE2} (API: ${API_SECS}s)"
# Show lines changed only if non-zero
if [ "${LINES_ADD:-0}" -gt 0 ] 2>/dev/null || [ "${LINES_DEL:-0}" -gt 0 ] 2>/dev/null; then
    LINE2="${LINE2} | ${GREEN}+${LINES_ADD}${RESET} ${RED}-${LINES_DEL}${RESET}"
fi

# Rate limits — only rendered when present (Pro/Max subscribers)
if [ -n "$RATE_5H" ]; then
    R5=$(printf '%.0f' "$RATE_5H")
    # Color: green <70%, yellow 70-89%, red ≥90%
    if [ "$R5" -ge 90 ]; then RC="$RED"
    elif [ "$R5" -ge 70 ]; then RC="$YELLOW"
    else RC="$GREEN"; fi
    RATE_DISPLAY="${RC}5h:${R5}%${RESET}"
    if [ -n "$RATE_7D" ]; then
        R7=$(printf '%.0f' "$RATE_7D")
        RATE_DISPLAY="${RATE_DISPLAY} ${DIM}7d:${R7}%${RESET}"
    fi
    LINE2="${LINE2} | 🔥 ${RATE_DISPLAY}"
fi

# ---------------------------------------------------------------------------
# Get AICodePath workflow phase (if KB exists)
# ---------------------------------------------------------------------------
KB_QUERY_SCRIPT=""
if [ -f "$PROJECT_DIR/.aicodepath/scripts/statusline-kb-query.js" ]; then
    KB_QUERY_SCRIPT="$PROJECT_DIR/.aicodepath/scripts/statusline-kb-query.js"
elif [ -f "$HOME/.aicodepath/statusline-kb-query.js" ]; then
    KB_QUERY_SCRIPT="$HOME/.aicodepath/statusline-kb-query.js"
fi

if [ -n "$KB_QUERY_SCRIPT" ] && command -v node &> /dev/null; then
    KB_DATA=$(node "$KB_QUERY_SCRIPT" "$PROJECT_DIR" 2>/dev/null)
    if [ -n "$KB_DATA" ]; then
        AICODEPATH_PHASE=$(echo "$KB_DATA" | jq -r '.phase // ""')
        AICODEPATH_UNIT=$(echo "$KB_DATA" | jq -r '.unit // ""')
        if [ -n "$AICODEPATH_PHASE" ]; then
            case "$AICODEPATH_PHASE" in
                "CONSTRUCTION") PHASE_COLOR="$BLUE" ;;
                "INCEPTION")    PHASE_COLOR="$CYAN" ;;
                "OPERATIONS")   PHASE_COLOR="$GREEN" ;;
                *)              PHASE_COLOR="$DIM" ;;
            esac
            LINE1="${LINE1} | ${PHASE_COLOR}${AICODEPATH_PHASE}${RESET}"
            [ -n "$AICODEPATH_UNIT" ] && LINE1="${LINE1}:${AICODEPATH_UNIT}"
        fi
    fi
fi

# ---------------------------------------------------------------------------
# Output — printf '%b' interprets ANSI escape codes reliably
# ---------------------------------------------------------------------------
printf '%b\n' "$LINE1"
printf '%b\n' "$LINE2"
