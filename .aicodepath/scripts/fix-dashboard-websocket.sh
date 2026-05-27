#!/bin/bash
# Fix Dashboard WebSocket Port Mismatch
# Run this in projects that have already been installed with AICodePath

set -e

echo "🔧 Fixing AICodePath Dashboard WebSocket Configuration..."
echo ""

# Find project root
PROJECT_ROOT=$(pwd)
DASHBOARD_DIR="$PROJECT_ROOT/aicodepath-docs/dashboard"

if [ ! -d "$DASHBOARD_DIR" ]; then
  echo "❌ Error: Dashboard not found at $DASHBOARD_DIR"
  echo "   Make sure you're running this from the project root"
  exit 1
fi

echo "📍 Project: $PROJECT_ROOT"
echo "📊 Dashboard: $DASHBOARD_DIR"
echo ""

# Backup existing files
echo "📦 Creating backups..."
if [ -f "$DASHBOARD_DIR/start.sh" ]; then
  cp "$DASHBOARD_DIR/start.sh" "$DASHBOARD_DIR/start.sh.backup"
  echo "   ✓ Backed up start.sh"
fi

if [ -f "$DASHBOARD_DIR/.env.aicodepath" ]; then
  cp "$DASHBOARD_DIR/.env.aicodepath" "$DASHBOARD_DIR/.env.aicodepath.backup"
  echo "   ✓ Backed up .env.aicodepath"
elif [ -f "$DASHBOARD_DIR/.env" ]; then
  cp "$DASHBOARD_DIR/.env" "$DASHBOARD_DIR/.env.backup"
  echo "   ✓ Backed up .env"
fi

echo ""

# Update start.sh to use correct API server
echo "📝 Updating start.sh..."
cat > "$DASHBOARD_DIR/start.sh" << 'EOF'
#!/bin/bash

# AICodePath Dashboard Startup Script
#
# Ports:
# - Dashboard (Vite): 3899
# - API Server (with WebSocket): 3888
#
# The API server (.aicodepath/api/server.js) provides:
# - REST API at http://localhost:3888/api/*
# - WebSocket at ws://localhost:3888/ws/dashboard
# - Terminal WebSocket at ws://localhost:3888/ws/terminal

echo "🚀 Starting AICodePath Dashboard..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Start API server in background
echo "🔧 Starting API server on port 3888..."
node ../../.aicodepath/api/server.js &
API_PID=$!

# Wait for API to start
sleep 2

# Start Vite dev server
echo "🎨 Starting dashboard on port 3899..."
echo ""
npm run dev

# Cleanup on exit
trap "echo ''; echo '👋 Shutting down...'; kill $API_PID 2>/dev/null; exit" INT TERM
EOF

chmod +x "$DASHBOARD_DIR/start.sh"
echo "   ✓ Updated start.sh to use .aicodepath/api/server.js on port 3888"
echo ""

# Update .env file
echo "📝 Updating environment configuration..."
ENV_FILE="$DASHBOARD_DIR/.env.aicodepath"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="$DASHBOARD_DIR/.env"
fi

if [ -f "$ENV_FILE" ]; then
  # Update PORT values using sed
  sed -i.bak 's/^PORT=3001$/PORT=3888/' "$ENV_FILE"
  sed -i.bak 's/^API_PORT=3001$/API_PORT=3888/' "$ENV_FILE"
  rm -f "$ENV_FILE.bak"
  echo "   ✓ Updated $ENV_FILE: PORT=3888, API_PORT=3888"
else
  echo "   ⚠️  No .env file found, skipping"
fi

echo ""
echo "✅ Fix complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart the dashboard: cd $DASHBOARD_DIR && bash start.sh"
echo "   2. Verify API: curl http://localhost:3888/api/health"
echo "   3. Check WebSocket: Open http://localhost:3899 in browser"
echo ""
echo "📁 Backups saved in $DASHBOARD_DIR:"
if [ -f "$DASHBOARD_DIR/start.sh.backup" ]; then
  echo "   - start.sh.backup"
fi
if [ -f "$DASHBOARD_DIR/.env.aicodepath.backup" ]; then
  echo "   - .env.aicodepath.backup"
fi
if [ -f "$DASHBOARD_DIR/.env.backup" ]; then
  echo "   - .env.backup"
fi
echo ""
