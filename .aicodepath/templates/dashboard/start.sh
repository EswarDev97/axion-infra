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

echo "Starting AICodePath Dashboard..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  echo ""
fi

# Start API server in background
echo "Starting API server on port 3888..."
node ../../.aicodepath/api/server.js &
API_PID=$!

# Register cleanup BEFORE blocking on Vite (so Ctrl+C kills API too)
cleanup() {
  echo ''
  echo 'Shutting down...'
  kill "$API_PID" 2>/dev/null
  wait "$API_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# Wait for API to start
sleep 2

# Start Vite dev server (blocks until exit)
echo "Starting dashboard on port 3899..."
echo ""
npm run dev

# If Vite exits on its own, clean up
cleanup
