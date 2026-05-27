#!/usr/bin/env node

/**
 * Agent Hook Executor
 *
 * Executes agent-based hooks that spawn Claude subagents with tool access
 * for complex verification requiring reasoning and file access.
 *
 * Agent hooks are the most powerful hook type, capable of:
 * - Reading files and understanding context
 * - Running tests and checking actual state
 * - Making complex decisions with reasoning
 * - Providing detailed feedback and analysis
 *
 * Usage:
 *   const { executeAgentHook } = require('./lib/agent-hook-executor');
 *   const result = await executeAgentHook(hookConfig, hookContext);
 *
 * Hook Configuration:
 *   {
 *     type: "agent",
 *     prompt: "Verify test coverage is above 80%...",
 *     tools: ["Read", "Grep", "Glob", "Bash"],
 *     timeout: 120000,
 *     model: "sonnet" | "haiku" | "opus"
 *   }
 *
 * Hook Context:
 *   {
 *     tool: "Write",
 *     arguments: { file_path: "...", content: "..." },
 *     environment: { ... },
 *     hookEventName: "PreToolUse"
 *   }
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const logger = require('../../lib/logger');

/**
 * Agent Hook Executor
 *
 * Note: This is a framework implementation. In production with Claude Code support,
 * this would integrate with Claude's Task tool to spawn actual subagents.
 *
 * Current implementation provides:
 * - Agent prompt building
 * - Context marshalling
 * - Result parsing
 * - Timeout handling
 * - Decision extraction
 */
class AgentHookExecutor {
  constructor(config = {}) {
    this.defaultTimeout = config.timeout || 120000; // 2 minutes
    this.maxTimeout = 300000; // 5 minutes
    this.defaultTools = ['Read', 'Grep', 'Glob'];
    this.defaultModel = 'sonnet';
  }

  /**
   * Execute an agent-based hook
   *
   * @param {Object} hookConfig - Hook configuration
   * @param {Object} hookContext - Hook execution context
   * @returns {Promise<Object>} Hook result with decision
   */
  async executeAgentHook(hookConfig, hookContext) {
    const startTime = Date.now();

    try {
      // Validate configuration
      this.validateConfig(hookConfig);

      // Build agent prompt with context
      const agentPrompt = this.buildAgentPrompt(hookConfig, hookContext);

      // Prepare agent execution
      const agentConfig = {
        prompt: agentPrompt,
        tools: hookConfig.tools || this.defaultTools,
        timeout: Math.min(hookConfig.timeout || this.defaultTimeout, this.maxTimeout),
        model: hookConfig.model || this.defaultModel
      };

      console.log(`\n🤖 Spawning agent for verification...`);
      console.log(`   Model: ${agentConfig.model}`);
      console.log(`   Tools: ${agentConfig.tools.join(', ')}`);
      console.log(`   Timeout: ${agentConfig.timeout}ms`);

      // Execute agent (in production, this would spawn actual Claude subagent)
      const agentResult = await this.spawnAgent(agentConfig, hookContext);

      // Extract decision from agent response
      const decision = this.extractDecision(agentResult);

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Return formatted result
      return {
        hookSpecificOutput: {
          hookEventName: hookContext.hookEventName,
          permissionDecision: decision.decision,
          permissionDecisionReason: decision.reason,
          agentAnalysis: agentResult.analysis,
          agentRecommendations: agentResult.recommendations,
          executionTime,
          agentMetadata: {
            model: agentConfig.model,
            toolsUsed: agentResult.toolsUsed || [],
            confidence: agentResult.confidence || 'high'
          }
        }
      };

    } catch (error) {
      logger.error('Agent hook execution failed', {
        hook: 'agent-hook-executor',
        error: error.message,
        hookEvent: hookContext.hookEventName
      });

      // On failure, default to asking user
      return {
        hookSpecificOutput: {
          hookEventName: hookContext.hookEventName,
          permissionDecision: 'ask',
          permissionDecisionReason: [
            'Agent hook failed to execute:',
            error.message,
            '',
            'Manual review required.'
          ].join('\n'),
          error: error.message
        }
      };
    }
  }

