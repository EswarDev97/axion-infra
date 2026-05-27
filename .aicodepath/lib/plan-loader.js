/**
 * Plan Loader
 *
 * Reads the active task file from aicodepath-docs/task/ (7-column format)
 * and inserts pending tasks as units into the DB. The specialist agent from the Agent column is stored
 * as assigned_agent so the orchestrator can route each unit to the right agent.
 *
 * 7-column format: | Task | Agent | Content | DoD | Depends | Batch | Status |
 *
 * Column mapping:
 *   Task    → name
 *   Agent   → assigned_agent (null when '—' or empty)
 *   Content → description
 *   DoD     → appended to description as "DoD: ..."
 *   Depends → unit_dependencies rows (resolved by task name; numeric fallback)
 *   Batch   → priority (integer; 0 when '—')
 *   Status  → rows matching done/complete/✅ are skipped
 *
 * @module lib/plan-loader
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const pathResolver = require('./path-resolver');
const logger = require('./logger');
const { resolveActiveTaskFile } = require('./task-resolver');

/** Canonical column names for tasks.md — single source of truth. */
const TASKS_MD_COLUMNS = ['Task', 'Agent', 'Content', 'DoD', 'Depends', 'Batch', 'Status'];

/** Column indices for the 7-column format */
const COL = { TASK: 0, AGENT: 1, CONTENT: 2, DOD: 3, DEPENDS: 4, BATCH: 5, STATUS: 6 };

/**
 * Split a pipe-delimited markdown table row into trimmed cells.
 * Returns null if the line is not a table row.
 * @param {string} line
 * @returns {string[]|null}
 */
function parseTableRow(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
    return trimmed.slice(1, -1).split('|').map(c => c.trim());
}

/**
 * Return true when a cell value is empty, a dash, or an em-dash.
 * @param {string} val
 * @returns {boolean}
 */
function isEmpty(val) {
    return !val || val === '—' || val === '-' || val === '';
}

/**
 * Parse tasks.md content and return an array of task objects.
 * Only includes rows that have not been completed.
 *
 * @param {string} content - Full file content of tasks.md
 * @returns {Array<{name: string, agent: string|null, content: string|null, dod: string|null, depends: string[], batch: number}>}
 */
function parseTasks(content) {
    const lines = content.split('\n');
    const tasks = [];
    let headerFound = false;
    let separatorFound = false;

    for (const line of lines) {
        const cells = parseTableRow(line);
        if (!cells) continue;

        if (!headerFound) {
            const isHeader = cells.length >= 7 &&
                cells[COL.TASK].toLowerCase() === 'task' &&
                cells[COL.AGENT].toLowerCase() === 'agent';
            if (isHeader) {
                headerFound = true;
            } else if (cells[0] && cells[0].toLowerCase() === 'task') {
                // Near-miss: first cell is 'task' but column count or names don't match.
                // Fail loudly so format drift is caught immediately rather than silently
                // returning 0 units and making the orchestrate loader appear to succeed.
                const found = cells.join(' | ');
                const expected = TASKS_MD_COLUMNS.join(' | ');
                throw new Error(
                    `tasks.md header mismatch — expected 7-column format but found ${cells.length} columns.\n` +
                    `  Expected: ${expected}\n` +
                    `  Found:    ${found}\n` +
                    `  Fix: update tasks.md to use the 7-column format. See .aicodepath/lib/plan-loader.js TASKS_MD_COLUMNS.`
                );
            }
            continue;
        }

        if (!separatorFound) {
            separatorFound = true;
            continue;
        }

        const status = cells[COL.STATUS] || '';
        if (/done|complete|✅/i.test(status)) continue;

        const name = cells[COL.TASK];
        if (!name || isEmpty(name)) continue;

        tasks.push({
            name,
            agent: isEmpty(cells[COL.AGENT]) ? null : cells[COL.AGENT],
            content: isEmpty(cells[COL.CONTENT]) ? null : cells[COL.CONTENT],
            dod: isEmpty(cells[COL.DOD]) ? null : cells[COL.DOD],
            depends: isEmpty(cells[COL.DEPENDS])
                ? []
                : cells[COL.DEPENDS].split(/[,;]/).map(s => s.trim()).filter(Boolean),
            batch: isEmpty(cells[COL.BATCH]) ? 0 : (parseInt(cells[COL.BATCH], 10) || 0),
        });
    }

    return tasks;
}

/**
 * Insert new units into the DB, skipping any that already exist by name.
 * Returns a name→id map covering both inserted and pre-existing units.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @param {Array} tasks - Parsed task objects
 * @param {Set<string>} existingNames - Names already in the DB for this session
 * @returns {{ nameToId: Map<string, number>, inserted: number, skipped: number }}
 */
function insertUnits(db, sessionId, tasks, existingNames) {
    const insertUnit = db.prepare(`
        INSERT INTO units (session_id, name, description, assigned_agent, priority)
        VALUES (?, ?, ?, ?, ?)
    `);

    const nameToId = new Map();
    let inserted = 0;
    let skipped = 0;

    for (const task of tasks) {
        if (existingNames.has(task.name)) {
            skipped++;
            continue;
        }

        const description = [
            task.content,
            task.dod ? `DoD: ${task.dod}` : null,
        ].filter(Boolean).join('\n\n') || null;

        const result = insertUnit.run(sessionId, task.name, description, task.agent, task.batch);
        nameToId.set(task.name, result.lastInsertRowid);
        inserted++;

        logger.info(`Inserted unit: ${task.name}`, {
            context: 'plan-loader',
            agent: task.agent,
            id: result.lastInsertRowid,
        });
    }

    // Populate map for pre-existing units so dependency resolution can find them
    for (const name of existingNames) {
        if (nameToId.has(name)) continue;
        const row = db.prepare('SELECT id FROM units WHERE session_id = ? AND name = ?').get(sessionId, name);
        if (row) nameToId.set(name, row.id);
    }

    return { nameToId, inserted, skipped };
}

