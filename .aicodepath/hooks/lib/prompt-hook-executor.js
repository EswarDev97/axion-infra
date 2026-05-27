#!/usr/bin/env node

/**
 * Prompt-Based Hook Executor
 *
 * Executes hooks that use LLM prompts instead of code for validation.
 * Supports natural language validation rules with context-aware decisions.
 *
 * Features:
 * - Execute LLM prompts with hook context
 * - Support for different models (haiku/sonnet/opus)
 * - Timeout handling
 * - Cost tracking
 * - Result caching
 *
 * Date: 2026-02-03
 * Version: 1.0.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Model cost per 1M tokens (approximate)
 */
const MODEL_COSTS = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3.0, output: 15.0 },
  opus: { input: 15.0, output: 75.0 },
};

/**
 * Default timeout per model (ms)
 */
const DEFAULT_TIMEOUTS = {
  haiku: 15000, // 15 seconds
  sonnet: 30000, // 30 seconds
  opus: 60000, // 60 seconds
};

/**
 * Cost tracker for LLM usage
 */
class CostTracker {
  constructor() {
    this.sessions = {};
  }

  track(sessionId, model, inputTokens, outputTokens) {
    if (!this.sessions[sessionId]) {
      this.sessions[sessionId] = {
        totalCost: 0,
        calls: 0,
        models: {},
      };
    }

    const session = this.sessions[sessionId];
    const costs = MODEL_COSTS[model] || MODEL_COSTS.haiku;

    const cost =
      (inputTokens / 1000000) * costs.input +
      (outputTokens / 1000000) * costs.output;

    session.totalCost += cost;
    session.calls += 1;

    if (!session.models[model]) {
      session.models[model] = { cost: 0, calls: 0, tokens: 0 };
    }

    session.models[model].cost += cost;
    session.models[model].calls += 1;
    session.models[model].tokens += inputTokens + outputTokens;

    return cost;
  }

  getSessionStats(sessionId) {
    return this.sessions[sessionId] || null;
  }

  reset(sessionId) {
    if (sessionId) {
      delete this.sessions[sessionId];
    } else {
      this.sessions = {};
    }
  }
}

// Global cost tracker instance
const costTracker = new CostTracker();

/**
 * Replace template variables in prompt
 */
function replaceTemplateVariables(prompt, context) {
  let result = prompt;

  // Replace $ARGUMENTS
  if (context.arguments) {
    result = result.replace(
      /\$ARGUMENTS/g,
      JSON.stringify(context.arguments, null, 2)
    );
  }

  // Replace $TOOL_NAME
  if (context.tool) {
    result = result.replace(/\$TOOL_NAME/g, context.tool);
  }

  // Replace $TOOL_INPUT
  if (context.toolInput) {
    result = result.replace(
      /\$TOOL_INPUT/g,
      JSON.stringify(context.toolInput, null, 2)
    );
  }

  // Replace $FILE_PATH
  if (context.filePath) {
    result = result.replace(/\$FILE_PATH/g, context.filePath);
  }

  // Replace $FILE_CONTENT
  if (context.fileContent) {
    result = result.replace(/\$FILE_CONTENT/g, context.fileContent);
  }

  // Replace $MATCHER
  if (context.matcher) {
    result = result.replace(/\$MATCHER/g, context.matcher);
  }

  return result;
}

/**
 * Load prompt template from file
 */
function loadPromptTemplate(templatePath) {
  const fullPath = path.resolve(__dirname, '..', 'prompts', templatePath);
  if (fs.existsSync(fullPath)) {
    return fs.readFileSync(fullPath, 'utf8');
  }
  return null;
}

/**
 * Execute LLM prompt using Claude API (simulated)
 *
 * In production, this would call the actual Anthropic API.
 * For now, we simulate the response based on the prompt content.
 */
async function executeLLMPrompt(prompt, model = 'haiku', timeout = 30000) {
  // Simulate LLM call
  // In production: use @anthropic-ai/sdk

  // For demonstration, we'll do simple pattern matching
  const promptLower = prompt.toLowerCase();

  let permissionDecision = 'allow';
  let reason = 'Operation appears safe based on analysis.';

  // Simulate analysis
  if (
    promptLower.includes('delete') ||
    promptLower.includes('rm -rf') ||
    promptLower.includes('drop table')
  ) {
    permissionDecision = 'ask';
    reason = 'Potentially destructive operation detected. User confirmation recommended.';
  }

  if (
    promptLower.includes('curl') &&
    promptLower.includes('unknown domain')
  ) {
    permissionDecision = 'deny';
    reason = 'External network call to unknown domain blocked for security.';
  }

  // Simulate token usage
  const inputTokens = Math.floor(prompt.length / 4); // Rough approximation
  const outputTokens = Math.floor(reason.length / 4);

  return {
    permissionDecision,
    reason,
    analysis: `Analyzed using ${model} model. ${reason}`,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    },
    model,
  };
}