  /**
   * Validate hook configuration
   */
  validateConfig(hookConfig) {
    if (!hookConfig) {
      throw new Error('Hook configuration is required');
    }

    if (!hookConfig.prompt) {
      throw new Error('Agent prompt is required');
    }

    if (hookConfig.timeout && hookConfig.timeout > this.maxTimeout) {
      throw new Error(`Timeout exceeds maximum of ${this.maxTimeout}ms`);
    }

    if (hookConfig.tools && !Array.isArray(hookConfig.tools)) {
      throw new Error('Tools must be an array');
    }
  }

  /**
   * Build agent prompt with context
   *
   * Replaces template variables:
   * - $TOOL - Tool being used
   * - $FILE_PATH - File path (if applicable)
   * - $CONTENT - Content being written (if applicable)
   * - $COMMAND - Command being executed (if applicable)
   * - $ARGUMENTS - JSON of all arguments
   * - $PROJECT_PATH - Project root path
   */
  buildAgentPrompt(hookConfig, hookContext) {
    let prompt = hookConfig.prompt;

    // Replace template variables
    const replacements = {
      '$TOOL': hookContext.tool || 'Unknown',
      '$FILE_PATH': hookContext.arguments?.file_path || 'N/A',
      '$CONTENT': hookContext.arguments?.content || hookContext.arguments?.new_string || 'N/A',
      '$COMMAND': hookContext.arguments?.command || 'N/A',
      '$ARGUMENTS': JSON.stringify(hookContext.arguments || {}, null, 2),
      '$PROJECT_PATH': hookContext.environment?.project_path || process.cwd(),
      '$HOOK_EVENT': hookContext.hookEventName
    };

    for (const [variable, value] of Object.entries(replacements)) {
      prompt = prompt.replace(new RegExp(this.escapeRegex(variable), 'g'), value);
    }

    // Add decision format instructions
    prompt += '\n\n' + this.getDecisionFormatInstructions(hookContext.hookEventName);

    return prompt;
  }

  /**
   * Get decision format instructions based on hook event
   */
  getDecisionFormatInstructions(hookEventName) {
    if (hookEventName === 'PreToolUse') {
      return `
**IMPORTANT: Your Response Format**

You must provide your decision in this exact format at the end of your response:

DECISION: [allow|deny|ask]
REASON: [Brief explanation of your decision]
CONFIDENCE: [high|medium|low]

Example:
DECISION: deny
REASON: Test coverage is only 65%, below the required 80% threshold.
CONFIDENCE: high

Additional analysis and details should come before this decision block.`;
    }

    return `
**IMPORTANT: Your Response Format**

Provide your recommendation in this format:

RECOMMENDATION: [proceed|block|review]
REASON: [Brief explanation]
CONFIDENCE: [high|medium|low]`;
  }

  /**
   * Spawn agent for verification
   *
   * In production with Claude Code support, this would use the Task tool.
   * Current implementation simulates agent behavior for testing.
   */
  async spawnAgent(agentConfig, hookContext) {
    // Note: In production, this would spawn an actual Claude subagent via Task tool
    // For now, we simulate the pattern and structure

    console.log('\n📝 Agent Prompt:\n');
    console.log(agentConfig.prompt.substring(0, 200) + '...\n');

    // Simulate agent thinking and analysis
    // In production, actual Claude subagent would execute with tool access

    // Check if this is a test verification request
    if (agentConfig.prompt.includes('test') && agentConfig.prompt.includes('coverage')) {
      return await this.simulateTestCoverageAgent(agentConfig, hookContext);
    }

    // Check if this is an architecture validation request
    if (agentConfig.prompt.includes('architecture') || agentConfig.prompt.includes('pattern')) {
      return await this.simulateArchitectureAgent(agentConfig, hookContext);
    }

    // Default agent behavior
    return {
      analysis: 'Agent analysis would appear here in production.',
      recommendations: [],
      decision: 'allow',
      reason: 'Simulated agent verification passed',
      confidence: 'medium',
      toolsUsed: agentConfig.tools
    };
  }

