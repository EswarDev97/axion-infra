/**
 * Sprint History
 *
 * Read API for the artifact graph — queries sprints by cr_number and returns
 * their associated units. Used by CLI history commands, dashboard API, and
 * /aicodepath-acceptance archival.
 *
 * @module lib/sprint-history
 */

const logger = require('./logger');

/**
 * List all sprints (distinct cr_numbers) that have at least one plan or design
 * artifact, ordered by most recent first.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {Array<{cr_number: string, started: string, last_updated: string}>}
 */
function listSprints(db) {
    const rows = db.prepare(`
        SELECT
            cr_number,
            MIN(created_at) AS started,
            MAX(updated_at) AS last_updated
        FROM artifacts
        WHERE artifact_type IN ('plan', 'design')
        GROUP BY cr_number
        ORDER BY started DESC
    `).all();

    logger.info('Listed sprints', { context: 'sprint-history', count: rows.length });
    return rows;
}

/**
 * Get all units belonging to a sprint, resolved via the plan artifact's
 * cr_number through the plan_artifact_id FK on units.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} crNumber - The change request number (e.g., 'CR-2026-04-18')
 * @returns {Array<{id: number, name: string, description: string|null, assigned_agent: string|null, priority: number, status: string, plan_artifact_id: number}>}
 */
function getSprintTasks(db, crNumber) {
    const rows = db.prepare(`
        SELECT
            u.id,
            u.name,
            u.description,
            u.assigned_agent,
            u.priority,
            u.status,
            u.plan_artifact_id
        FROM units u
        JOIN artifacts a ON u.plan_artifact_id = a.id
        WHERE a.cr_number = ?
        ORDER BY u.priority, u.id
    `).all(crNumber);

    logger.info('Retrieved sprint tasks', { context: 'sprint-history', crNumber, count: rows.length });
    return rows;
}

module.exports = { listSprints, getSprintTasks, rebuildTasksMdFromDb };

/**
 * Rebuild a 7-column tasks.md markdown table from the DB for a given sprint.
 * Output is parseable by plan-loader.parseTasks — the round-trip is lossless
 * for name, agent, content, DoD, batch, and status.
 *
 * Completed units are excluded so the output only contains pending work,
 * matching what plan-loader skips on read.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} crNumber
 * @returns {string} Markdown table in 7-column format
 */
function rebuildTasksMdFromDb(db, crNumber) {
    const rows = db.prepare(`
        SELECT
            u.name,
            u.description,
            u.assigned_agent,
            u.priority,
            u.status
        FROM units u
        JOIN artifacts a ON u.plan_artifact_id = a.id
        WHERE a.cr_number = ?
          AND u.status NOT IN ('completed', 'done')
        ORDER BY u.priority, u.id
    `).all(crNumber);

    const header = '| Task | Agent | Content | DoD | Depends | Batch | Status |';
    const separator = '| --- | --- | --- | --- | --- | --- | --- |';

    const body = rows.map(u => {
        // Split description back into content + DoD (plan-loader joins them with "DoD: ")
        let content = null;
        let dod = null;
        if (u.description) {
            const dodMatch = u.description.match(/^(.*)\n\nDoD: (.*)$/s);
            if (dodMatch) {
                content = dodMatch[1] || null;
                dod = dodMatch[2] || null;
            } else {
                content = u.description;
            }
        }

        return `| ${u.name} | ${u.assigned_agent || '—'} | ${content || '—'} | ${dod || '—'} | — | ${u.priority || 1} | ${u.status || 'TODO'} |`;
    }).join('\n');

    logger.info('Rebuilt tasks.md from DB', { context: 'sprint-history', crNumber, count: rows.length });

    return `${header}\n${separator}\n${body}\n`;
}
