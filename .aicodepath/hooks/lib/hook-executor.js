#!/usr/bin/env node
/**
 * Unified Hook Executor
 *
 * Executes hooks based on their type with support for:
 * - command: Shell commands or Node.js scripts
 * - prompt: Single-turn LLM calls for validation
 * - agent: Multi-turn subagent execution
 *
 * This is the main entry point for hook execution, routing to
 * specialized executors based on hook type.
 *
 * @module hooks/lib/hook-executor
 */

const { spawn } = require('child_process');
const path = require('path');
const logger = require('../../lib/logger');

// Import specialized executors
let promptExecutor = null;
let agentExecutor = null;

try {
    promptExecutor = require('./prompt-hook-executor');
} catch (e) {
    logger.debug('[HookExecutor] Prompt executor not available');
}

try {
    agentExecutor = require('./agent-hook-executor');
} catch (e) {
    logger.debug('[HookExecutor] Agent executor not available');
}

/**
 * Default timeouts per hook type (ms)
 */
const DEFAULT_TIMEOUTS = {
    command: 30000,
    prompt: 60000,
    agent: 120000,
};

/**
 * Hook Executor Class
 *
 * Provides unified hook execution with type routing.
 */
class HookExecutor {
    /**
     * Create a HookExecutor instance
     * @param {Object} options - Executor options
     * @param {number} options.timeout - Default timeout in ms
     */
    constructor(options = {}) {
        this.options = {
            timeout: 30000,
            ...options,
        };
    }

    /**
     * Execute a hook based on its type
     * @param {Object} hookConfig - Hook configuration
     * @param {string} hookConfig.type - Hook type: 'command', 'prompt', or 'agent'
     * @param {string} hookConfig.command - Command to execute (for command type)
     * @param {string} hookConfig.prompt - Prompt template (for prompt type)
     * @param {Object} hookConfig.agent_config - Agent configuration (for agent type)
     * @param {number} hookConfig.timeout - Timeout override
     * @param {Object} input - Hook input data (context)
     * @returns {Promise<Object>} Hook result
     */
    async execute(hookConfig, input) {
        const { type = 'command' } = hookConfig;
        const timeout = hookConfig.timeout || DEFAULT_TIMEOUTS[type] || this.options.timeout;

        logger.debug(`[HookExecutor] Executing ${type} hook with timeout ${timeout}ms`);

        switch (type) {
            case 'command':
                return this._executeCommand(hookConfig, input, timeout);
            case 'prompt':
                return this._executePrompt(hookConfig, input, timeout);
            case 'agent':
                return this._executeAgent(hookConfig, input, timeout);
            default:
                throw new Error(`Unknown hook type: ${type}`);
        }
    }

    /**
     * Execute a command hook (shell script or Node.js)
     * @param {Object} hookConfig - Hook configuration
     * @param {Object} input - Hook input
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<Object>} Command result
     */
    async _executeCommand(hookConfig, input, timeout) {
        const { command } = hookConfig;

        if (!command) {
            throw new Error('Command hook requires "command" property');
        }

        return new Promise((resolve, reject) => {
            const proc = spawn('sh', ['-c', command], {
                env: {
                    ...process.env,
                    HOOK_INPUT: JSON.stringify(input),
                },
                timeout: timeout,
                cwd: process.cwd(),
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data;
            });

            proc.stderr.on('data', (data) => {
                stderr += data;
            });

            proc.on('close', (code) => {
                logger.debug(`[HookExecutor] Command exited with code ${code}`);

                if (code === 0) {
                    // Success - try to parse JSON output
                    try {
                        const parsed = JSON.parse(stdout);
                        resolve({ success: true, ...parsed });
                    } catch {
                        resolve({ success: true, output: stdout.trim() });
                    }
                } else if (code === 2) {
                    // Blocking error (exit code 2)
                    resolve({
                        success: false,
                        blocking: true,
                        error: stderr.trim() || stdout.trim() || 'Hook blocked execution',
                    });
                } else {
                    // Warning (exit code 1) or other
                    resolve({
                        success: false,
                        blocking: false,
                        error: stderr.trim() || stdout.trim() || 'Hook returned warning',
                    });
                }
            });

            proc.on('error', (err) => {
                reject(new Error(`Failed to execute command: ${err.message}`));
            });

            // Handle timeout
            const timeoutId = setTimeout(() => {
                proc.kill('SIGTERM');
                reject(new Error(`Command hook timed out after ${timeout}ms`));
            }, timeout);

            proc.on('close', () => {
                clearTimeout(timeoutId);
            });
        });
    }

    /**
     * Execute a prompt hook (single-turn LLM call)
     * @param {Object} hookConfig - Hook configuration
     * @param {Object} input - Hook input
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<Object>} Prompt result
     */
    async _executePrompt(hookConfig, input, timeout) {
        if (!promptExecutor) {
            throw new Error('Prompt hook executor not available');
        }

        const { prompt, model = 'haiku' } = hookConfig;

        if (!prompt) {
            throw new Error('Prompt hook requires "prompt" property');
        }

        // Build context for prompt hook executor
        const hookContext = {
            tool: input.tool || 'Unknown',
            arguments: input.params || input.arguments || {},
            hookEventName: input.event || input.hookEventName || 'Unknown',
            environment: {
                project_path: process.cwd(),
                ...input.environment,
            },
        };

        const result = await promptExecutor.executePromptHook(
            { ...hookConfig, model, timeout },
            hookContext
        );

        return result;
    }

