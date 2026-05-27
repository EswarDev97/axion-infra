#!/usr/bin/env node

/**
 * Session Runner - Standalone Unit Execution Process
 *
 * Spawned by UnitOrchestrator for each unit to execute.
 * Runs in isolation with its own environment variables.
 *
 * Execution modes:
 *   1. Claude CLI (default): spawns `claude --print` with unit prompt
 *   2. Simulation (fallback): logs mock steps when CLI is unavailable
 *
 * @module bin/session-runner
 */

const path = require('path');
const { program } = require('commander');
const { findExecutable } = require('../lib/platform-utils');

program
    .name('session-runner')
    .description('Execute a single unit in isolation')
    .requiredOption('--unit-id <id>', 'Unit ID to process')
    .requiredOption('--session-id <id>', 'Parent session ID')
    .requiredOption('--agent-index <index>', 'Agent index for display')
    .parse();

const options = program.opts();

/**
 * Check if the `claude` CLI binary is available on PATH
 * @returns {boolean}
 */
function isClaudeAvailable() {
    return findExecutable('claude');
}

/**
 * Main execution function
 */
async function main() {
    const unitId = parseInt(options.unitId, 10);
    const sessionId = options.sessionId;
    const agentIndex = parseInt(options.agentIndex, 10);

    console.log(`[SessionRunner] Starting unit ${unitId} for session ${sessionId}`);

    try {
        // Load database
        const Database = require('better-sqlite3');
        const pathResolver = require('../lib/path-resolver');
        const dbPath = pathResolver.getDbPath();
        const db = new Database(dbPath);

        // Get unit details
        const unit = db.prepare(`SELECT * FROM units WHERE id = ?`).get(unitId);

        if (!unit) {
            console.error(`[SessionRunner] Unit ${unitId} not found`);
            process.exit(1);
        }

        console.log(`[SessionRunner] Processing: ${unit.name}`);
        console.log(`[SessionRunner] Description: ${unit.description || 'No description'}`);

        const startTime = Date.now();

        // Execute the unit (real CLI or simulation fallback)
        await executeUnit(unit, agentIndex);

        const elapsed = Date.now() - startTime;
        console.log(`[SessionRunner] Unit ${unitId} completed in ${elapsed}ms`);

        // Update actual effort
        if (elapsed > 0) {
            db.prepare(`
        UPDATE units SET actual_effort = ? WHERE id = ?
      `).run(Math.ceil(elapsed / 60000), unitId);
        }

        db.close();
        process.exit(0);
    } catch (error) {
        console.error(`[SessionRunner] Unit ${unitId} failed:`, error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

/**
 * Read an agent's YAML frontmatter field from its .md file.
 * Returns null if the agent file is not found or the field is absent.
 *
 * @param {string} agentName - Agent name (e.g. "aicodepath-tooling-engineer")
 * @param {string} field - Frontmatter key to extract (e.g. "model")
 * @returns {string|null}
 */
function readAgentFrontmatter(agentName, field) {
    if (!agentName) return null;
    try {
        const pathResolver = require('../lib/path-resolver');
        const fs = require('fs');
        const agentFile = path.join(pathResolver.findProjectRoot(), '.aicodepath', 'agents', `${agentName}.md`);
        if (!fs.existsSync(agentFile)) return null;
        const content = fs.readFileSync(agentFile, 'utf8');
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;
        const line = match[1].split('\n').find(l => l.startsWith(`${field}:`));
        if (!line) return null;
        return line.slice(field.length + 1).trim().replace(/^["']|["']$/g, '');
    } catch {
        return null;
    }
}

/**
 * Execute a unit by spawning the Claude CLI with the unit's prompt.
 * Falls back to simulation mode if `claude` is not on PATH.
 *
 * @param {Object} unit - Unit details from DB
 * @param {number} agentIndex - Agent index for display
 */
async function executeUnit(unit, agentIndex) {
    if (!isClaudeAvailable()) {
        console.log(`[Agent ${agentIndex}] Claude CLI not found on PATH — running in simulation mode`);
        return simulateUnitExecution(unit, agentIndex);
    }

    const { spawn } = require('child_process');

    // Build the prompt from unit metadata
    // Note: units table has no phase column — omit to avoid misleading context
    const specialistRole = unit.assigned_agent
        ? `You are operating as a ${unit.assigned_agent} specialist. Apply your full domain expertise.\n\n`
        : '';
    const prompt = [
        specialistRole,
        `# Task: ${unit.name}`,
        '',
        unit.description || 'Execute this unit.',
        unit.estimated_effort ? `\nEstimated effort: ${unit.estimated_effort} minutes` : '',
    ].filter(Boolean).join('\n');

    // Respect the agent's declared model (haiku for analysis, sonnet for implementation).
    // Fall back to sonnet if the agent file is missing or has no model field.
    const agentModel = readAgentFrontmatter(unit.assigned_agent, 'model') || 'sonnet';

    console.log(`[Agent ${agentIndex}] Executing Claude CLI for unit "${unit.name}" (model: ${agentModel})`);

    return new Promise((resolve, reject) => {
        // --dangerously-skip-permissions is required: stdin is set to 'ignore' (no TTY),
        // so Claude cannot prompt for permission approval interactively. Any tool call
        // that requires confirmation will silently fail without this flag. The agent's
        // permissionMode frontmatter field is only honoured by the Task subagent system,
        // not by the CLI — so we must pass it explicitly here.
        const claude = spawn('claude', ['--print', '--dangerously-skip-permissions', '--model', agentModel, '--', prompt], {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                AICODEPATH_UNIT_NAME: unit.name,
                AICODEPATH_AGENT_INDEX: String(agentIndex),
            },
        });

        claude.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    console.log(`[Agent ${agentIndex}] ${line}`);
                }
            }
        });

        claude.stderr.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    console.error(`[Agent ${agentIndex}] STDERR: ${line}`);
                }
            }
        });

        // Guard against double-settlement: both 'error' and 'exit' can fire on spawn failure
        let settled = false;

        claude.on('error', (err) => {
            if (settled) return;
            settled = true;
            console.error(`[Agent ${agentIndex}] Failed to start Claude CLI:`, err.message);
            simulateUnitExecution(unit, agentIndex).then(resolve).catch(reject);
        });

        claude.on('exit', (code, signal) => {
            if (settled) return;
            settled = true;
            if (code === 0) {
                console.log(`[Agent ${agentIndex}] Claude CLI completed successfully`);
                resolve();
            } else {
                const reason = signal ? `signal ${signal}` : `exit code ${code}`;
                reject(new Error(`Claude CLI failed with ${reason}`));
            }
        });
    });
}

/**
 * Fallback simulation when Claude CLI is unavailable.
 * @param {Object} unit - Unit details
 * @param {number} agentIndex - Agent index
 */
async function simulateUnitExecution(unit, agentIndex) {
    console.log(`[Agent ${agentIndex}] [SIMULATION] Claude CLI unavailable — simulating execution`);
    const steps = [
        'Analyzing requirements...',
        'Generating implementation...',
        'Running tests...',
        'Validating output...',
    ];

    for (const step of steps) {
        console.log(`[Agent ${agentIndex}] ${step}`);
    }

    console.log(`[Agent ${agentIndex}] Unit "${unit.name}" simulation complete`);
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run main
main().catch(error => {
    console.error('[SessionRunner] Fatal error:', error);
    process.exit(1);
});
