const express = require('express');
const router = express.Router();

// WebSocket health endpoint
router.get('/ws-health', (req, res) => {
  try {
    const { getWebSocketServer } = require('../../../lib/websocket-server');
    const wsServer = getWebSocketServer();

    if (!wsServer) {
      return res.status(503).json({
        status: 'unavailable',
        message: 'WebSocket server not initialized',
      });
    }

    const stats = wsServer.getStats();
    res.json({
      status: 'ok',
      wsClients: stats.totalClients,
      clients: stats.clients,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Session state endpoint
router.get('/session', (req, res) => {
  try {
    const pathResolver = require('../../../lib/path-resolver');
    const fs = require('fs');
    const path = require('path');

    const dbPath = pathResolver.getDbPath();
    const sessionPath = path.join(path.dirname(dbPath), 'session-state.json');

    if (fs.existsSync(sessionPath)) {
      const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      res.json(sessionData);
    } else {
      res.status(404).json({
        status: 'not_found',
        message: 'No active session found',
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Checkpoints list endpoint
router.get('/checkpoints', (req, res) => {
  try {
    const pathResolver = require('../../../lib/path-resolver');
    const fs = require('fs');
    const path = require('path');

    const dbPath = pathResolver.getDbPath();
    const checkpointsDir = path.join(path.dirname(dbPath), 'checkpoints');

    if (!fs.existsSync(checkpointsDir)) {
      return res.json({ checkpoints: [] });
    }

    const files = fs.readdirSync(checkpointsDir)
      .filter(f => f.endsWith('.json') && f !== 'latest.json')
      .map(f => {
        const filePath = path.join(checkpointsDir, f);
        const stats = fs.statSync(filePath);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
          id: data.checkpointId || f.replace('.json', ''),
          phase: data.phase,
          stage: data.stage,
          timestamp: data.timestamp || stats.mtime.toISOString(),
          message: data.message,
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ checkpoints: files });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Latest checkpoint endpoint
router.get('/checkpoints/latest', (req, res) => {
  try {
    const pathResolver = require('../../../lib/path-resolver');
    const fs = require('fs');
    const path = require('path');

    const dbPath = pathResolver.getDbPath();
    const checkpointsDir = path.join(path.dirname(dbPath), 'checkpoints');
    const latestPath = path.join(checkpointsDir, 'latest.json');

    if (fs.existsSync(latestPath)) {
      const data = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
      res.json(data);
    } else {
      res.status(404).json({
        status: 'not_found',
        message: 'No checkpoints found',
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// ========================================
// SCHEDULE MANAGEMENT API
// ========================================

// Get schedule manager singleton
function getScheduleManager() {
  try {
    const { getScheduleManager } = require('../../../lib/schedule-manager');
    return getScheduleManager();
  } catch (error) {
    console.error('Failed to load schedule manager:', error);
    return null;
  }
}

// GET /api/schedules - Get all schedules
router.get('/schedules', (req, res) => {
  try {
    const manager = getScheduleManager();
    if (!manager) {
      return res.status(503).json({ error: 'Schedule manager unavailable' });
    }

    const schedules = manager.getAll();
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schedules/:id - Get a specific schedule
router.get('/schedules/:id', (req, res) => {
  try {
    const manager = getScheduleManager();
    if (!manager) {
      return res.status(503).json({ error: 'Schedule manager unavailable' });
    }

    const schedule = manager.get(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ schedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schedules - Create a new schedule
router.post('/schedules', (req, res) => {
  try {
    const manager = getScheduleManager();
    if (!manager) {
      return res.status(503).json({ error: 'Schedule manager unavailable' });
    }

    const { name, action, customCommand, cron, enabled = true } = req.body;

    if (!name || !action || !cron) {
      return res.status(400).json({ error: 'Missing required fields: name, action, cron' });
    }

    const schedule = manager.create({
      name,
      action,
      customCommand,
      cron,
      enabled,
    });

    res.json({ schedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/schedules/:id - Update a schedule
router.put('/schedules/:id', (req, res) => {
  try {
    const manager = getScheduleManager();
    if (!manager) {
      return res.status(503).json({ error: 'Schedule manager unavailable' });
    }

    const { name, action, customCommand, cron, enabled } = req.body;

    const schedule = manager.update(req.params.id, {
      name,
      action,
      customCommand,
      cron,
      enabled,
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ schedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/schedules/:id - Partial update (e.g., toggle enabled)
router.patch('/schedules/:id', (req, res) => {
  try {
    const manager = getScheduleManager();
    if (!manager) {
      return res.status(503).json({ error: 'Schedule manager unavailable' });
    }

    const existing = manager.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Handle enable/disable toggle
    if (req.body.hasOwnProperty('enabled')) {
      const schedule = manager.setEnabled(req.params.id, req.body.enabled);
      return res.json({ schedule });
    }

    // Handle other partial updates
    const schedule = manager.update(req.params.id, {
      name: req.body.name ?? existing.name,
      action: req.body.action ?? existing.action,
      customCommand: req.body.customCommand ?? existing.custom_command,
      cron: req.body.cron ?? existing.cron_expression,
      enabled: req.body.enabled ?? existing.enabled,
    });

    res.json({ schedule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/schedules/:id - Delete a schedule
router.delete('/schedules/:id', (req, res) => {
  try {
    const manager = getScheduleManager();
    if (!manager) {
      return res.status(503).json({ error: 'Schedule manager unavailable' });
    }

    manager.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schedules/:id/run - Run a schedule immediately
router.post('/schedules/:id/run', (req, res) => {
  try {
    const manager = getScheduleManager();
    if (!manager) {
      return res.status(503).json({ error: 'Schedule manager unavailable' });
    }

    manager.runNow(req.params.id);
    res.json({ success: true, message: 'Schedule triggered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schedules/:id/runs - Get run history for a schedule
router.get('/schedules/:id/runs', (req, res) => {
  try {
    const manager = getScheduleManager();
    if (!manager) {
      return res.status(503).json({ error: 'Schedule manager unavailable' });
    }

    const runs = manager.getRuns(req.params.id);
    res.json({ runs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schedules/stats - Get scheduler statistics
router.get('/schedules/stats', (req, res) => {
  try {
    const manager = getScheduleManager();
    if (!manager) {
      return res.status(503).json({ error: 'Schedule manager unavailable' });
    }

    const stats = manager.getStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
