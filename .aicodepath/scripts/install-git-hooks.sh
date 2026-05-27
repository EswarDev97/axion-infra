#!/bin/bash
# Install Git Hooks for Structure Validation
# Run this after cloning the repository to set up protection

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "📦 Installing Git hooks for structure validation..."
echo ""

# Resolve the real git directory (handles both normal repos and git worktrees).
# In a worktree, .git is a file; git-common-dir points to the main repo's .git/
GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null || echo ".git")"
HOOKS_DIR="$GIT_COMMON_DIR/hooks"

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Install pre-commit dispatcher hook
# Calls each sub-check in sequence; stops on first failure.
cat > "$HOOKS_DIR/pre-commit" << 'EOFHOOK'
#!/bin/bash
# Pre-commit dispatcher — runs all AICodePath pre-commit checks in order.
# Add new checks by appending calls below. Each script must exit non-zero to block.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

run_check() {
  local script="$1"
  local label="$2"
  if [ -f "$REPO_ROOT/$script" ]; then
    bash "$REPO_ROOT/$script"
  else
    echo "⚠️  $label script not found, skipping: $script"
  fi
}

# 1. Directory structure validation
run_check ".aicodepath/scripts/validate-structure.sh" "Structure validation"

# 2. Agent wiring check (staged agent files only)
run_check ".aicodepath/scripts/pre-commit-agent-check.sh" "Agent wiring check"

# 3. Rendered-doc safeguard (blocks staging rendered .md without its .tpl)
run_check ".aicodepath/scripts/pre-commit-rendered-doc-check.sh" "Rendered-doc safeguard"
EOFHOOK

chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Pre-commit hook installed at $HOOKS_DIR/pre-commit"
echo ""
echo "This hook will:"
echo "  - Check for duplicate directories at root (validate-structure.sh)"
echo "  - Verify agent wiring for any staged .aicodepath/agents/*.md files"
echo "  - Block staging rendered .md docs without their .tpl source"
echo ""
echo "To test the checks individually:"
echo "  bash .aicodepath/scripts/validate-structure.sh"
echo "  bash .aicodepath/scripts/pre-commit-agent-check.sh"
echo "  bash .aicodepath/scripts/pre-commit-rendered-doc-check.sh"
echo ""
echo "✅ Installation complete!"