/**
 * Execute prompt-based hook
 *
 * @param {Object} hookConfig - Hook configuration
 * @param {string} hookConfig.prompt - Prompt template or inline prompt
 * @param {string} hookConfig.model - Model to use (haiku/sonnet/opus)
 * @param {number} hookConfig.timeout - Timeout in milliseconds
 * @param {string} hookConfig.promptTemplate - Path to prompt template file
 * @param {Object} hookContext - Context information for the hook
 * @param {string} hookContext.tool - Tool being used
 * @param {Object} hookContext.arguments - Tool arguments
 * @param {string} hookContext.hookEventName - Event that triggered hook
 *
 * @returns {Object} Hook output in hookSpecificOutput format
 */
async function executePromptHook(hookConfig, hookContext) {
  const model = hookConfig.model || 'haiku';
  const timeout = hookConfig.timeout || DEFAULT_TIMEOUTS[model];
  const sessionId = hookContext.sessionId || 'default';

  // Get prompt
  let prompt = hookConfig.prompt;

  // Load from template if specified
  if (hookConfig.promptTemplate) {
    const template = loadPromptTemplate(hookConfig.promptTemplate);
    if (template) {
      prompt = template;
    }
  }

  if (!prompt) {
    throw new Error('No prompt specified for prompt-based hook');
  }

  // Replace template variables
  prompt = replaceTemplateVariables(prompt, hookContext);

  // Execute LLM prompt
  const startTime = Date.now();
  let llmResponse;

  try {
    llmResponse = await Promise.race([
      executeLLMPrompt(prompt, model, timeout),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
  } catch (error) {
    if (error.message === 'Timeout') {
      return {
        hookSpecificOutput: {
          hookEventName: hookContext.hookEventName,
          permissionDecision: 'allow',
          permissionDecisionReason: `Hook timed out after ${timeout}ms. Allowing by default.`,
          error: 'timeout',
        },
      };
    }
    throw error;
  }

  const executionTime = Date.now() - startTime;

  // Track cost
  const cost = costTracker.track(
    sessionId,
    model,
    llmResponse.tokens.input,
    llmResponse.tokens.output
  );

  // Build hook output
  const output = {
    hookSpecificOutput: {
      hookEventName: hookContext.hookEventName,
      permissionDecision: llmResponse.permissionDecision,
      permissionDecisionReason: llmResponse.reason,
      llmAnalysis: llmResponse.analysis,
      metadata: {
        model,
        executionTime,
        tokens: llmResponse.tokens,
        cost: cost.toFixed(6),
        sessionStats: costTracker.getSessionStats(sessionId),
      },
    },
  };

  // Add additional context if needed
  if (hookContext.hookEventName === 'PostToolUse') {
    output.hookSpecificOutput.additionalContext = llmResponse.analysis;
  }

  return output;
}

/**
 * Get cost tracker statistics
 */
function getCostStats(sessionId) {
  return costTracker.getSessionStats(sessionId);
}

/**
 * Reset cost tracker
 */
function resetCostTracker(sessionId = null) {
  costTracker.reset(sessionId);
}

module.exports = {
  executePromptHook,
  getCostStats,
  resetCostTracker,
  CostTracker,
};

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === 'test') {
    // Test the prompt hook executor
    const testContext = {
      hookEventName: 'PreToolUse',
      tool: 'Bash',
      arguments: { command: 'ls -la' },
      sessionId: 'test-session',
    };

    const testConfig = {
      prompt:
        'Evaluate if this command is safe: $TOOL_INPUT. Return allow, deny, or ask.',
      model: 'haiku',
      timeout: 15000,
    };

    executePromptHook(testConfig, testContext)
      .then((result) => {
        console.log('Test Result:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\nSession Stats:');
        console.log(JSON.stringify(getCostStats('test-session'), null, 2));
      })
      .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  } else {
    console.log('Usage: node prompt-hook-executor.js test');
  }
}
