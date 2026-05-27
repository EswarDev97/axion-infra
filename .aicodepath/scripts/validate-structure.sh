#!/bin/bash
# Structure Validation Script
# Ensures no duplicate directories exist at root level
# Run this in CI/CD and as pre-commit hook

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "🔍 Validating AICodePath v2.1 directory structure..."
echo ""

# Track validation results
VALIDATION_FAILED=0

# Function to report error
report_error() {
  echo "❌ $1"
  VALIDATION_FAILED=1
}

# Function to report success
report_success() {
  echo "✅ $1"
}

# 1. Check for duplicate directories at root
# A root-level directory is a "duplicate" only if it contains AICodePath-specific files
# (e.g. validate-structure.sh, hooks.json). Project-owned dirs with the same name are fine.
echo "1. Checking for duplicate directories at root level..."
AICODEPATH_MARKER_FILES="validate-structure.sh init-knowledge-base.sh hooks.json SKILL.md agent.md"
DUPLICATE_DIRS=""
for dir in agents hooks scripts skills templates; do
  if [ -d "$dir" ]; then
    for marker in $AICODEPATH_MARKER_FILES; do
      if find "$dir" -name "$marker" -maxdepth 3 -quit 2>/dev/null | grep -q .; then
        DUPLICATE_DIRS="$DUPLICATE_DIRS $dir"
        break
      fi
    done
  fi
done

if [ -n "$DUPLICATE_DIRS" ]; then
  report_error "AICodePath directories found at root level (should be inside .aicodepath/):"
  for dir in $DUPLICATE_DIRS; do echo "  $dir/"; done
  echo ""
  echo "These directories should NOT exist at root level in v2.1+"
  echo "All tool implementation must be in .aicodepath/"
else
  report_success "No duplicate directories at root level"
fi

# 2. Check for legacy config files at root
echo ""
echo "2. Checking for legacy configuration files..."
if [ -f "hooks.json" ]; then
  report_error "Legacy hooks.json found at root (should be .claude/hooks.json)"
fi
if [ -f "skills.json" ]; then
  report_error "Legacy skills.json found at root (should be .claude/skills.json)"
fi
if [ ! -f "hooks.json" ] && [ ! -f "skills.json" ]; then
  report_success "No legacy config files at root"
fi

# 3. Verify .aicodepath structure exists
echo ""
echo "3. Checking .aicodepath/ structure..."
REQUIRED_DIRS=(
  ".aicodepath"
  ".aicodepath/hooks"
  ".aicodepath/skills"
  ".aicodepath/lib"
  ".aicodepath/scripts"
  ".aicodepath/guidelines"
  ".aicodepath/rules"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    report_error "Required directory missing: $dir"
  fi
done

if [ -d ".aicodepath" ] && [ -d ".aicodepath/hooks" ] && [ -d ".aicodepath/skills" ]; then
  report_success "Core .aicodepath/ structure exists"
fi

# 4. Check for hardcoded paths in new/modified files
echo ""
echo "4. Checking for hardcoded paths in recent changes..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  # Check staged files for hardcoded paths
  STAGED_FILES=$(git diff --cached --name-only --diff-filter=AM | grep -E '\.(js|ts)$' || true)

  if [ -n "$STAGED_FILES" ]; then
    # Detect literal hardcoded path.resolve('aicodepath...')
    HARDCODED_RESOLVE=$(echo "$STAGED_FILES" | xargs grep -l "path\.resolve('aicodepath" 2>/dev/null || true)
    # Detect bare process.cwd() — exclude valid usages wrapped in findProjectRoot/findAicodepathRoot
    HARDCODED_CWD=$(echo "$STAGED_FILES" | xargs grep -l "process\.cwd()" 2>/dev/null | while IFS= read -r f; do
      if grep "process\.cwd()" "$f" | grep -qv "findProjectRoot\|findAicodepathRoot"; then
        echo "$f"
      fi
    done || true)
    HARDCODED_PATHS=$(printf "%s\n%s" "$HARDCODED_RESOLVE" "$HARDCODED_CWD" | sort -u | grep -v "^$" || true)

    if [ -n "$HARDCODED_PATHS" ]; then
      report_error "Hardcoded paths found in staged files:"
      echo "$HARDCODED_PATHS"
      echo ""
      echo "Use path-resolver.js instead:"
      echo "  const pathResolver = require('./path-resolver');"
      echo "  const projectRoot = pathResolver.findProjectRoot();"
    else
      report_success "No hardcoded paths in staged files"
    fi
  else
    report_success "No staged JavaScript/TypeScript files to check"
  fi
else
  echo "⚠️  Not a git repository, skipping staged files check"
fi

# 5. Verify .claude/ configs point to .aicodepath/
echo ""
echo "5. Checking .claude/ configuration..."
if [ -f ".claude/settings.json" ]; then
  AICODEPATH_REFS=$(grep -c ".aicodepath/" .claude/settings.json || echo "0")
  if [ "$AICODEPATH_REFS" -gt 0 ]; then
    report_success ".claude/settings.json references .aicodepath/ ($AICODEPATH_REFS times)"
  else
    report_error ".claude/settings.json does not reference .aicodepath/"
  fi
else
  echo "⚠️  .claude/settings.json not found — run: node .aicodepath/bin/aicodepath.js init"
fi

if [ -d ".claude/skills" ]; then
  SKILL_COUNT=$(ls .claude/skills/ 2>/dev/null | wc -l)
  if [ "$SKILL_COUNT" -gt 0 ]; then
    report_success ".claude/skills/ exists with $SKILL_COUNT entries"
  else
    echo "⚠️  .claude/skills/ is empty — run: node .aicodepath/bin/aicodepath.js init"
  fi
else
  echo "⚠️  .claude/skills/ not found — run: node .aicodepath/bin/aicodepath.js init"
fi

# 6. Check for .lsp.json in correct location
echo ""
echo "6. Checking .lsp.json location..."
if [ -f ".lsp.json" ]; then
  report_error ".lsp.json found at root (should be in .aicodepath/.lsp.json)"
elif [ -f ".aicodepath/.lsp.json" ]; then
  report_success ".lsp.json in correct location (.aicodepath/.lsp.json)"
else
  echo "⚠️  .lsp.json not found (may be intentional)"
fi

# Final summary
echo ""
echo "=================================================="
if [ $VALIDATION_FAILED -eq 0 ]; then
  echo "✅ Structure validation PASSED"
  echo "=================================================="
  exit 0
else
  echo "❌ Structure validation FAILED"
  echo "=================================================="
  echo ""
  echo "Fix the issues above before committing."
  exit 1
fi
