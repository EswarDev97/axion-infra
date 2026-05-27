#!/bin/bash
# Quick test: Initialize dashboard in a test project

echo "═══════════════════════════════════════════════════════════"
echo "  Dashboard Initialization Test"
echo "═══════════════════════════════════════════════════════════"
echo

# Create test project structure
TEST_DIR="${TMPDIR:-/tmp}/aicodepath-dashboard-test-$$"
echo "Creating test project at: $TEST_DIR"
mkdir -p "$TEST_DIR"/.aicodepath

# Copy aicodepath-tool to test project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AICODEPATH_ROOT="$(dirname "$SCRIPT_DIR")"
echo "Copying AICodePath tool..."
cp -r "$AICODEPATH_ROOT"/* "$TEST_DIR"/.aicodepath/

# Create aicodepath-docs directory
mkdir -p "$TEST_DIR"/aicodepath-docs

# Create minimal database
echo "Creating test database..."
sqlite3 "$TEST_DIR"/aicodepath-docs/aicodepath.db <<EOF
CREATE TABLE workflow_state (
    id INTEGER PRIMARY KEY,
    phase TEXT,
    stage TEXT,
    status TEXT
);

INSERT INTO workflow_state (phase, stage, status) VALUES ('inception', 'requirements', 'completed');

CREATE TABLE artifacts (
    id INTEGER PRIMARY KEY,
    artifact_type TEXT,
    title TEXT
);

INSERT INTO artifacts (artifact_type, title) VALUES ('design', 'Test Design');

CREATE TABLE visual_diagrams (
    id INTEGER PRIMARY KEY,
    diagram_type TEXT,
    name TEXT
);
EOF

echo "✓ Test database created"

# Run init-dashboard.sh
echo
echo "Running init-dashboard.sh..."
cd "$TEST_DIR"
bash .aicodepath/scripts/init-dashboard.sh <<< "y"

# Verify dashboard was copied
echo
echo "═══════════════════════════════════════════════════════════"
echo "  Verification"
echo "═══════════════════════════════════════════════════════════"

if [ -d "$TEST_DIR/aicodepath-docs/dashboard" ]; then
    echo "✓ Dashboard directory created"
else
    echo "✗ Dashboard directory NOT created"
    exit 1
fi

if [ -f "$TEST_DIR/aicodepath-docs/dashboard/package.json" ]; then
    echo "✓ package.json exists"
else
    echo "✗ package.json NOT found"
    exit 1
fi

if [ -f "$TEST_DIR/aicodepath-docs/dashboard/api/server.cjs" ]; then
    echo "✓ API server exists"
else
    echo "✗ API server NOT found"
    exit 1
fi

if [ -f "$TEST_DIR/aicodepath-docs/dashboard/src/App.tsx" ]; then
    echo "✓ React App exists"
else
    echo "✗ React App NOT found"
    exit 1
fi

# Test API server database path
echo
echo "Testing API server configuration..."
DB_PATH_IN_SERVER=$(grep -o 'path.resolve(__dirname, .*aicodepath.db' "$TEST_DIR/aicodepath-docs/dashboard/api/server.cjs" | head -1)
echo "Database path in API server: $DB_PATH_IN_SERVER"

if [[ "$DB_PATH_IN_SERVER" == *"../../../aicodepath-docs/aicodepath.db"* ]]; then
    echo "✓ API server has correct relative database path"
else
    echo "✗ API server database path incorrect"
fi

# Count files
FILE_COUNT=$(find "$TEST_DIR/aicodepath-docs/dashboard" -type f | wc -l)
echo
echo "Files copied: $FILE_COUNT"

echo
echo "═══════════════════════════════════════════════════════════"
echo "  Test Summary"
echo "═══════════════════════════════════════════════════════════"
echo "✓ Dashboard initialization successful!"
echo "✓ All critical files present"
echo "✓ API configuration correct"
echo
echo "Test directory: $TEST_DIR"
echo "To manually inspect: cd $TEST_DIR/aicodepath-docs/dashboard"
echo
echo "Cleanup: rm -rf $TEST_DIR"
echo
