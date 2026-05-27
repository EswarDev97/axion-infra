/**
 * Hook Executor Unit Tests
 *
 * Tests for the unified hook executor with type routing.
 *
 * @module hooks/lib/__tests__/hook-executor.test.js
 */

const path = require('path');

// Mock logger to suppress output during tests
jest.mock('../../../lib/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

const { HookExecutor, executeHook, executeHooks, isValidHookConfig } = require('../hook-executor');

describe('HookExecutor', () => {
    let executor;

    beforeEach(() => {
        executor = new HookExecutor({ timeout: 5000 });
    });

    describe('isValidHookConfig', () => {
        test('validates command hook config', () => {
            expect(isValidHookConfig({ type: 'command', command: 'echo test' })).toBe(true);
            expect(isValidHookConfig({ type: 'command' })).toBe(false);
            expect(isValidHookConfig({ command: 'echo test' })).toBe(true); // Default type is command
        });

        test('validates prompt hook config', () => {
            expect(isValidHookConfig({ type: 'prompt', prompt: 'Is this valid?' })).toBe(true);
            expect(isValidHookConfig({ type: 'prompt' })).toBe(false);
        });

        test('validates agent hook config', () => {
            expect(isValidHookConfig({ type: 'agent', prompt: 'Run checks' })).toBe(true);
            expect(isValidHookConfig({ type: 'agent', agent_config: { agent: 'test' } })).toBe(true);
            expect(isValidHookConfig({ type: 'agent' })).toBe(false);
        });

        test('rejects invalid configs', () => {
            expect(isValidHookConfig(null)).toBe(false);
            expect(isValidHookConfig(undefined)).toBe(false);
            expect(isValidHookConfig('string')).toBe(false);
            expect(isValidHookConfig({ type: 'unknown' })).toBe(false);
        });
    });

    describe('command hook execution', () => {
        test('executes simple command and parses JSON output', async () => {
            const result = await executor.execute(
                { type: 'command', command: 'echo \'{"success": true, "test": "value"}\'' },
                {}
            );

            expect(result.success).toBe(true);
            expect(result.test).toBe('value');
        });

        test('handles non-JSON output', async () => {
            const result = await executor.execute(
                { type: 'command', command: 'echo "plain text"' },
                {}
            );

            expect(result.success).toBe(true);
            expect(result.output).toBe('plain text');
        });

        test('handles exit code 0 as success', async () => {
            const result = await executor.execute(
                { type: 'command', command: 'exit 0' },
                {}
            );

            expect(result.success).toBe(true);
        });

        test('handles exit code 1 as warning (non-blocking)', async () => {
            const result = await executor.execute(
                { type: 'command', command: 'echo "warning" && exit 1' },
                {}
            );

            expect(result.success).toBe(false);
            expect(result.blocking).toBe(false);
        });

        test('handles exit code 2 as blocking error', async () => {
            const result = await executor.execute(
                { type: 'command', command: 'echo "blocked" && exit 2' },
                {}
            );

            expect(result.success).toBe(false);
            expect(result.blocking).toBe(true);
        });

        test('throws error for missing command', async () => {
            await expect(executor.execute({ type: 'command' }, {}))
                .rejects.toThrow('Command hook requires "command" property');
        });
    });

    describe('executeHooks (sequence)', () => {
        test('executes multiple hooks in sequence', async () => {
            const hooks = [
                { type: 'command', command: 'echo \'{"step": 1}\'' },
                { type: 'command', command: 'echo \'{"step": 2}\'' },
            ];

            const result = await executor.executeSequence(hooks, {});

            expect(result.success).toBe(true);
            expect(result.hookCount).toBe(2);
            expect(result.executedCount).toBe(2);
            expect(result.results).toHaveLength(2);
        });

        test('stops on blocking hook', async () => {
            const hooks = [
                { type: 'command', command: 'echo \'{"step": 1}\'' },
                { type: 'command', command: 'exit 2' }, // Blocking
                { type: 'command', command: 'echo \'{"step": 3}\'' },
            ];

            const result = await executor.executeSequence(hooks, {});

            expect(result.success).toBe(false);
            expect(result.blocked).toBe(true);
            expect(result.executedCount).toBe(2);
        });

        test('continues on warning hook', async () => {
            const hooks = [
                { type: 'command', command: 'exit 1' }, // Warning
                { type: 'command', command: 'echo \'{"step": 2}\'' },
            ];

            const result = await executor.executeSequence(hooks, {});

            expect(result.success).toBe(true);
            expect(result.blocked).toBe(false);
            expect(result.executedCount).toBe(2);
        });
    });

    describe('module exports', () => {
        test('executeHook function works', async () => {
            const result = await executeHook(
                { type: 'command', command: 'echo \'{"test": true}\'' },
                {}
            );

            expect(result.success).toBe(true);
            expect(result.test).toBe(true);
        });

        test('executeHooks function works', async () => {
            const result = await executeHooks(
                [{ type: 'command', command: 'echo test' }],
                {}
            );

            expect(result.success).toBe(true);
        });
    });
});

describe('HookExecutor with timeout', () => {
    test('times out on long-running command', async () => {
        const executor = new HookExecutor({ timeout: 100 });

        await expect(executor.execute(
            { type: 'command', command: 'sleep 5' },
            {}
        )).rejects.toThrow(/timed out/);
    }, 10000);
});
