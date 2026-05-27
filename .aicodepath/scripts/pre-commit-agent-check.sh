#!/bin/bash
# Pre-commit: Agent Wiring Check (F2)
#
# Runs 'acp agent audit all --check-wiring' against every staged agent file.
# If any staged agent is unwired, exits non-zero to block the commit.
#
# Falls back to auditing ALL agents when the staged-files list cannot be
# determined — this is safe but slower.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ACP_CLI="$PROJECT_ROOT/.aicodepath/bin/aicodepath.js"

# Verify CLI is present
if [ ! -f "$ACP_CLI" ]; then
  echo "⚠️  Agent wiring check: aicodepath CLI not found at $ACP_CLI — skipping"
  exit 0
fi

# Collect staged agent files
STAGED_AGENTS=()
while IFS= read -r line; do
  # git diff --name-only --cached outputs project-relative paths
  if [[ "$line" == .aicodepath/agents/*.md ]]; then
    # Extract bare agent name (strip dir prefix and .md suffix)
    agent_name="$(basename "$line" .md)"
    STAGED_AGENTS+=("$agent_name")
  fi
done < <(git -C "$PROJECT_ROOT" diff --name-only --cached 2>/dev/null || true)

if [ ${#STAGED_AGENTS[@]} -eq 0 ]; then
  # No agent files staged — nothing to check
  exit 0
fi

echo "🔍 Checking agent wiring for ${#STAGED_AGENTS[@]} staged agent(s)..."

FAILED=0
for agent_name in "${STAGED_AGENTS[@]}"; do
  if ! node "$ACP_CLI" agent audit "$agent_name" --check-wiring 2>/dev/null; then
    FAILED=$((FAILED + 1))
  fi
done

if [ $FAILED -gt 0 ]; then
  echo ""
  echo "=================================================="
  echo "❌ Pre-commit: $FAILED agent(s) failed wiring check"
  echo "=================================================="
  echo ""
  echo "Complete the missing wiring before committing:"
  echo "  - Add agent to DOMAIN_MAPPING in agent-suggester.js"
  echo "  - Add row to agent-taxonomy.md"
  echo "  - Ensure .claude/agents/<name>.md symlink exists (run acp init)"
  echo "  - Create docs/agents/<name>.md doc file"
  echo "  - Ensure plugin_pack frontmatter field is set"
  echo ""
  echo "To audit a specific agent:"
  echo "  node .aicodepath/bin/aicodepath.js agent audit <name> --check-wiring"
  echo ""
  echo "To bypass (NOT RECOMMENDED):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
fi

echo "✅ Agent wiring check passed"
exit 0