    /**
     * Execute an agent hook (multi-turn subagent)
     * @param {Object} hookConfig - Hook configuration
     * @param {Object} input - Hook input
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<Object>} Agent result
     */
    async _executeAgent(hookConfig, input, timeout) {
        if (!agentExecutor) {
            throw new Error('Agent hook executor not available');
        }

        const { agent_config, prompt } = hookConfig;

        if (!agent_config && !prompt) {
            throw new Error('Agent hook requires "agent_config" or "prompt" property');
        }

        // Build context for agent hook executor
        const hookContext = {
            tool: input.tool || 'Unknown',
            arguments: input.params || input.arguments || {},
            hookEventName: input.event || input.hookEventName || 'Unknown',
            environment: {
                project_path: process.cwd(),
                ...input.environment,
            },
        };

        const agentConfig = {
            type: 'agent',
            prompt: prompt || agent_config?.prompt,
            tools: agent_config?.allowed_tools || ['Read', 'Glob', 'Grep'],
            max_turns: agent_config?.max_turns || 5,
            timeout,
        };

        const result = await agentExecutor.executeAgentHook(agentConfig, hookContext);

        return result;
    }

    /**
     * Execute multiple hooks in sequence
     * @param {Array<Object>} hooks - Array of hook configurations
     * @param {Object} input - Hook input
     * @returns {Promise<Object>} Combined result
     */
    async executeSequence(hooks, input) {
        const results = [];
        let blocked = false;
        let blockedBy = null;

        for (const hookConfig of hooks) {
            if (blocked) break;

            try {
                const result = await this.execute(hookConfig, input);
                results.push(result);

                if (result.blocking) {
                    blocked = true;
                    blockedBy = hookConfig.command || hookConfig.prompt || 'Unknown hook';
                }
            } catch (error) {
                results.push({
                    success: false,
                    error: error.message,
                });
            }
        }

        return {
            success: !blocked,
            blocked,
            blockedBy,
            results,
            hookCount: hooks.length,
            executedCount: results.length,
        };
    }
}

// Global executor instance
const executor = new HookExecutor();

/**
 * Execute a hook
 * @param {Object} hookConfig - Hook configuration
 * @param {Object} input - Hook input
 * @returns {Promise<Object>} Hook result
 */
async function executeHook(hookConfig, input) {
    return executor.execute(hookConfig, input);
}

/**
 * Execute hooks in sequence
 * @param {Array<Object>} hooks - Array of hook configurations
 * @param {Object} input - Hook input
 * @returns {Promise<Object>} Combined result
 */
async function executeHooks(hooks, input) {
    return executor.executeSequence(hooks, input);
}

/**
 * Check if hook config is valid
 * @param {Object} hookConfig - Hook configuration
 * @returns {boolean} Whether config is valid
 */
function isValidHookConfig(hookConfig) {
    if (!hookConfig || typeof hookConfig !== 'object') return false;

    const { type = 'command' } = hookConfig;

    switch (type) {
        case 'command':
            return !!hookConfig.command;
        case 'prompt':
            return !!hookConfig.prompt;
        case 'agent':
            return !!(hookConfig.agent_config || hookConfig.prompt);
        default:
            return false;
    }
}

// Export public API
module.exports = {
    HookExecutor,
    executeHook,
    executeHooks,
    isValidHookConfig,
};

// CLI interface for testing
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === 'help') {
        console.log('Hook Executor\n');
        console.log('Usage:');
        console.log('  node hook-executor.js command "echo test"');
        console.log('  node hook-executor.js prompt "Is this valid?"');
        console.log('  node hook-executor.js test');
        process.exit(0);
    }

    const type = args[0];

    (async () => {
        try {
            let result;

            if (type === 'test') {
                // Run basic tests
                console.log('Running hook executor tests...\n');

                // Test command hook
                result = await executeHook(
                    { type: 'command', command: 'echo \'{"test": true}\'' },
                    { tool: 'Test' }
                );
                console.log('Command hook:', result.success ? '✓ PASS' : '✗ FAIL');

                // Test validation
                console.log('Config validation:', isValidHookConfig({ type: 'command', command: 'test' }) ? '✓ PASS' : '✗ FAIL');
                console.log('Invalid config:', !isValidHookConfig({ type: 'command' }) ? '✓ PASS' : '✗ FAIL');

                console.log('\nAll tests completed.');
            } else if (type === 'command') {
                result = await executeHook(
                    { type: 'command', command: args[1] || 'echo test' },
                    { tool: 'CLI' }
                );
                console.log(JSON.stringify(result, null, 2));
            } else if (type === 'prompt') {
                result = await executeHook(
                    { type: 'prompt', prompt: args[1] || 'Is this valid?' },
                    { tool: 'CLI' }
                );
                console.log(JSON.stringify(result, null, 2));
            }
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    })();
}
