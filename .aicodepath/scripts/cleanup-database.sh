#!/bin/bash
# ============================================================================
# AICodePath Database Cleanup Script
# ============================================================================
# Purpose: Remove workflow duplicates and sync phase to CONSTRUCTION
# Usage: ./cleanup-database.sh <path-to-database>
# Example: ./cleanup-database.sh ~/workspace/aicodepath-team/aicodepath-docs/aicodepath.db
# ============================================================================

set -e

DB_PATH="$1"

# ============================================================================
# Validation
# ============================================================================

if [ -z "$DB_PATH" ]; then
  echo "Error: Database path required"
  echo "Usage: $0 <path-to-database>"
  echo "Example: $0 ~/workspace/aicodepath-team/aicodepath-docs/aicodepath.db"
  exit 1
fi

if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database file not found: $DB_PATH"
  exit 1
fi

# ============================================================================
# Banner
# ============================================================================

echo "========================================="
echo "  AICodePath Database Cleanup Script"
echo "========================================="
echo "Database: $DB_PATH"
echo "Date: $(date)"
echo ""

# ============================================================================
# Step 1: Backup
# ============================================================================

BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$DB_PATH" "$BACKUP_PATH"
echo "✓ Backup created: $BACKUP_PATH"
echo ""

# ============================================================================
# Step 2: Analyze Duplicates
# ============================================================================

echo "=== Duplicate Analysis ==="
DUPLICATES=$(sqlite3 "$DB_PATH" "
SELECT
    phase,
    stage,
    cr_number,
    COUNT(*) as count
FROM workflow_state
GROUP BY phase, stage, COALESCE(cr_number, 'N/A')
HAVING COUNT(*) > 1;
")

if [ -z "$DUPLICATES" ]; then
  echo "✓ No duplicates found"
else
  echo "Duplicates detected:"
  echo "$DUPLICATES"
fi
echo ""

# ============================================================================
# Step 3: Clean Duplicates
# ============================================================================

echo "=== Cleaning Duplicates ==="
DELETED=$(sqlite3 "$DB_PATH" "
DELETE FROM workflow_state
WHERE id NOT IN (
  SELECT MIN(id)
  FROM workflow_state
  GROUP BY phase, stage, COALESCE(cr_number, 'N/A')
);
SELECT changes();
")
echo "✓ Deleted $DELETED duplicate rows"
echo ""

# ============================================================================
# Step 4: Sync Phase to CONSTRUCTION
# ============================================================================

echo "=== Syncing Phase to CONSTRUCTION ==="
UPDATED=$(sqlite3 "$DB_PATH" "
UPDATE workflow_state SET phase = 'construction' WHERE phase = 'inception';
SELECT changes();
")
echo "✓ Updated $UPDATED workflow_state rows to CONSTRUCTION phase"

# Update session_state if exists
sqlite3 "$DB_PATH" "
INSERT OR REPLACE INTO session_state (key, value)
VALUES ('current_phase', '\"construction\"');
" 2>/dev/null || true
echo "✓ Session state updated to CONSTRUCTION"
echo ""

# ============================================================================
# Step 5: Verification
# ============================================================================

echo "=== Verification ==="
sqlite3 "$DB_PATH" "
SELECT 'Total workflows:' as metric, COUNT(*) as value FROM workflow_state
UNION ALL
SELECT 'Unique phases:', COUNT(DISTINCT phase) FROM workflow_state
UNION ALL
SELECT 'Unique stages:', COUNT(DISTINCT stage) FROM workflow_state
UNION ALL
SELECT 'CONSTRUCTION rows:', COUNT(*) FROM workflow_state WHERE phase = 'construction'
UNION ALL
SELECT 'INCEPTION rows:', COUNT(*) FROM workflow_state WHERE phase = 'inception';
"
echo ""

# Check for remaining duplicates
REMAINING=$(sqlite3 "$DB_PATH" "
SELECT COUNT(*) FROM (
  SELECT phase, stage, cr_number, COUNT(*) as count
  FROM workflow_state
  GROUP BY phase, stage, COALESCE(cr_number, 'N/A')
  HAVING COUNT(*) > 1
);
")

if [ "$REMAINING" -eq 0 ]; then
  echo "✅ Cleanup complete - no duplicates remaining"
else
  echo "⚠️  Warning: $REMAINING duplicate groups still exist"
fi
echo ""

# ============================================================================
# Step 6: Summary
# ============================================================================

echo "========================================="
echo "  Cleanup Summary"
echo "========================================="
echo "Backup location: $BACKUP_PATH"
echo "Duplicates removed: $DELETED"
echo "Phase updates: $UPDATED"
echo "Status: $([ "$REMAINING" -eq 0 ] && echo 'SUCCESS' || echo 'PARTIAL')"
echo ""
echo "Next steps:"
echo "1. Verify data: sqlite3 $DB_PATH 'SELECT * FROM workflow_state LIMIT 10;'"
echo "2. Test dashboard: Open http://localhost:3899/monitor"
echo "3. If issues: Restore backup: cp $BACKUP_PATH $DB_PATH"
echo "========================================="
