#!/bin/bash
# Cleanup script for removing experimental code and Python cache
# Part of P1.2 - Remove experimental code and Python cache

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AICODEPATH_DIR="$(dirname "$SCRIPT_DIR")"

echo "🧹 Cleaning up experimental code and Python cache..."
echo ""

# Remove experimental hooks directory
if [ -d "$AICODEPATH_DIR/hooks/experimental" ]; then
  echo "Removing experimental hooks..."
  rm -rf "$AICODEPATH_DIR/hooks/experimental"
  echo "✅ Removed: hooks/experimental/"
else
  echo "⏭️  Experimental hooks already removed"
fi

# Remove Python cache directories
echo ""
echo "Removing Python cache directories..."
find "$AICODEPATH_DIR/generators" -type d -name "__pycache__" -print -exec rm -rf {} + 2>/dev/null || true
echo "✅ Removed: __pycache__ directories"

# Remove compiled Python files
echo ""
echo "Removing compiled Python files..."
find "$AICODEPATH_DIR/generators" -type f \( -name "*.pyc" -o -name "*.pyo" -o -name "*.pyd" \) -print -delete 2>/dev/null || true
echo "✅ Removed: *.pyc, *.pyo, *.pyd files"

echo ""
echo "✨ Cleanup complete!"
echo ""
echo "Removed:"
echo "  - Experimental hooks directory"
echo "  - All __pycache__ directories"
echo "  - All compiled Python files (.pyc, .pyo, .pyd)"
echo ""
