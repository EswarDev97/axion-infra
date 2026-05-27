#!/bin/bash

# Visual Memory Dashboard Setup Script
# Sets up the Visual Memory view for the AICodePath dashboard

set -e

echo "🧠 Visual Memory Dashboard Setup"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from .aicodepath/dashboard directory"
  exit 1
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "Installing npm dependencies..."
  npm install
else
  echo "✅ Dependencies already installed"
fi

# Check if mermaid is installed
if ! grep -q "\"mermaid\"" package.json; then
  echo "📥 Installing mermaid.js..."
  npm install mermaid --save
else
  echo "✅ mermaid.js already installed"
fi

# Check if database exists
DB_PATH="../../aicodepath-docs/aicodepath.db"
if [ ! -f "$DB_PATH" ]; then
  echo "⚠️  Warning: Database not found at $DB_PATH"
  echo "   The Visual Memory feature requires the aicodepath.db database."
  echo "   Please run the project initialization first."
else
  echo "✅ Database found"

  # Check if visual_diagrams table exists
  if sqlite3 "$DB_PATH" ".schema visual_diagrams" 2>/dev/null | grep -q "CREATE TABLE"; then
    echo "✅ visual_diagrams table exists"

    # Count diagrams
    DIAGRAM_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM visual_diagrams;" 2>/dev/null || echo "0")
    echo "   Found $DIAGRAM_COUNT diagrams in database"
  else
    echo "⚠️  Warning: visual_diagrams table not found"
    echo "   You may need to run the Visual Memory generator first:"
    echo "   node ../../hooks/visual-memory-generator.js --type all"
  fi
fi

# Check if components exist
echo ""
echo "📁 Checking component files..."
if [ -f "src/components/VisualMemoryView.tsx" ]; then
  echo "✅ VisualMemoryView.tsx exists"
else
  echo "❌ VisualMemoryView.tsx not found"
  exit 1
fi

# Verify App.tsx has been updated
if grep -q "VisualMemoryView" src/App.tsx; then
  echo "✅ App.tsx updated with Visual Memory import"
else
  echo "⚠️  App.tsx may need manual update"
fi

# Verify API endpoints
if grep -q "/api/visual-memory" api/server.cjs; then
  echo "✅ API endpoints added to server.cjs"
else
  echo "❌ API endpoints not found in server.cjs"
  exit 1
fi

echo ""
echo "✨ Setup Complete!"
echo ""
echo "To start the dashboard:"
echo "  node ../../.aicodepath/commands/dashboard.js"
echo ""
echo "Or start components separately:"
echo "  npm run api   # Backend on port 3001"
echo "  npm run dev   # Frontend on port 3899"
echo ""
echo "Then navigate to: http://localhost:3899"
echo "Click the 🧠 Visual Memory tab to view diagrams"
echo ""
echo "📚 Documentation: VISUAL_MEMORY_FEATURE.md"
echo ""
