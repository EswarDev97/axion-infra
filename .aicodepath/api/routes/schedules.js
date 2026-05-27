/**
 * Schedules API Routes
 *
 * Provides CRUD endpoints for schedule management:
 * - List, create, update, patch, delete schedules
 * - Trigger schedule execution
 *
 * Persists schedules to a JSON file at aicodepath-docs/schedules.json.
 * Uses uuid package for generating unique schedule IDs.
 */

const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pathResolver = require('../../lib/path-resolver');
const logger = require('../../lib/logger');

/**
 * Resolve the absolute path to the schedules JSON file.
 * @returns {string} Absolute path to schedules.json
 */
function getSchedulesPath() {
  const projectRoot = pathResolver.findProjectRoot();
  return path.join(projectRoot, 'aicodepath-docs', 'schedules.json');
}

/**
 * Load schedules from the JSON file.
 * Returns an empty array if the file does not exist or is invalid.
 * @returns {Array} Array of schedule objects
 */
function loadSchedules() {
  const filePath = getSchedulesPath();
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error('[Schedules] Failed to load schedules file', { error: error.message, filePath });
    return [];
  }
}

/**
 * Save schedules to the JSON file.
 * Creates the parent directory if it does not exist.
 * @param {Array} schedules - Array of schedule objects to persist
 */
function saveSchedules(schedules) {
  const filePath = getSchedulesPath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(schedules, null, 2), 'utf-8');
  } catch (error) {
    logger.error('[Schedules] Failed to save schedules file', { error: error.message, filePath });
    throw error;
  }
}

// Load schedules into memory on startup
let schedules = loadSchedules();

/**
 * GET /api/schedules
 *
 * List all schedules.
 *
 * Response: { schedules: [...] }
 */
router.get('/', (req, res) => {
  try {
    schedules = loadSchedules();
    logger.info('[Schedules] Listed schedules', { count: schedules.length });
    res.json({ schedules });
  } catch (error) {
    logger.error('[Schedules] List error', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve schedules',
      details: error.message,
    });
  }
});

/**
 * POST /api/schedules
 *
 * Create a new schedule.
 *
 * Body:
 * - name: Schedule name (required)
 * - action: 'run_tests' | 'build' | 'lint' | 'custom' (required)
 * - customCommand: Command string (required when action is 'custom')
 * - cron: Cron expression (required)
 * - cronDescription: Human-readable cron description (required)
 * - enabled: Whether the schedule is active (default: true)
 *
 * Response: The created schedule object.
 */
router.post('/', (req, res) => {
  try {
    const { name, action, customCommand, cron, cronDescription, enabled } = req.body;

    if (!name || !action || !cron || !cronDescription) {
      return res.status(400).json({
        error: 'Missing required fields: name, action, cron, cronDescription',
      });
    }

    const validActions = ['run_tests', 'build', 'lint', 'custom'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
      });
    }

    if (action === 'custom' && !customCommand) {
      return res.status(400).json({
        error: 'customCommand is required when action is "custom"',
      });
    }

    const schedule = {
      id: uuidv4(),
      name,
      action,
      customCommand: customCommand || undefined,
      cron,
      cronDescription,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      lastRun: undefined,
      nextRun: undefined,
      runCount: 0,
      lastStatus: undefined,
    };

    schedules = loadSchedules();
    schedules.push(schedule);
    saveSchedules(schedules);

    logger.info('[Schedules] Created schedule', { id: schedule.id, name: schedule.name });
    res.status(201).json(schedule);
  } catch (error) {
    logger.error('[Schedules] Create error', { error: error.message });
    res.status(500).json({
      error: 'Failed to create schedule',
      details: error.message,
    });
  }
});

/**
 * PUT /api/schedules/:id
 *
 * Update a schedule completely (full replacement of mutable fields).
 *
 * Params:
 * - id: Schedule ID
 *
 * Body: Full schedule fields (name, action, customCommand, cron, cronDescription, enabled)
 *
 * Response: The updated schedule object.
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, action, customCommand, cron, cronDescription, enabled } = req.body;

    schedules = loadSchedules();
    const index = schedules.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (!name || !action || !cron || !cronDescription) {
      return res.status(400).json({
        error: 'Missing required fields: name, action, cron, cronDescription',
      });
    }

    const validActions = ['run_tests', 'build', 'lint', 'custom'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
      });
    }

    schedules[index] = {
      ...schedules[index],
      name,
      action,
      customCommand: customCommand || undefined,
      cron,
      cronDescription,
      enabled: enabled !== undefined ? Boolean(enabled) : schedules[index].enabled,
    };

    saveSchedules(schedules);

    logger.info('[Schedules] Updated schedule', { id, name });
    res.json(schedules[index]);
  } catch (error) {
    logger.error('[Schedules] Update error', { error: error.message, id: req.params.id });
    res.status(500).json({
      error: 'Failed to update schedule',
      details: error.message,
    });
  }
});

/**
 * PATCH /api/schedules/:id
 *
 * Partially update a schedule (e.g., toggle enabled).
 *
 * Params:
 * - id: Schedule ID
 *
 * Body: Partial schedule fields to merge (e.g., { enabled: false })
 *
 * Response: The updated schedule object.
 */
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;

    schedules = loadSchedules();
    const index = schedules.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Only merge provided fields
    const allowedFields = ['name', 'action', 'customCommand', 'cron', 'cronDescription', 'enabled'];
    const updates = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = field === 'enabled' ? Boolean(req.body[field]) : req.body[field];
      }
    });

    schedules[index] = { ...schedules[index], ...updates };
    saveSchedules(schedules);

    logger.info('[Schedules] Patched schedule', { id, fields: Object.keys(updates) });
    res.json(schedules[index]);
  } catch (error) {
    logger.error('[Schedules] Patch error', { error: error.message, id: req.params.id });
    res.status(500).json({
      error: 'Failed to patch schedule',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/schedules/:id
 *
 * Remove a schedule.
 *
 * Params:
 * - id: Schedule ID
 *
 * Response: { success: true, message: '...' }
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    schedules = loadSchedules();
    const index = schedules.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const removed = schedules.splice(index, 1)[0];
    saveSchedules(schedules);

    logger.info('[Schedules] Deleted schedule', { id, name: removed.name });
    res.json({ success: true, message: `Schedule "${removed.name}" deleted` });
  } catch (error) {
    logger.error('[Schedules] Delete error', { error: error.message, id: req.params.id });
    res.status(500).json({
      error: 'Failed to delete schedule',
      details: error.message,
    });
  }
});

/**
 * POST /api/schedules/:id/run
 *
 * Mark a schedule as running and update its lastRun timestamp and runCount.
 *
 * Params:
 * - id: Schedule ID
 *
 * Response: The updated schedule object with lastStatus set to 'running'.
 */
router.post('/:id/run', (req, res) => {
  try {
    const { id } = req.params;

    schedules = loadSchedules();
    const index = schedules.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    schedules[index].lastRun = new Date().toISOString();
    schedules[index].runCount = (schedules[index].runCount || 0) + 1;
    schedules[index].lastStatus = 'running';

    saveSchedules(schedules);

    logger.info('[Schedules] Schedule run triggered', {
      id,
      name: schedules[index].name,
      runCount: schedules[index].runCount,
    });

    res.json(schedules[index]);
  } catch (error) {
    logger.error('[Schedules] Run error', { error: error.message, id: req.params.id });
    res.status(500).json({
      error: 'Failed to run schedule',
      details: error.message,
    });
  }
});

module.exports = router;
