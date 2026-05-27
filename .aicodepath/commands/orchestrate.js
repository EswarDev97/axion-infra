/**
 * Orchestrate Command - CLI for Multi-Agent Orchestration
 *
 * Provides plan, execute, status, and merge subcommands for managing
 * parallel unit execution.
 *
 * @module commands/orchestrate
 */

const Database = require('better-sqlite3');
const pathResolver = require('../lib/path-resolver');
const { DependencyResolver } = require('../lib/dependency-resolver');
const { UnitOrchestrator } = require('../lib/unit-orchestrator');
const { loadPlan } = require('../lib/plan-loader');

/**
 * Get database instance
 * @returns {Object} better-sqlite3 database
 */
function getDb() {
    const dbPath = pathResolver.getDbPath();
    return new Database(dbPath);
}

/**
 * Show execution plan (topological order)
 * @param {string} sessionId - Session ID
 */
async function showPlan(sessionId) {
    const db = getDb();
    const resolver = new DependencyResolver(db);

    try {
        // Check for cycles first
        const cycles = resolver.detectCycles(sessionId);
        if (cycles.length > 0) {
            console.error('❌ Dependency cycles detected:');
            for (const cycle of cycles) {
                console.error(`   ${cycle.join(' → ')} → ${cycle[0]}`);
            }
            db.close();
            process.exit(1);
        }

        // Get execution order
        const order = resolver.getExecutionOrder(sessionId);

        if (order.length === 0) {
            console.log('ℹ️  No units found for session:', sessionId);
            db.close();
            return;
        }

        console.log('\n📋 Execution Plan\n');
        console.log('Units will be executed in topological order:');
        console.log('(Higher priority units are scheduled first within each tier)\n');

        let tier = 1;
        let prevDeps = 0;

        for (let i = 0; i < order.length; i++) {
            const unit = order[i];
            const deps = unit.dependencies.length;

            if (deps > prevDeps) {
                tier++;
            }

            const status = getStatusIcon(unit.status);
            const priority = unit.priority > 0 ? ` [priority: ${unit.priority}]` : '';
            const depCount = deps > 0 ? ` (deps: ${deps})` : '';

            console.log(`  ${tier}. ${status} ${unit.name}${priority}${depCount}`);
            prevDeps = deps;
        }

        console.log('\n');
        db.close();
    } catch (error) {
        console.error('Error:', error.message);
        db.close();
        process.exit(1);
    }
}

/**
 * Execute orchestration
 * @param {string} sessionId - Session ID
 * @param {Object} options - Execution options
 */
async function execute(sessionId, options = {}) {
    const db = getDb();

    const orchestrator = new UnitOrchestrator(db, {
        maxConcurrency: options.concurrency || 3,
        retryFailedUnits: options.retry !== false,
        maxRetries: options.maxRetries || 2,
        pauseOnFailure: options.pauseOnFailure || false,
    });

    try {
        console.log('\n🚀 Starting Multi-Agent Orchestration\n');

        await orchestrator.initialize(sessionId);
        const stats = orchestrator.getStats();

        console.log(`Session: ${sessionId}`);
        console.log(`Total units: ${stats.totalUnits}`);
        console.log(`Max concurrency: ${stats.maxConcurrency}`);
        console.log('');

        orchestrator.on('complete', (finalStats) => {
            console.log('\n✨ Orchestration Complete!\n');
            console.log(`  Completed: ${finalStats.completedUnits}`);
            console.log(`  Failed: ${finalStats.failedUnits}`);
            console.log(`  Blocked: ${finalStats.blockedUnits}`);
            console.log('');

            db.close();
            process.exit(finalStats.state === 'completed' ? 0 : 1);
        });

        await orchestrator.start();

        // Keep process alive while orchestrator runs
        // In real usage, this would be managed by the hook system

    } catch (error) {
        console.error('Error:', error.message);
        db.close();
        process.exit(1);
    }
}

/**
 * Show orchestration status
 * @param {string} sessionId - Session ID
 */
