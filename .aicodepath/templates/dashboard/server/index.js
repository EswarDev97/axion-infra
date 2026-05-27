const express = require('express');
const http = require('http');
const { createWebSocketServer } = require('../../../lib/websocket-server');

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wsServer = createWebSocketServer();
wsServer.attach(server);

// REST API routes
app.use('/api', require('./routes'));

// Serve static dashboard
app.use(express.static('dist'));

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    wsClients: wsServer.getStats().totalClients,
  });
});

const PORT = process.env.DASHBOARD_PORT || 3899;

server.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
});

module.exports = { app, server, wsServer };
