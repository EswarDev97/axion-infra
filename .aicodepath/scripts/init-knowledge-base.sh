#!/bin/bash

# AICodePath Knowledge Base Initialization Script
# Initializes SQLite database and optionally imports existing documentation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect if we're in v2 (.aicodepath/scripts) or v1 (scripts) structure
if [[ "$SCRIPT_DIR" == *".aicodepath/scripts"* ]]; then
    # V2 structure: .aicodepath/scripts
    AICODEPATH_ROOT="$(dirname "$SCRIPT_DIR")"
    PROJECT_ROOT="$(dirname "$AICODEPATH_ROOT")"
else
    # V1 structure: scripts in project root
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    AICODEPATH_ROOT="$PROJECT_ROOT"
fi

DB_DIR="$PROJECT_ROOT/aicodepath-docs"
DB_PATH="$DB_DIR/aicodepath.db"
SCHEMA_PATH="$AICODEPATH_ROOT/db/schema.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AICodePath Knowledge Base Init        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo

# Check for sqlite3
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${RED}Error: sqlite3 is not installed.${NC}"
    echo "Please install sqlite3:"
    echo "  Ubuntu/Debian: sudo apt-get install sqlite3"
    echo "  macOS: brew install sqlite3"
    echo "  Windows: Download from https://www.sqlite.org/download.html"
    exit 1
fi

# Check sqlite3 version for FTS5 support
SQLITE_VERSION=$(sqlite3 --version | awk '{print $1}')
echo -e "${GREEN}✓ SQLite version: $SQLITE_VERSION${NC}"

# Create aicodepath-docs directory if needed
if [ ! -d "$DB_DIR" ]; then
    echo -e "${YELLOW}Creating $DB_DIR directory...${NC}"
    mkdir -p "$DB_DIR"
fi

# Backup existing database if it exists
if [ -f "$DB_PATH" ]; then
    BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d%H%M%S)"
    echo -e "${YELLOW}Backing up existing database to $BACKUP_PATH${NC}"
    cp "$DB_PATH" "$BACKUP_PATH"
fi

# Initialize database with schema
echo -e "${BLUE}Initializing database...${NC}"

if [ -f "$SCHEMA_PATH" ]; then
    SCHEMA_ERRORS="${TMPDIR:-/tmp}/aicodepath_schema_errors.txt"
    if ! sqlite3 "$DB_PATH" < "$SCHEMA_PATH" 2>"$SCHEMA_ERRORS"; then
        echo -e "${RED}Error applying schema:${NC}"
        cat "$SCHEMA_ERRORS"
        rm -f "$SCHEMA_ERRORS"
        exit 1
    fi
    rm -f "$SCHEMA_ERRORS"

    # Verify critical tables exist
    CRITICAL_TABLES="artifacts visual_diagrams diagram_entity_links diagram_history gicl_sessions gicl_iterations workflow_state"
    for table in $CRITICAL_TABLES; do
        if ! sqlite3 "$DB_PATH" "SELECT 1 FROM $table LIMIT 0;" 2>/dev/null; then
            echo -e "${RED}Error: Critical table '$table' was not created${NC}"
            exit 1
        fi
    done

    echo -e "${GREEN}✓ Schema applied successfully${NC}"
else
    echo -e "${RED}Error: Schema file not found at $SCHEMA_PATH${NC}"
    exit 1
fi

# Apply migrations (for triggers and constraints not yet in schema.sql)
MIGRATIONS_DIR="$AICODEPATH_ROOT/db/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
    echo -e "${BLUE}Applying migrations...${NC}"
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            migration_name=$(basename "$migration")
            if ! sqlite3 "$DB_PATH" < "$migration" 2>/dev/null; then
                echo -e "${YELLOW}⚠ Migration $migration_name had warnings (may already be applied)${NC}"
            fi
        fi
    done
    echo -e "${GREEN}✓ Migrations applied${NC}"
fi

# Verify FTS5 is working
echo -e "${BLUE}Verifying FTS5 support...${NC}"
FTS5_CHECK=$(sqlite3 "$DB_PATH" "SELECT * FROM pragma_compile_options WHERE compile_options LIKE '%FTS5%';" 2>/dev/null || echo "")
if [ -n "$FTS5_CHECK" ]; then
    echo -e "${GREEN}✓ FTS5 full-text search enabled${NC}"
else
    echo -e "${YELLOW}⚠ FTS5 may not be available. Full-text search might be limited.${NC}"
fi

