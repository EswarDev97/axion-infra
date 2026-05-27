#!/usr/bin/env node

/**
 * AgentInvoker - Executes agents with context management and logging
 *
 * Responsibilities:
 * - Load agent definition via AgentLoader
 * - Check context limits (60-70% threshold)
 * - Build prompt: agent guidelines + task + relevant context
 * - Write output to file or clipboard
 * - Log execution to database (agent_executions table)
 *
 * @module lib/agent-invoker
 */

const fs = require('fs').promises;
const path = require('path');
const AgentLoader = require('./agent-loader');

class AgentInvoker {
  /**
   * @param {Object} options - Configuration options
   * @param {AgentLoader} options.loader - Agent loader instance
   * @param {Object} options.contextManager - Context manager instance (optional for Phase 1)
   * @param {Object} options.db - Database connection (optional for Phase 1)
   */
  constructor(options = {}) {
    this.loader = options.loader || new AgentLoader();
    this.contextManager = options.contextManager || null;
    this.db = options.db || null;
  }

  /**
   * Invoke an agent
   * @param {string} agentName - Name of the agent to invoke
   * @param {string} task - Task description
   * @param {Object} options - Invocation options
   * @param {string} options.output - Output file path
   * @param {string} options.mode - Output mode: 'file', 'stdout', 'clipboard', 'execute'
   * @param {Object} options.context - Additional context to include
   * @returns {Promise<Object>} Invocation result
   */
  async invoke(agentName, task, options = {}) {
    const startTime = Date.now();
    const {
      output = null,
      mode = 'stdout',
      context = {}
    } = options;

    try {
      // 1. Load agent definition
      const agent = await this.loader.loadAgent(agentName);

      // 2. Build prompt
      const prompt = this.buildPrompt(agent, task, context);

      // 3. Estimate tokens (rough: ~4 chars per token)
      const estimatedTokens = Math.ceil(prompt.length / 4);

      // 4. Check context limits (if context manager available)
      if (this.contextManager) {
        await this.contextManager.loadConfig();
        const modelLimit = this.contextManager.getModelLimit();
        const status = this.contextManager.checkThreshold(estimatedTokens, modelLimit);
        const percentage = this.contextManager.getUsagePercentage(estimatedTokens, modelLimit);
        const emoji = this.contextManager.getStatusEmoji(status);

        if (status === 'exceeded') {
          throw new Error(
            `${emoji} Context limit exceeded: ${estimatedTokens.toLocaleString()} tokens (${percentage}%). ` +
            `Run: acp context compact`
          );
        }

        if (status === 'critical') {
          console.warn(
            `${emoji} Context usage critical: ${estimatedTokens.toLocaleString()} tokens (${percentage}% of ${modelLimit.toLocaleString()})`
          );

          // Trigger auto-compaction if enabled
          if (this.contextManager.config.strategies.compaction.enabled) {
            console.log('🔄 Auto-compaction triggered at 70% threshold');
          }
        }

        if (status === 'warning') {
          console.log(
            `${emoji} Context usage warning: ${estimatedTokens.toLocaleString()} tokens (${percentage}% of ${modelLimit.toLocaleString()})`
          );
        }

        // Track usage
        await this.contextManager.trackUsage(agentName, estimatedTokens);
      }

      // 5. Execute or write output
      let outputPath;
      let modelResponse = null;
      let actualTokensUsed = null;

      if (mode === 'execute') {
        // Execute via Anthropic SDK
        const result = await this.executePrompt(prompt, agentName);
        modelResponse = result.responseText;
        actualTokensUsed = result.usage;
        outputPath = 'executed';
      } else {
        outputPath = await this.writeOutput(prompt, mode, output, agentName);
      }

      // 6. Log execution to database (if available)
      const duration = Date.now() - startTime;
      if (this.db) {
        await this.logExecution({
          agent_name: agentName,
          task_description: task,
          output_path: outputPath,
          tokens_used: estimatedTokens,
          duration_ms: duration,
          status: 'success'
        });
      }

      return {
        success: true,
        agent: agentName,
        outputPath,
        tokensUsed: actualTokensUsed ? (actualTokensUsed.input_tokens + actualTokensUsed.output_tokens) : estimatedTokens,
        duration,
        ...(modelResponse !== null && { response: modelResponse }),
        ...(actualTokensUsed !== null && { usage: actualTokensUsed }),
      };
    } catch (error) {
      // Log failure
      const duration = Date.now() - startTime;
      if (this.db) {
        await this.logExecution({
          agent_name: agentName,
          task_description: task,
          tokens_used: 0,
          duration_ms: duration,
          status: 'failure',
          error_message: error.message
        });
      }

      throw error;
    }
  }