async function showStatus(sessionId) {
    const db = getDb();

    try {
        // Get latest run
        const run = db.prepare(`
      SELECT * FROM orchestration_runs
      WHERE session_id = ?
      ORDER BY id DESC LIMIT 1
    `).get(sessionId);

        if (!run) {
            console.log('ℹ️  No orchestration runs found for session:', sessionId);
            db.close();
            return;
        }

        // Get unit stats
        const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM units WHERE session_id = ?
    `).get(sessionId);

        console.log('\n📊 Orchestration Status\n');
        console.log(`Run ID: ${run.id}`);
        console.log(`Status: ${getStatusIcon(run.status)} ${run.status}`);
        console.log(`Started: ${run.started_at}`);
        if (run.completed_at) {
            console.log(`Completed: ${run.completed_at}`);
        }
        console.log('');

        // Progress bar
        const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        const barWidth = 30;
        const filled = Math.round((percent / 100) * barWidth);
        const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
        console.log(`Progress: [${bar}] ${percent}%`);
        console.log('');

        // Unit breakdown
        console.log('Units:');
        console.log(`  ✅ Completed:   ${stats.completed}`);
        console.log(`  🔄 In Progress: ${stats.in_progress}`);
        console.log(`  ⏳ Ready:       ${stats.ready}`);
        console.log(`  ⏸️  Pending:     ${stats.pending}`);
        console.log(`  ❌ Failed:      ${stats.failed}`);
        console.log(`  🚫 Blocked:     ${stats.blocked}`);
        console.log('');

        // Show in-progress units
        if (stats.in_progress > 0) {
            const inProgress = db.prepare(`
        SELECT u.*, ue.agent_name, ue.started_at as exec_started
        FROM units u
        LEFT JOIN unit_executions ue ON u.id = ue.unit_id AND ue.status = 'running'
        WHERE u.session_id = ? AND u.status = 'in_progress'
      `).all(sessionId);

            console.log('Active Units:');
            for (const unit of inProgress) {
                console.log(`  🔨 ${unit.name} (${unit.agent_name || 'Agent'})`);
            }
            console.log('');
        }

        db.close();
    } catch (error) {
        console.error('Error:', error.message);
        db.close();
        process.exit(1);
    }
}

/**
 * Get status icon
 * @param {string} status - Status string
 * @returns {string} Emoji icon
 */
function getStatusIcon(status) {
    const icons = {
        pending: '⏸️',
        ready: '⏳',
        in_progress: '🔄',
        completed: '✅',
        failed: '❌',
        blocked: '🚫',
        running: '🔄',
        paused: '⏸️',
        initializing: '🔧',
    };
    return icons[status] || '❓';
}

/**
 * Main command handler
 * @param {Array} args - Command arguments
 */
async function handleCommand(args) {
    const subcommand = args[0];
    const sessionId = args[1] || process.env.AICODEPATH_SESSION_ID || 'default';

    switch (subcommand) {
        case 'plan':
            await showPlan(sessionId);
            break;

        case 'execute':
        case 'start':
            await execute(sessionId, {
                concurrency: parseInt(process.env.AICODEPATH_MAX_CONCURRENCY || '3', 10),
            });
            break;

        case 'status':
            await showStatus(sessionId);
            break;

        case 'load': {
            const clearFlag = args.includes('--clear');
            const db = getDb();
            try {
                const result = loadPlan(db, sessionId, { clearExisting: clearFlag });
                console.log(`\n📥 Plan loaded into session: ${sessionId}`);
                console.log(`   Inserted:     ${result.inserted} units`);
                console.log(`   Skipped:      ${result.skipped} (already exist)`);
                console.log(`   Dependencies: ${result.dependencies}`);
                console.log('\nRun `orchestrate start` to begin execution.\n');
            } finally {
                db.close();
            }
            break;
        }

        case 'merge':
            console.log('ℹ️  Merge functionality will be implemented with worktree support');
            break;

        default:
            console.log('Usage: aicodepath orchestrate <subcommand> [session]');
            console.log('');
            console.log('Subcommands:');
            console.log('  plan     Show execution plan (topological order)');
            console.log('  execute  Start multi-agent parallel execution');
            console.log('  status   Show current orchestration status');
            console.log('  merge    Merge completed worktrees (future)');
            break;
    }
}

module.exports = { handleCommand, showPlan, execute, showStatus };