/**
 * Create dependency edges in unit_dependencies for tasks that have a Depends value.
 * Resolves dependencies by task name first, then by numeric ID as fallback.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {Array} tasks - Parsed task objects
 * @param {Map<string, number>} nameToId - Name→DB-id map for all units in this session
 * @returns {number} Number of dependency rows inserted
 */
function insertDependencies(db, tasks, nameToId) {
    const insertDep = db.prepare(`
        INSERT OR IGNORE INTO unit_dependencies (unit_id, depends_on_unit_id, dependency_type)
        VALUES (?, ?, 'blocks')
    `);

    let count = 0;

    for (const task of tasks) {
        const unitId = nameToId.get(task.name);
        if (!unitId || task.depends.length === 0) continue;

        for (const dep of task.depends) {
            const depId = nameToId.get(dep) || (parseInt(dep, 10) || null);
            if (!depId) {
                logger.info(`Dependency not resolved: "${dep}" for unit "${task.name}"`, { context: 'plan-loader' });
                continue;
            }
            insertDep.run(unitId, depId);
            count++;
        }
    }

    return count;
}

/**
 * Stamp plan_artifact_id and design_artifact_id on newly inserted units
 * and create a sprint-level implements link from plan → design.
 *
 * Reads artifact IDs from session_state (set by write-plan Step 11b / T11).
 * Gracefully no-ops when keys are absent — the loader must never crash
 * just because the invoking session didn't come from a write-plan flow.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {Map<string, number>} nameToId - Only newly inserted unit ids are stamped
 */
function stampArtifactIds(db, nameToId) {
    if (nameToId.size === 0) return;

    const planRow = db.prepare("SELECT value FROM session_state WHERE key = 'plan_artifact_id'").get();
    const designRow = db.prepare("SELECT value FROM session_state WHERE key = 'design_artifact_id'").get();

    const planId = planRow ? JSON.parse(planRow.value) : null;
    const designId = designRow ? JSON.parse(designRow.value) : null;

    if (!planId && !designId) return;

    const unitIds = Array.from(nameToId.values());
    const updateStmt = db.prepare(
        'UPDATE units SET plan_artifact_id = ?, design_artifact_id = ? WHERE id = ?'
    );

    for (const uid of unitIds) {
        updateStmt.run(planId || null, designId || null, uid);
    }

    logger.info('Stamped artifact IDs on units', {
        context: 'plan-loader',
        planId,
        designId,
        unitCount: unitIds.length,
    });

    // Sprint-level traceability: plan → design implements link
    if (planId && designId) {
        db.prepare(`
            INSERT INTO links (source_id, target_id, link_type, created_by)
            VALUES (?, ?, 'implements', 'plan-loader')
            ON CONFLICT(source_id, target_id, link_type) DO NOTHING
        `).run(planId, designId);

        logger.info('Created plan→design implements link', {
            context: 'plan-loader',
            planId,
            designId,
        });
    }
}

/**
 * Load tasks from tasks.md into the units DB table.
 *
 * Skips rows that already exist (matched by name + session_id) unless
 * options.clearExisting is true.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId - Session ID to group units under
 * @param {Object} [options]
 * @param {string}  [options.tasksPath]     - Override path to tasks.md
 * @param {boolean} [options.clearExisting] - Delete existing units for this session first
 * @returns {{ inserted: number, skipped: number, dependencies: number }}
 */
function loadPlan(db, sessionId, options = {}) {
    const tasksPath = options.tasksPath || resolveActiveTaskFile();

    if (!tasksPath) {
        logger.info('No active task file found in aicodepath-docs/task/', { context: 'plan-loader' });
        return { inserted: 0, skipped: 0, dependencies: 0 };
    }

    if (!fs.existsSync(tasksPath)) {
        throw new Error(`Task file not found: ${tasksPath}`);
    }

    const tasks = parseTasks(fs.readFileSync(tasksPath, 'utf-8'));

    if (tasks.length === 0) {
        logger.info('No pending tasks found in tasks.md', { context: 'plan-loader' });
        return { inserted: 0, skipped: 0, dependencies: 0 };
    }

    if (options.clearExisting) {
        db.prepare('DELETE FROM units WHERE session_id = ?').run(sessionId);
        logger.info(`Cleared existing units for session ${sessionId}`, { context: 'plan-loader' });
    }

    const existing = db.prepare('SELECT name FROM units WHERE session_id = ?').all(sessionId);
    const existingNames = new Set(existing.map(u => u.name));

    const { nameToId, inserted, skipped } = insertUnits(db, sessionId, tasks, existingNames);
    const dependencies = insertDependencies(db, tasks, nameToId);

    // Stamp plan_artifact_id + design_artifact_id on newly inserted units
    // and create sprint-level implements link (plan → design).
    // Values come from session-state (set by write-plan Step 11b per T11).
    stampArtifactIds(db, nameToId);

    logger.info('Plan loaded', { context: 'plan-loader', sessionId, inserted, skipped, dependencies });

    return { inserted, skipped, dependencies };
}

module.exports = { loadPlan, parseTasks, TASKS_MD_COLUMNS };