# Verify WAL mode
WAL_MODE=$(sqlite3 "$DB_PATH" "PRAGMA journal_mode;")
echo -e "${GREEN}✓ Journal mode: $WAL_MODE${NC}"

# Import existing documentation if present
echo
echo -e "${BLUE}Checking for existing documentation to import...${NC}"

import_markdown_files() {
    local dir=$1
    local phase=$2
    local stage=$3
    local count=0

    if [ -d "$dir" ]; then
        for file in "$dir"/*.md; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                title="${filename%.md}"

                # Read file content
                content=$(cat "$file" | sed "s/'/''/g")

                # Insert into database
                sqlite3 "$DB_PATH" "
                    INSERT OR REPLACE INTO artifacts (artifact_type, phase, stage, title, content, file_path, metadata)
                    VALUES ('document', '$phase', '$stage', '$title', '$content', '$file', '{}');
                "
                count=$((count + 1))
            fi
        done
        if [ $count -gt 0 ]; then
            echo -e "${GREEN}  ✓ Imported $count files from $dir${NC}"
        fi
    fi
}

# Import inception documents
import_markdown_files "$PROJECT_ROOT/aicodepath-docs/inception/requirements" "inception" "requirements-analysis"
import_markdown_files "$PROJECT_ROOT/aicodepath-docs/inception/user-stories" "inception" "user-stories"
import_markdown_files "$PROJECT_ROOT/aicodepath-docs/inception/reverse-engineering" "inception" "reverse-engineering"
import_markdown_files "$PROJECT_ROOT/aicodepath-docs/inception/plans" "inception" "workflow-planning"

# Import construction documents
if [ -d "$PROJECT_ROOT/aicodepath-docs/construction" ]; then
    for unit_dir in $PROJECT_ROOT/aicodepath-docs/construction/*/; do
        if [ -d "$unit_dir" ]; then
            unit_name=$(basename "$unit_dir")
            import_markdown_files "${unit_dir}functional-design" "construction" "functional-design"
            import_markdown_files "${unit_dir}database-design" "construction" "database-design"
            import_markdown_files "${unit_dir}code" "construction" "code-generation"
        fi
    done
fi

# Show database statistics
echo
echo -e "${BLUE}Database Statistics:${NC}"
echo -e "───────────────────────"

ARTIFACT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM artifacts;")
DECISION_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM decisions;")
LINK_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM links;")

echo -e "  Artifacts:  ${GREEN}$ARTIFACT_COUNT${NC}"
echo -e "  Decisions:  ${GREEN}$DECISION_COUNT${NC}"
echo -e "  Links:      ${GREEN}$LINK_COUNT${NC}"

# Show artifacts by type
echo
echo -e "${BLUE}Artifacts by Type:${NC}"
sqlite3 -column -header "$DB_PATH" "
    SELECT artifact_type as Type, COUNT(*) as Count
    FROM artifacts
    GROUP BY artifact_type
    ORDER BY Count DESC;
" 2>/dev/null || echo "  (none yet)"

# Show artifacts by phase
echo
echo -e "${BLUE}Artifacts by Phase:${NC}"
sqlite3 -column -header "$DB_PATH" "
    SELECT phase as Phase, COUNT(*) as Count
    FROM artifacts
    GROUP BY phase
    ORDER BY Count DESC;
" 2>/dev/null || echo "  (none yet)"

# Initialize Dashboard
echo
echo -e "${YELLOW}Initialize dashboard?${NC}"
echo "This will set up the AICodePath dashboard in aicodepath-docs/dashboard/"
read -p "Initialize dashboard now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bash "$SCRIPT_DIR/init-dashboard.sh"
else
    echo -e "${YELLOW}Skipped. Run later with:${NC}"
    echo "  .aicodepath/scripts/init-dashboard.sh"
fi

echo
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Knowledge Base Ready!                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo
echo -e "Database location: ${BLUE}$DB_PATH${NC}"
echo
echo -e "Example queries:"
echo -e "  ${YELLOW}# Search for authentication-related content${NC}"
echo -e "  sqlite3 $DB_PATH \"SELECT title FROM artifacts_fts WHERE artifacts_fts MATCH 'authentication';\""
echo
echo -e "  ${YELLOW}# Get recent decisions${NC}"
echo -e "  sqlite3 $DB_PATH \"SELECT title, decision FROM decisions ORDER BY decided_at DESC LIMIT 5;\""
echo
echo -e "  ${YELLOW}# View workflow progress${NC}"
echo -e "  sqlite3 $DB_PATH \"SELECT * FROM v_workflow_progress;\""
echo