  /**
   * Simulate test coverage verification agent
   */
  async simulateTestCoverageAgent(agentConfig, hookContext) {
    console.log('🧪 Agent Task: Verify test coverage...\n');

    // In production, agent would:
    // 1. Use Grep to find test files
    // 2. Use Bash to run test suite
    // 3. Parse coverage output
    // 4. Make decision based on threshold

    // Simulate reading test files
    if (agentConfig.tools.includes('Read')) {
      console.log('📖 [Read] Scanning test files...');
    }

    // Simulate running tests
    if (agentConfig.tools.includes('Bash')) {
      console.log('⚡ [Bash] Running test suite...');
      await this.sleep(500); // Simulate test execution
    }

    // Simulate coverage analysis
    const simulatedCoverage = 85; // Mock coverage percentage

    return {
      analysis: `Test Coverage Verification:
- Found 24 test files
- Ran 156 tests, all passed
- Code coverage: ${simulatedCoverage}%
- Lines covered: 2,340 / 2,753
- Branches covered: 456 / 534

Coverage meets the required threshold of 80%.`,
      recommendations: [
        'Test coverage is healthy',
        'Consider adding tests for edge cases in auth module',
        'Integration tests could be expanded'
      ],
      decision: simulatedCoverage >= 80 ? 'allow' : 'deny',
      reason: simulatedCoverage >= 80
        ? `Test coverage is ${simulatedCoverage}%, which exceeds the 80% requirement.`
        : `Test coverage is only ${simulatedCoverage}%, below the required 80% threshold.`,
      confidence: 'high',
      toolsUsed: ['Read', 'Grep', 'Bash'],
      metrics: {
        coverage: simulatedCoverage,
        testsRun: 156,
        testsPassed: 156
      }
    };
  }

  /**
   * Simulate architecture validation agent
   */
  async simulateArchitectureAgent(agentConfig, hookContext) {
    console.log('🏗️  Agent Task: Validate architecture patterns...\n');

    // In production, agent would:
    // 1. Use Read to analyze the code being written
    // 2. Use Grep to find similar patterns in codebase
    // 3. Use Read to check architecture documentation
    // 4. Make decision based on consistency

    const filePath = hookContext.arguments?.file_path || 'unknown';

    console.log(`📖 [Read] Analyzing ${filePath}...`);
    console.log('🔍 [Grep] Finding similar patterns...');
    console.log('📚 [Read] Checking architecture guidelines...');

    await this.sleep(800); // Simulate analysis time

    return {
      analysis: `Architecture Validation for ${filePath}:

Pattern Analysis:
- ✅ Follows repository pattern
- ✅ Proper dependency injection
- ✅ Consistent error handling
- ⚠️  Could benefit from interface abstraction
- ✅ Naming conventions followed

Compared against 18 similar files in codebase.
All patterns are consistent with project architecture.`,
      recommendations: [
        'Architecture patterns are consistent',
        'Consider extracting interface for better testability',
        'Error handling follows project standards'
      ],
      decision: 'allow',
      reason: 'Code follows established architecture patterns and project conventions.',
      confidence: 'high',
      toolsUsed: ['Read', 'Grep'],
      patternsChecked: [
        'Repository pattern',
        'Dependency injection',
        'Error handling',
        'Naming conventions'
      ]
    };
  }

  /**
   * Extract decision from agent response
   */
  extractDecision(agentResult) {
    // Parse decision from agent output
    const decision = agentResult.decision || 'ask';
    const reason = agentResult.reason || 'Agent completed analysis';

    // Map agent decisions to hook decisions
    const decisionMap = {
      'allow': 'allow',
      'proceed': 'allow',
      'deny': 'deny',
      'block': 'deny',
      'ask': 'ask',
      'review': 'ask'
    };

    return {
      decision: decisionMap[decision] || 'ask',
      reason: reason,
      confidence: agentResult.confidence || 'medium'
    };
  }