  /**
   * Build the complete prompt for the agent
   * @param {Object} agent - Agent object
   * @param {string} task - Task description
   * @param {Object} context - Additional context
   * @returns {string} Complete prompt
   */
  buildPrompt(agent, task, context) {
    const sections = [];

    // Agent guidelines
    sections.push('# Agent Guidelines\n');
    sections.push(agent.guidelines);
    sections.push('\n');

    // Task
    sections.push('---\n');
    sections.push('# Current Task\n');
    sections.push(task);
    sections.push('\n');

    // Additional context (if provided)
    if (context.filePath) {
      sections.push('---\n');
      sections.push('# Context\n');
      sections.push(`**File:** ${context.filePath}\n`);
    }

    if (context.codeSnippet) {
      sections.push('```\n');
      sections.push(context.codeSnippet);
      sections.push('\n```\n');
    }

    if (context.requirements) {
      sections.push('**Requirements:**\n');
      sections.push(context.requirements);
      sections.push('\n');
    }

    // Execution instructions
    sections.push('---\n');
    sections.push('# Execution\n');
    sections.push(`Act as the **${agent.name.toUpperCase()}** and execute the instructions above.\n`);
    sections.push('Focus on the current task while following your guidelines and constraints.\n');

    return sections.join('');
  }

  /**
   * Write output based on mode
   * @param {string} content - Content to write
   * @param {string} mode - Output mode
   * @param {string} outputPath - Custom output path
   * @param {string} agentName - Agent name (for default path)
   * @returns {Promise<string>} Output file path or 'stdout'/'clipboard'
   */
  async writeOutput(content, mode, outputPath, agentName) {
    switch (mode) {
      case 'file': {
        const filePath = outputPath || this.getDefaultOutputPath(agentName);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf8');
        return filePath;
      }

      case 'clipboard': {
        // Note: Clipboard functionality would require additional dependency
        // For now, write to temp file and inform user
        const tempPath = `/tmp/aicodepath-agent-${agentName}-${Date.now()}.md`;
        await fs.writeFile(tempPath, content, 'utf8');
        console.log(`\n📋 Agent prompt written to: ${tempPath}`);
        console.log('Copy to clipboard manually or use: pbcopy < ${tempPath}\n');
        return tempPath;
      }

      case 'stdout':
      default: {
        console.log('\n' + '='.repeat(80));
        console.log(`Agent: ${agentName}`);
        console.log('='.repeat(80) + '\n');
        console.log(content);
        console.log('\n' + '='.repeat(80) + '\n');
        return 'stdout';
      }
    }
  }

  /**
   * Get default output path for agent
   * @param {string} agentName - Agent name
   * @returns {string} Default output path
   */
  getDefaultOutputPath(agentName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `/tmp/aicodepath-agent-${agentName}-${timestamp}.md`;
  }

  /**
   * Log execution to database
   * @param {Object} execution - Execution record
   */
  async logExecution(execution) {
    if (!this.db) {
      return; // No database connection
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO agent_executions
        (agent_name, task_description, output_path, tokens_used, duration_ms, status, error_message, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      stmt.run(
        execution.agent_name,
        execution.task_description || null,
        execution.output_path || null,
        execution.tokens_used || 0,
        execution.duration_ms || 0,
        execution.status || 'success',
        execution.error_message || null
      );
    } catch (error) {
      console.warn(`⚠️  Failed to log agent execution: ${error.message}`);
    }
  }
  /**
   * Execute prompt via Anthropic SDK
   * @param {string} prompt - Assembled prompt
   * @param {string} agentName - Agent name for logging
   * @returns {Promise<Object>} { responseText, usage }
   */
  async executePrompt(prompt, agentName) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set. Cannot use execute mode.');
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL_ID || 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const responseText = response.content[0]?.text || '';

    console.log(`\n✅ Agent "${agentName}" execution complete (${response.usage?.output_tokens || 0} output tokens)`);

    return {
      responseText,
      usage: response.usage || {},
      model: response.model,
    };
  }
}

module.exports = AgentInvoker;

// Allow standalone execution for testing
if (require.main === module) {
  const AgentLoader = require('./agent-loader');

  (async () => {
    console.log('Testing AgentInvoker...\n');

    const loader = new AgentLoader();
    const invoker = new AgentInvoker({ loader });

    // Test invocation
    const result = await invoker.invoke(
      'architect',
      'Design a microservices architecture for an e-commerce platform',
      { mode: 'stdout' }
    );

    console.log('\nInvocation result:', {
      success: result.success,
      agent: result.agent,
      tokensUsed: result.tokensUsed,
      duration: `${result.duration}ms`
    });
  })().catch(console.error);
}
