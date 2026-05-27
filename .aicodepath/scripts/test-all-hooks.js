#!/usr/bin/env node
/**
 * Test All Hooks
 *
 * Integration test script that verifies all hook files can execute
 * successfully with test input.
 *
 * Usage:
 *   node test-all-hooks.js
 *   node test-all-hooks.js --verbose
 *
 * @module scripts/test-all-hooks
 */

const path = require('path');

/**
 * List of all hook modules to test
 */
const HOOKS_TO_TEST = [
    // New lifecycle hooks
    { name: 'permission-request-hook', input: { tool: 'Read', params: { path: '/test' } } },
    { name: 'post-tool-failure-hook', input: { tool: 'Bash', params: { command: 'test' }, error: { message: 'Test error', code: 'ENOENT' }, attemptNumber: 1 } },
    { name: 'subagent-lifecycle-hook', input: { event: 'SubagentStart', subagent_id: 'test-123', agent_type: 'Test', task_description: 'Test task' } },
    { name: 'response-stop-hook', input: { reason: 'end_turn', tokens_used: 100, response_time_ms: 1000, tools_called: ['Read'] } },
    { name: 'pre-compact-hook', input: { current_tokens: 5000, max_tokens: 10000, messages_count: 20, oldest_message_age_minutes: 30 } },
    { name: 'session-end-hook', input: { reason: 'complete', session_duration_ms: 300000, total_tokens_used: 5000, tools_called_count: 10 } },
    { name: 'notification-hook', input: { notification_type: 'info', message: 'Test notification', context: {} } },

    // Existing hooks (basic smoke test)
    { name: 'session-start-hook', skipExecute: true }, // Complex initialization
];

/**
 * Test a single hook
 * @param {Object} hookInfo - Hook information
 * @param {boolean} verbose - Show verbose output
 * @returns {Object} Test result
 */
async function testHook(hookInfo, verbose) {
    const { name, input = {}, skipExecute = false } = hookInfo;
    const hookPath = path.join(__dirname, '..', 'hooks', `${name}.js`);

    const result = {
        name,
        passed: false,
        error: null,
        output: null,
        skipped: skipExecute,
    };

    try {
        // Attempt to require the hook
        const hook = require(hookPath);

        if (!hook.execute && !hook.hook) {
            throw new Error('Hook does not export execute() or hook() function');
        }

        if (skipExecute) {
            result.passed = true;
            result.output = 'Skipped execution (import only)';
        } else {
            // Execute the hook
            const execFn = hook.execute || hook.hook;
            const output = await execFn(input);

            result.passed = true;
            result.output = output;
        }

    } catch (error) {
        result.error = error.message;
    }

    return result;
}

/**
 * Run all hook tests
 * @param {boolean} verbose - Show verbose output
 * @returns {Object} Test summary
 */
async function runTests(verbose = false) {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║              AICodePath Hook Integration Tests           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    const results = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const hookInfo of HOOKS_TO_TEST) {
        const result = await testHook(hookInfo, verbose);
        results.push(result);

        if (result.skipped) {
            skipped++;
            console.log(`  ⊘ ${result.name} (skipped)`);
        } else if (result.passed) {
            passed++;
            console.log(`  ✓ ${result.name}`);
            if (verbose && result.output) {
                console.log(`    Output: ${JSON.stringify(result.output).substring(0, 80)}...`);
            }
        } else {
            failed++;
            console.log(`  ✗ ${result.name}`);
            console.log(`    Error: ${result.error}`);
        }
    }

    console.log('\n' + '─'.repeat(60));
    console.log(`\nResults: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    console.log(`Total: ${HOOKS_TO_TEST.length} hooks tested\n`);

    if (failed === 0) {
        console.log('✓ All hooks passed!\n');
    } else {
        console.log('✗ Some hooks failed. See errors above.\n');
    }

    return {
        passed,
        failed,
        skipped,
        total: HOOKS_TO_TEST.length,
        results,
        success: failed === 0,
    };
}

/**
 * Test hook executor
 * @param {boolean} verbose - Show verbose output
 * @returns {Object} Test result
 */
async function testHookExecutor(verbose) {
    console.log('\n' + '─'.repeat(60));
    console.log('Testing Hook Executor...\n');

    try {
        const { HookExecutor, isValidHookConfig } = require('../hooks/lib/hook-executor');

        // Test config validation
        const validCommand = isValidHookConfig({ type: 'command', command: 'echo test' });
        const validPrompt = isValidHookConfig({ type: 'prompt', prompt: 'test' });
        const invalidConfig = !isValidHookConfig({ type: 'command' });

        console.log(`  ✓ Config validation: command=${validCommand}, prompt=${validPrompt}, invalid=${invalidConfig}`);

        // Test command execution
        const executor = new HookExecutor({ timeout: 5000 });
        const result = await executor.execute(
            { type: 'command', command: 'echo \'{"test": true}\'' },
            { tool: 'Test' }
        );

        if (result.success && result.test === true) {
            console.log('  ✓ Command hook execution');
        } else {
            console.log('  ✗ Command hook execution');
            return { passed: false, error: 'Command hook did not return expected result' };
        }

        console.log('\n✓ Hook Executor tests passed!\n');
        return { passed: true };

    } catch (error) {
        console.log(`  ✗ Hook Executor: ${error.message}`);
        return { passed: false, error: error.message };
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const verbose = args.includes('--verbose') || args.includes('-v');

    (async () => {
        try {
            const hookResults = await runTests(verbose);
            const executorResult = await testHookExecutor(verbose);

            const allPassed = hookResults.success && executorResult.passed;

            console.log('═'.repeat(60));
            console.log(allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
            console.log('═'.repeat(60));

            process.exit(allPassed ? 0 : 1);
        } catch (error) {
            console.error('Test error:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = { runTests, testHook };