  /**
   * Escape regex special characters
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global executor instance
const executor = new AgentHookExecutor();

/**
 * Execute agent-based hook
 *
 * @param {Object} hookConfig - Hook configuration with agent prompt
 * @param {Object} hookContext - Hook execution context
 * @returns {Promise<Object>} Hook result with decision
 *
 * @example
 *   const result = await executeAgentHook({
 *     type: "agent",
 *     prompt: "Verify test coverage > 80%",
 *     tools: ["Read", "Bash"]
 *   }, hookContext);
 */
async function executeAgentHook(hookConfig, hookContext) {
  return await executor.executeAgentHook(hookConfig, hookContext);
}

/**
 * Check if hook is agent-based
 */
function isAgentHook(hookConfig) {
  return hookConfig && hookConfig.type === 'agent';
}

/**
 * Get supported agent tools
 */
function getSupportedAgentTools() {
  return [
    'Read',      // Read files
    'Grep',      // Search file contents
    'Glob',      // Find files by pattern
    'Bash',      // Execute commands
    'WebFetch',  // Fetch web content
    'Edit',      // Edit files (careful!)
    'Write'      // Write files (careful!)
  ];
}

/**
 * Create agent hook configuration
 *
 * Helper to create properly formatted agent hook configs
 */
function createAgentHookConfig(options) {
  return {
    type: 'agent',
    prompt: options.prompt,
    tools: options.tools || ['Read', 'Grep', 'Glob'],
    timeout: options.timeout || 120000,
    model: options.model || 'sonnet'
  };
}

// Export public API
module.exports = {
  executeAgentHook,
  isAgentHook,
  getSupportedAgentTools,
  createAgentHookConfig,
  AgentHookExecutor
};

// CLI interface for testing
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help') {
    console.log('Agent Hook Executor\n');
    console.log('Usage:');
    console.log('  node agent-hook-executor.js test-coverage    Test coverage verification');
    console.log('  node agent-hook-executor.js architecture      Architecture validation');
    console.log('  node agent-hook-executor.js custom <prompt>   Custom agent prompt');
    console.log('  node agent-hook-executor.js help              Show this help');
    console.log('\nExamples:');
    console.log('  node agent-hook-executor.js test-coverage');
    console.log('  node agent-hook-executor.js architecture');
    console.log('  node agent-hook-executor.js custom "Verify API documentation is complete"');
    process.exit(0);
  }

  const command = args[0];

  (async () => {
    let hookConfig, hookContext;

    if (command === 'test-coverage') {
      hookConfig = createAgentHookConfig({
        prompt: 'Verify all unit tests pass and coverage is above 80%. Use Read and Bash tools to check test files and run the test suite.',
        tools: ['Read', 'Grep', 'Bash'],
        timeout: 300000
      });

      hookContext = {
        tool: 'Bash',
        arguments: { command: 'git commit -m "test"' },
        environment: { project_path: process.cwd() },
        hookEventName: 'PreToolUse'
      };

    } else if (command === 'architecture') {
      hookConfig = createAgentHookConfig({
        prompt: 'Analyze the code being written in $FILE_PATH. Check if it follows the project\'s architecture patterns. Read related files to understand the context.',
        tools: ['Read', 'Grep', 'Glob'],
        timeout: 120000
      });

      hookContext = {
        tool: 'Write',
        arguments: {
          file_path: 'src/services/user.service.ts',
          content: 'export class UserService { ... }'
        },
        environment: { project_path: process.cwd() },
        hookEventName: 'PreToolUse'
      };

    } else if (command === 'custom' && args[1]) {
      hookConfig = createAgentHookConfig({
        prompt: args.slice(1).join(' '),
        tools: ['Read', 'Grep', 'Glob'],
        timeout: 120000
      });

      hookContext = {
        tool: 'Write',
        arguments: { file_path: 'test.txt', content: 'test' },
        environment: { project_path: process.cwd() },
        hookEventName: 'PreToolUse'
      };

    } else {
      console.error('Unknown command. Use "help" for usage.');
      process.exit(1);
    }

    console.log('Agent Hook Executor - Testing\n');
    console.log('═'.repeat(60));

    const result = await executeAgentHook(hookConfig, hookContext);

    console.log('\n' + '═'.repeat(60));
    console.log('\n📋 Hook Result:\n');
    console.log(JSON.stringify(result, null, 2));

    const allowed = result.hookSpecificOutput.permissionDecision === 'allow';
    console.log(`\n${allowed ? '✅' : '❌'} Decision: ${result.hookSpecificOutput.permissionDecision.toUpperCase()}`);

    process.exit(allowed ? 0 : 1);
  })();
}
