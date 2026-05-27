#!/usr/bin/env node

/**
 * Async Hook Executor
 *
 * Executes hooks in the background without blocking Claude's main operation.
 * Results are queued and delivered on the next turn.
 *
 * Features:
 * - Background hook execution
 * - Result queue management
 * - Progress indicators
 * - Timeout handling (up to 10 minutes)
 * - Process cancellation
 *
 * Date: 2026-02-03
 * Version: 1.0.0
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

/**
 * Async Hook Executor
 */
class AsyncHookExecutor extends EventEmitter {
  constructor() {
    super();
    this.runningHooks = new Map();
    this.resultQueue = [];
    this.maxTimeout = 600000; // 10 minutes
  }

  /**
   * Execute hook asynchronously
   *
   * @param {Object} hookConfig - Hook configuration
   * @param {Object} hookContext - Context for hook execution
   * @param {Object} options - Execution options
   * @returns {Object} Immediate response with job ID
   */
  async executeAsync(hookConfig, hookContext, options = {}) {
    const jobId = this.generateJobId();
    const timeout = hookConfig.timeout || options.timeout || 120000; // 2 minutes default

    console.log(`\n[AsyncHook] Starting background execution: ${jobId}`);
    console.log(`   Command: ${hookConfig.command}`);
    console.log(`   Timeout: ${timeout}ms`);

    // Start hook execution in background
    const execution = this.spawnHookProcess(hookConfig, hookContext, jobId, timeout);

    // Store running hook info
    this.runningHooks.set(jobId, {
      jobId,
      command: hookConfig.command,
      startTime: Date.now(),
      timeout,
      process: execution.process,
      status: 'running'
    });

    // Handle completion
    execution.promise
      .then(result => this.handleCompletion(jobId, result))
      .catch(error => this.handleError(jobId, error));

    // Return immediate response
    return {
      async: true,
      jobId,
      status: 'started',
      message: `Hook execution started in background (Job: ${jobId})`,
      hookSpecificOutput: {
        hookEventName: hookContext.hookEventName,
        additionalContext: `Background execution started. Results will be available shortly.`,
        asyncJob: {
          jobId,
          timeout,
          estimatedCompletionTime: Date.now() + timeout
        }
      }
    };
  }

  /**
   * Spawn hook process
   */
  spawnHookProcess(hookConfig, hookContext, jobId, timeout) {
    const hookProcess = spawn('node', [hookConfig.command], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOOK_ASYNC: 'true',
        HOOK_JOB_ID: jobId,
        HOOK_CONTEXT: JSON.stringify(hookContext)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    hookProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      this.emit('progress', { jobId, output: data.toString() });
    });

    hookProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      this.emit('error', { jobId, error: data.toString() });
    });

    // Handle timeout
    const timeoutHandle = setTimeout(() => {
      if (hookProcess.killed === false) {
        console.log(`   ⏱️  Hook ${jobId} timed out after ${timeout}ms`);
        hookProcess.kill('SIGTERM');

        // Force kill if not terminated
        setTimeout(() => {
          if (!hookProcess.killed) {
            hookProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    }, timeout);

    const promise = new Promise((resolve, reject) => {
      hookProcess.on('exit', (code, signal) => {
        clearTimeout(timeoutHandle);

        if (signal === 'SIGTERM') {
          reject(new Error('Hook execution timed out'));
        } else if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({ success: true, result, stdout, stderr });
          } catch (parseError) {
            resolve({ success: true, result: { output: stdout }, stdout, stderr });
          }
        } else {
          reject(new Error(`Hook exited with code ${code}\n${stderr}`));
        }
      });

      hookProcess.on('error', (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });

    return { process: hookProcess, promise };
  }

  /**
   * Handle hook completion
   */
  handleCompletion(jobId, result) {
    const hook = this.runningHooks.get(jobId);
    if (!hook) return;

    const executionTime = Date.now() - hook.startTime;

    console.log(`\n[AsyncHook] Completed: ${jobId}`);
    console.log(`   Execution time: ${executionTime}ms`);
    console.log(`   Status: success`);

    // Update hook status
    hook.status = 'completed';
    hook.executionTime = executionTime;
    hook.result = result;

    // Add to result queue
    this.resultQueue.push({
      jobId,
      status: 'completed',
      result: result.result,
      executionTime,
      completedAt: new Date().toISOString()
    });

    // Emit completion event
    this.emit('completed', { jobId, result });

    // Cleanup
    setTimeout(() => this.runningHooks.delete(jobId), 300000); // Keep for 5 minutes
  }

  /**
   * Handle hook error
   */
  handleError(jobId, error) {
    const hook = this.runningHooks.get(jobId);
    if (!hook) return;

    const executionTime = Date.now() - hook.startTime;

    console.log(`\n[AsyncHook] Failed: ${jobId}`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Execution time: ${executionTime}ms`);

    // Update hook status
    hook.status = 'failed';
    hook.executionTime = executionTime;
    hook.error = error.message;

    // Add to result queue
    this.resultQueue.push({
      jobId,
      status: 'failed',
      error: error.message,
      executionTime,
      completedAt: new Date().toISOString()
    });

    // Emit error event
    this.emit('failed', { jobId, error });

    // Cleanup
    setTimeout(() => this.runningHooks.delete(jobId), 300000);
  }

  /**
   * Get results for completed hooks
   */
  getResults() {
    const results = [...this.resultQueue];
    this.resultQueue = []; // Clear queue
    return results;
  }

  /**
   * Get status of running hooks
   */
  getStatus(jobId = null) {
    if (jobId) {
      const hook = this.runningHooks.get(jobId);
      if (!hook) {
        // Check result queue
        const result = this.resultQueue.find(r => r.jobId === jobId);
        return result ? { jobId, ...result } : null;
      }

      return {
        jobId: hook.jobId,
        command: hook.command,
        status: hook.status,
        startTime: hook.startTime,
        runningTime: Date.now() - hook.startTime,
        timeout: hook.timeout
      };
    }

    // Return all running hooks
    return Array.from(this.runningHooks.values()).map(hook => ({
      jobId: hook.jobId,
      command: hook.command,
      status: hook.status,
      runningTime: Date.now() - hook.startTime
    }));
  }

  /**
   * Cancel running hook
   */
  cancel(jobId) {
    const hook = this.runningHooks.get(jobId);
    if (!hook || !hook.process) {
      return { success: false, reason: 'Hook not found or already completed' };
    }

    console.log(`\n[AsyncHook] Cancelling: ${jobId}`);

    try {
      hook.process.kill('SIGTERM');
      hook.status = 'cancelled';

      return { success: true, jobId };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return `async-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Global executor instance
const executor = new AsyncHookExecutor();

/**
 * Execute async hook (convenience function)
 */
async function executeAsyncHook(hookConfig, hookContext, options) {
  return executor.executeAsync(hookConfig, hookContext, options);
}

/**
 * Get hook results
 */
function getAsyncResults() {
  return executor.getResults();
}

/**
 * Get hook status
 */
function getAsyncStatus(jobId) {
  return executor.getStatus(jobId);
}

/**
 * Cancel async hook
 */
function cancelAsyncHook(jobId) {
  return executor.cancel(jobId);
}

module.exports = {
  AsyncHookExecutor,
  executeAsyncHook,
  getAsyncResults,
  getAsyncStatus,
  cancelAsyncHook,
  executor
};

// CLI support
if (require.main === module) {
  // Test async execution
  const testConfig = {
    command: path.join(__dirname, '..', 'run-tests.js'),
    timeout: 30000
  };

  const testContext = {
    hookEventName: 'PostToolUse',
    tool: 'Write'
  };

  executeAsyncHook(testConfig, testContext)
    .then(response => {
      console.log('\nAsync Hook Started:');
      console.log(JSON.stringify(response, null, 2));

      // Check status periodically
      const jobId = response.jobId;
      const checkInterval = setInterval(() => {
        const status = getAsyncStatus(jobId);
        console.log('\nStatus:', status);

        if (!status || status.status !== 'running') {
          clearInterval(checkInterval);
          console.log('\nFinal Results:', getAsyncResults());
        }
      }, 2000);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}
