#!/bin/bash
# Pre-commit: Rendered-doc safeguard (G5)
#
# Auto-unstages rendered .md files that are staged without their .tpl source.
# Direct edits to rendered docs are overwritten by the next 'acp init --render-docs' run,
# so they must always be made in the .tpl. This hook prevents accidental commits of
# orphaned rendered docs by automatically removing them from staging with a clear message.
#
# Rendered-doc pairs:
#   CLAUDE.md                                        ← CLAUDE.md.tpl
#   .aicodepath/CLAUDE.md                            ← .aicodepath/CLAUDE.md.tpl
#   .aicodepath/DEVELOPER-GUIDE.md                   ← .aicodepath/DEVELOPER-GUIDE.md.tpl
#   .aicodepath/skills/aicodepath-catalog/SKILL.md   ← .aicodepath/skills/aicodepath-catalog/SKILL.md.tpl

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Rendered → template pairs (project-relative paths)
declare -A RENDERED_TO_TPL=(
  ["CLAUDE.md"]="CLAUDE.md.tpl"
  [".aicodepath/CLAUDE.md"]=".aicodepath/CLAUDE.md.tpl"
  [".aicodepath/DEVELOPER-GUIDE.md"]=".aicodepath/DEVELOPER-GUIDE.md.tpl"
  [".aicodepath/skills/aicodepath-catalog/SKILL.md"]=".aicodepath/skills/aicodepath-catalog/SKILL.md.tpl"
)

# Collect all staged files
mapfile -t STAGED < <(git -C "$PROJECT_ROOT" diff --name-only --cached 2>/dev/null || true)

UNSTAGED_COUNT=0
RENDERED_FILES_TO_UNSTAGE=()

for rendered in "${!RENDERED_TO_TPL[@]}"; do
  tpl="${RENDERED_TO_TPL[$rendered]}"

  # Check if the rendered doc is staged
  staged_rendered=0
  staged_tpl=0
  for f in "${STAGED[@]}"; do
    [[ "$f" == "$rendered" ]] && staged_rendered=1
    [[ "$f" == "$tpl" ]]      && staged_tpl=1
  done

  # Skip entirely if the .tpl doesn't exist — this is a target project, not aicodepath-tool.
  # In target projects the rendered .md files are regular files, not generated artifacts.
  if [ ! -f "$PROJECT_ROOT/$tpl" ]; then
    continue
  fi

  # If rendered is staged without its .tpl source, mark for unstaging
  if [ $staged_rendered -eq 1 ] && [ $staged_tpl -eq 0 ]; then
    RENDERED_FILES_TO_UNSTAGE+=("$rendered")
    UNSTAGED_COUNT=$((UNSTAGED_COUNT + 1))
  fi
done

# Auto-unstage orphaned rendered docs
if [ $UNSTAGED_COUNT -gt 0 ]; then
  echo "⚠️  Auto-unstaging $UNSTAGED_COUNT rendered doc(s) without .tpl source:"
  for rendered in "${RENDERED_FILES_TO_UNSTAGE[@]}"; do
    echo "   Unstaging: $rendered"
    git -C "$PROJECT_ROOT" reset HEAD "$rendered" 2>/dev/null || true
  done
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "Rendered docs are auto-generated from .tpl sources."
  echo "To update them: edit the .tpl file, then run:"
  echo "  node .aicodepath/bin/aicodepath.js init --render-docs"
  echo "════════════════════════════════════════════════════════"
  echo ""
fi

exit 0
