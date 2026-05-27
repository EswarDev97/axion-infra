#!/usr/bin/env node

/**
 * Agent Command - Manage and invoke AI agents
 *
 * Commands:
 * - list: List all available agents
 * - show <name>: Show agent details
 * - invoke <name> --task <description>: Invoke an agent
 * - search <keyword>: Search agents by capability
 * - stats: Show agent usage statistics
 *
 * @module commands/agent
 */

const AgentLoader = require('../lib/agent-loader');
const AgentRegistry = require('../lib/agent-registry');
const AgentInvoker = require('../lib/agent-invoker');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const pathResolver = require('../lib/path-resolver');
const ErrorHandler = require('../lib/error-handler');
const { DatabaseError, FileSystemError } = require('../lib/errors');
const { quickWiringCheck } = require('../hooks/lib/agent-wiring-check');

class AgentCommand {
  constructor() {
    this.loader = new AgentLoader();
    this.registry = new AgentRegistry();
    this.invoker = new AgentInvoker({ loader: this.loader });
    const projectRoot = pathResolver.findProjectRoot();
    this.dbPath = path.join(projectRoot, 'aicodepath-docs', 'aicodepath.db');
  }

  /**
   * Execute agent command
   * @param {string} action - Command action (list, show, invoke, search, stats)
   * @param {Object} options - Command options
   */
  async execute(action, options = {}) {
    // Load all agents into registry
    const agents = await this.loader.loadAll();
    this.registry.register(agents);

    switch (action) {
      case 'list':
        await this.listAgents();
        break;
      case 'show':
        await this.showAgent(options.name);
        break;
      case 'invoke':
        await this.invokeAgent(options.name, options.task, options);
        break;
      case 'search':
        await this.searchAgents(options.keyword);
        break;
      case 'stats':
        await this.showStats();
        break;
      case 'audit':
        await this.auditAgent(options.name, options);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * List all available agents
   */
  async listAgents() {
    const agents = this.registry.getAll();
    const stats = this.registry.getStats();

    console.log('\n📋 Available Agents\n');
    console.log(`Total: ${stats.total_agents} agents\n`);

    // Group by category
    const byCategory = {};
    agents.forEach(agent => {
      const category = agent.category || 'Other';
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(agent);
    });

    // Display by category
    for (const [category, categoryAgents] of Object.entries(byCategory)) {
      console.log(`\n${category}:`);
      categoryAgents.forEach(agent => {
        const priority = agent.priority === 'critical' ? '🔴' :
                        agent.priority === 'high' ? '🟡' : '🟢';
        console.log(`  ${priority} ${agent.name}`);
        console.log(`     ${agent.capabilities.slice(0, 3).join(', ')}...`);
      });
    }

    console.log('\n');
    console.log('Use: acp agent show <name> to see details');
    console.log('Use: acp agent search <keyword> to find agents\n');
  }

  /**
   * Show detailed information about an agent
   * @param {string} name - Agent name
   */
  async showAgent(name) {
    if (!name) {
      throw new Error('Agent name required. Use: acp agent show <name>');
    }

    const agent = this.registry.findByName(name);
    if (!agent) {
      const agents = this.registry.getAll();
      const availableNames = agents.map(a => a.name).join(', ');
      throw new Error(`Agent not found: ${name}\n\nAvailable agents: ${availableNames}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Agent: ${agent.name}`);
    console.log('='.repeat(80) + '\n');
    console.log(`Category:        ${agent.category}`);
    console.log(`Priority:        ${agent.priority}`);
    console.log(`Context Budget:  ${agent.context_budget} tokens`);
    console.log(`\nCapabilities:`);
    agent.capabilities.forEach(cap => console.log(`  - ${cap}`));
    console.log(`\nTriggers:`);
    agent.triggers.forEach(trigger => console.log(`  - ${trigger}`));
    console.log('\n' + '-'.repeat(80));
    console.log('Guidelines:');
    console.log('-'.repeat(80) + '\n');
    console.log(agent.guidelines);
    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Invoke an agent with a task
   * @param {string} name - Agent name
   * @param {string} task - Task description
   * @param {Object} options - Invocation options
   */
  async invokeAgent(name, task, options = {}) {
    if (!name) {
      throw new Error('Agent name required. Use: acp agent invoke <name> --task "description"');
    }

    if (!task) {
      throw new Error('Task required. Use: acp agent invoke <name> --task "description"');
    }

    console.log(`\n🤖 Invoking agent: ${name}`);
    console.log(`📝 Task: ${task}\n`);

    const mode = options.output ? 'file' : 'stdout';
    const result = await this.invoker.invoke(name, task, {
      mode,
      output: options.output,
      context: options.context || {}
    });

    if (result.success) {
      console.log(`\n✅ Agent execution completed`);
      console.log(`   Output: ${result.outputPath}`);
      console.log(`   Tokens: ${result.tokensUsed}`);
      console.log(`   Duration: ${result.duration}ms\n`);
    }
  }

  /**
   * Search agents by capability keyword
   * @param {string} keyword - Search keyword
   */
  async searchAgents(keyword) {
    if (!keyword) {
      throw new Error('Keyword required. Use: acp agent search <keyword>');
    }

    const results = this.registry.findByCapability(keyword);

    console.log(`\n🔍 Search results for: "${keyword}"\n`);

    if (results.length === 0) {
      console.log('No agents found matching that keyword.\n');
      return;
    }

    console.log(`Found ${results.length} agent(s):\n`);
    results.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name} (${agent.category})`);
      console.log(`   Capabilities: ${agent.capabilities.join(', ')}`);
      console.log('');
    });

    console.log('Use: acp agent show <name> for details\n');
  }

  /**
   * Show agent usage statistics
   */
  async showStats() {
    const stats = this.registry.getStats();

    console.log('\n📊 Agent System Statistics\n');
    console.log(`Total Agents:        ${stats.total_agents}`);
    console.log(`Categories:          ${stats.categories.join(', ')}`);
    console.log(`Capabilities Indexed: ${stats.capabilities_indexed}`);
    console.log(`Keywords Indexed:    ${stats.keywords_indexed}`);

    // Get execution stats from database if available
    try {
      const db = new Database(this.dbPath, { readonly: true });

      const executions = db.prepare(`
        SELECT
          agent_name,
          COUNT(*) as total_executions,
          SUM(tokens_used) as total_tokens,
          AVG(duration_ms) as avg_duration,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as failed
        FROM agent_executions
        GROUP BY agent_name
        ORDER BY total_executions DESC
        LIMIT 10
      `).all();

      if (executions.length > 0) {
        console.log('\n📈 Top Agent Executions:\n');
        executions.forEach((exec, index) => {
          console.log(`${index + 1}. ${exec.agent_name}`);
          console.log(`   Executions: ${exec.total_executions} (${exec.successful} ✅, ${exec.failed} ❌)`);
          console.log(`   Tokens: ${exec.total_tokens.toLocaleString()}`);
          console.log(`   Avg Duration: ${Math.round(exec.avg_duration)}ms`);
          console.log('');
        });
      }

      db.close();
    } catch (error) {
      // Database not available or no executions yet - this is not critical
      console.log('\n(No execution history available yet)\n');
    }

    console.log('');
  }

  /**
   * Run deterministic wiring audit for one agent or all agents.
   * @param {string} name - Agent name (with aicodepath- prefix) or 'all'
   * @param {object} options - { checkWiring, format }
   */
  async auditAgent(name, options = {}) {
    const format = options.format || 'text';
    const root = pathResolver.findProjectRoot();

    // Collect agent names to check
    let agentNames;
    if (!name || name === 'all') {
      const agentsDir = path.join(root, '.aicodepath', 'agents');
      agentNames = fs.readdirSync(agentsDir)
        .filter(f => f.endsWith('.md'))
        .map(f => f.replace(/\.md$/, ''));
    } else {
      agentNames = [name];
    }

    let anyFailed = false;
    const results = [];

    for (const agentName of agentNames) {
      let result;
      try {
        result = quickWiringCheck(agentName);
      } catch (e) {
        result = { score: 0, max: 18, missing: ['agent-not-found'], details: {}, error: e.message };
        anyFailed = true;
      }

      const passed = result.score === result.max && !result.error;
      if (!passed) anyFailed = true;

      results.push({ name: agentName, ...result });

      if (format === 'github-actions') {
        if (!passed) {
          const missing = result.error ? result.error : result.missing.join(', ');
          console.log(`::error file=.aicodepath/agents/${agentName}.md::Wiring incomplete (${result.score}/${result.max}): ${missing}`);
        }
      } else if (format === 'json') {
        if (agentNames.length === 1) {
          // Single agent: emit JSON directly
          console.log(JSON.stringify({ name: agentName, ...result }));
        }
      } else {
        // text
        const status = passed ? '✅' : '❌';
        if (!passed || agentNames.length === 1) {
          console.log(`${status} ${agentName} — ${result.score}/${result.max}${result.missing.length ? ` (missing: ${result.missing.join(', ')})` : ''}`);
        }
      }
    }

    if (format === 'json' && agentNames.length > 1) {
      const summary = {
        total: agentNames.length,
        passed: results.filter(r => r.score === r.max).length,
        failed: results.filter(r => r.score !== r.max).length,
        results,
      };
      console.log(JSON.stringify(summary));
    } else if (format === 'text' && agentNames.length > 1) {
      const passCount = results.filter(r => r.score === r.max).length;
      console.log(`\nAudit complete: ${passCount}/${agentNames.length} agents fully wired`);
    }

    if (anyFailed) process.exit(1);
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log(`
Usage: aicodepath agent <action> [options]

Actions:
  list                  List all available agents
  show <name>           Show detailed agent information
  invoke <name>         Invoke an agent with a task
    --task <description>    Task description (required)
    --output <file>         Output file path (optional)
  search <keyword>      Search agents by capability
  stats                 Show agent usage statistics

Examples:
  acp agent list
  acp agent show backend-architect
  acp agent invoke code-reviewer --task "Review auth controller"
  acp agent search "database"
  acp agent stats
`);
  }
}

// Implementation function for CLI integration
async function agentCommandImpl(action, options = {}) {
  const command = new AgentCommand();
  await command.execute(action, options);
}

// Export wrapped version for CLI use
module.exports = ErrorHandler.wrapCLICommand('agent', agentCommandImpl);

// Export class for testing
module.exports.AgentCommand = AgentCommand;

// Allow standalone execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args[0];

  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--task' && args[i + 1]) {
      options.task = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      options.name = args[i + 1];
      i++;
    } else if (args[i] === '--check-wiring') {
      options.checkWiring = true;
    } else if (args[i] === '--format' && args[i + 1]) {
      options.format = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      // Positional argument for name or keyword
      if (action === 'show' || action === 'invoke') {
        options.name = args[i];
      } else if (action === 'search') {
        options.keyword = args[i];
      } else if (action === 'audit') {
        options.name = args[i];
      }
    }
  }

  module.exports(action, options);
}
