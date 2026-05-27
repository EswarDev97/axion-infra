#!/usr/bin/env node
/**
 * Cost Tracker Hook (Stop Event)
 *
 * Records per-session token usage and cost into the session_costs table.
 * Best-effort — never blocks or throws. All DB/calculation errors are
 * logged as warnings and swallowed.
 *
 * Input:
 *   - session_id: string
 *   - model: string
 *   - input_tokens: number
 *   - output_tokens: number
 *
 * Output:
 *   - Always exitSuccess (observability hook, never blocks)
 *
 * @module hooks/cost-tracker-hook
 */

const { findProjectRoot, getDbPath } = require('../lib/path-resolver');
const { exitSuccess } = require('./lib/exit-codes');
const logger = require('../lib/logger');

// Lazy-load pricing calculator
let calculateCost = null;
try {
    calculateCost = require('../lib/pricing-calculator').calculateCost;
} catch (_) {
    // pricing-calculator not available — cost will be 0
}

/**
 * Build a cost record from hook data.
 *
 * @param {Object} hookData - Hook input data
 * @returns {Object} Cost record ready for DB insertion
 */
function buildCostRecord(hookData) {
    const sessionId = hookData.session_id || 'unknown';
    const model = hookData.model || 'unknown';
    const inputTokens = hookData.input_tokens || 0;
    const outputTokens = hookData.output_tokens || 0;

    let costUsd = 0;
    if (calculateCost && (inputTokens > 0 || outputTokens > 0)) {
        try {
            costUsd = calculateCost(
                { inputTokens, outputTokens },
                model
            );
        } catch (err) {
            logger.warn('[CostTracker] Cost calculation failed (non-fatal):', { error: err.message });
            costUsd = 0;
        }
    }

    return {
        session_id: sessionId,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
    };
}

/**
 * Persist a cost record to the database (best-effort).
 *
 * @param {Object} record - Cost record from buildCostRecord
 */
function persistRecord(record) {
    try {
        const Database = require('better-sqlite3');
        const dbPath = getDbPath();
        const db = new Database(dbPath);

        db.exec(`
            CREATE TABLE IF NOT EXISTS session_costs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                model TEXT,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                cost_usd REAL DEFAULT 0.0,
                timestamp TEXT DEFAULT (datetime('now'))
            )
        `);

        const stmt = db.prepare(`
            INSERT INTO session_costs (session_id, model, input_tokens, output_tokens, cost_usd)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(record.session_id, record.model, record.input_tokens, record.output_tokens, record.cost_usd);

        db.close();
        logger.debug('[CostTracker] Record saved', {
            session: record.session_id,
            cost: record.cost_usd,
        });
    } catch (err) {
        logger.warn('[CostTracker] DB write failed (non-fatal):', { error: err.message });
    }
}

/**
 * Core implementation (testable without DB access).
 *
 * @param {Object} hookData - Hook input data
 * @param {Object} [opts] - Options
 * @param {boolean} [opts.skipDb] - Skip DB persistence (for tests)
 * @returns {Object} Result with success: true
 */
function executeImpl(hookData, opts = {}) {
    const record = buildCostRecord(hookData);

    if (!opts.skipDb) {
        persistRecord(record);
    }

    return { success: true, ...record };
}

/**
 * Main hook implementation.
 * @param {Object} hookData - Hook input data
 * @returns {Object} Always success
 */
async function execute(hookData) {
    // Profile check — cost-tracker is a standard-tier hook
    try {
        const { shouldRunHook } = require('./lib/profile-resolver');
        if (!shouldRunHook('cost-tracker-hook', 'standard').run) {
            return { success: true, skipped: 'profile' };
        }
    } catch (_) {
        // profile-resolver not available — run anyway
    }

    return executeImpl(hookData);
}

// Export for testing and Claude Code hooks system
module.exports = { execute, executeImpl, buildCostRecord };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
    const { wrapHook } = require('./lib/hook-wrapper');
    wrapHook(execute, { name: 'cost-tracker-hook' });
}
