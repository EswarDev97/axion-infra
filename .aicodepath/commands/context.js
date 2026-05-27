#!/usr/bin/env node

/**
 * Context Command - Manage context window usage and optimization
 *
 * Commands:
 * - status: Show current context usage statistics
 * - health: Show context health score
 * - config: Display or edit configuration
 * - clear: Clear old usage records
 * - stats <agent>: Show usage statistics for specific agent
 *
 * @module commands/context
 */

const ContextManager = require('../lib/context-manager');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const ErrorHandler = require('../lib/error-handler');
const { FileSystemError } = require('../lib/errors');

class ContextCommand {
  constructor() {
    this.manager = new ContextManager();
  }

  /**
   * Execute context command
   * @param {string} action - Command action
   * @param {Object} options - Command options
   */
  async execute(action, options = {}) {
    switch (action) {
      case 'status':
        await this.showStatus(options);
        break;
      case 'health':
        await this.showHealth();
        break;
      case 'config':
        await this.showConfig(options);
        break;
      case 'edit':
        await this.editConfig();
        break;
      case 'clear':
        await this.clearOldRecords(options.days || 30);
        break;
      case 'stats':
        await this.showAgentStats(options.agent);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Show current context status
   */
  async showStatus(options = {}) {
    await this.manager.loadConfig();

    console.log('\n📊 Context Management Status\n');
    console.log('='.repeat(80));

    // Configuration status
    const config = this.manager.config;
    console.log('\nConfiguration:');
    console.log(`  Enabled:          ${config.enabled ? '✅ Yes' : '❌ No'}`);
    console.log(`  Strategy:         ${config.strategy}`);
    console.log(`  Warning Threshold: ${(config.thresholds.warning * 100).toFixed(0)}%`);
    console.log(`  Critical Threshold: ${(config.thresholds.critical * 100).toFixed(0)}%`);
    console.log(`  Maximum Threshold: ${(config.thresholds.maximum * 100).toFixed(0)}%`);

    console.log('\nStrategies:');
    console.log(`  Priority Loading: ${config.strategies.priority_loading.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  Auto-Compaction:  ${config.strategies.compaction.enabled ? '✅ Enabled' : '❌ Disabled'} (trigger at ${(config.strategies.compaction.trigger_at * 100).toFixed(0)}%)`);
    console.log(`  Caching:          ${config.strategies.caching.enabled ? '✅ Enabled' : '❌ Disabled'}`);

    console.log('\nModel Limits:');
    Object.entries(config.model_limits).forEach(([model, limit]) => {
      console.log(`  ${model.padEnd(25)} ${limit.toLocaleString().padStart(10)} tokens`);
    });

    // Usage statistics
    console.log('\n' + '-'.repeat(80));
    console.log('Recent Usage:\n');

    const stats = await this.manager.getUsageStats();
    if (stats.length === 0) {
      console.log('  No usage data available yet.\n');
    } else {
      const topAgents = stats.slice(0, 10);

      console.log('  Agent                      Invocations    Total Tokens    Avg Tokens    Compactions');
      console.log('  ' + '-'.repeat(76));

      topAgents.forEach(stat => {
        const name = stat.agent_name.padEnd(25);
        const invocations = stat.total_invocations.toString().padStart(10);
        const total = stat.total_tokens.toLocaleString().padStart(15);
        const avg = Math.round(stat.avg_tokens).toLocaleString().padStart(12);
        const compactions = stat.compactions_triggered.toString().padStart(12);

        console.log(`  ${name} ${invocations}    ${total}    ${avg}    ${compactions}`);
      });

      console.log('');
    }

    // Context health
    const health = await this.manager.getContextHealth();
    if (health.total_invocations > 0) {
      console.log('-'.repeat(80));
      console.log('Overall Health:\n');

      const healthEmoji = health.health_status === 'healthy' ? '🟢' :
                         health.health_status === 'moderate' ? '🟡' : '🔴';

      console.log(`  ${healthEmoji} Health Score: ${health.health_score}/100 (${health.health_status})`);
      console.log(`  Total Invocations: ${health.total_invocations.toLocaleString()}`);
      console.log(`  Total Tokens: ${health.total_tokens.toLocaleString()}`);
      console.log(`  Status Breakdown:`);
      console.log(`    🟢 Safe:     ${health.safe_count || 0}`);
      console.log(`    🟡 Warning:  ${health.warning_count || 0}`);
      console.log(`    🟠 Critical: ${health.critical_count || 0}`);
      console.log(`    🔴 Exceeded: ${health.exceeded_count || 0}`);
      console.log(`  Auto-Compactions Triggered: ${health.total_compactions}`);
      console.log('');
    }

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Show context health
   */
  async showHealth() {
    const health = await this.manager.getContextHealth();

    console.log('\n🏥 Context Health Report\n');
    console.log('='.repeat(80));

    if (health.total_invocations === 0) {
      console.log('\nNo usage data available yet.');
      console.log('Health score will be calculated after agent invocations.\n');
      console.log('='.repeat(80) + '\n');
      return;
    }

    const healthEmoji = health.health_status === 'healthy' ? '🟢' :
                       health.health_status === 'moderate' ? '🟡' : '🔴';

    console.log(`\n${healthEmoji} Overall Health: ${health.health_score}/100 (${health.health_status.toUpperCase()})`);
    console.log(`\nTotal Invocations: ${health.total_invocations.toLocaleString()}`);
    console.log(`Average Tokens per Invocation: ${Math.round(health.avg_tokens).toLocaleString()}`);

    console.log('\nStatus Distribution:');
    const total = health.total_invocations;
    console.log(`  🟢 Safe:     ${health.safe_count || 0} (${Math.round(((health.safe_count || 0) / total) * 100)}%)`);
    console.log(`  🟡 Warning:  ${health.warning_count || 0} (${Math.round(((health.warning_count || 0) / total) * 100)}%)`);
    console.log(`  🟠 Critical: ${health.critical_count || 0} (${Math.round(((health.critical_count || 0) / total) * 100)}%)`);
    console.log(`  🔴 Exceeded: ${health.exceeded_count || 0} (${Math.round(((health.exceeded_count || 0) / total) * 100)}%)`);

    console.log(`\nAuto-Compactions: ${health.total_compactions}`);

    // Recommendations
    console.log('\nRecommendations:');
    if (health.health_status === 'healthy') {
      console.log('  ✅ Context usage is healthy. Continue current practices.');
    } else if (health.health_status === 'moderate') {
      console.log('  ⚠️  Consider enabling auto-compaction if not already enabled.');
      console.log('  ⚠️  Review agents with frequent critical/exceeded statuses.');
    } else {
      console.log('  🔴 Context usage is concerning. Immediate action recommended:');
      console.log('     - Enable auto-compaction (acp context config)');
      console.log('     - Review large agents and reduce context budgets');
      console.log('     - Clear old usage records (acp context clear)');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Show configuration
   */
  async showConfig(options = {}) {
    await this.manager.loadConfig();

    console.log('\n⚙️  Context Management Configuration\n');
    console.log('='.repeat(80));
    console.log('\nCurrent configuration:\n');
    console.log(JSON.stringify(this.manager.config, null, 2));
    console.log('\n' + '='.repeat(80));
    console.log(`\nConfig file: ${this.manager.configPath}`);
    console.log('Run: acp context edit - to edit configuration\n');
  }

  /**
   * Edit configuration
   */
  async editConfig() {
    const editor = process.env.EDITOR || 'nano';

    console.log(`\n📝 Opening configuration in ${editor}...`);
    console.log(`File: ${this.manager.configPath}\n`);

    const child = spawn(editor, [this.manager.configPath], {
      stdio: 'inherit'
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('\n✅ Configuration saved.');
        console.log('Run: acp context status - to verify changes\n');
      } else {
        console.error('\n❌ Editor exited with error.\n');
      }
    });
  }

  /**
   * Show agent-specific statistics
   */
  async showAgentStats(agentName) {
    if (!agentName) {
      throw new Error('Agent name required. Use: acp context stats <agent>');
    }

    const stats = await this.manager.getUsageStats(agentName);

    console.log(`\n📈 Context Usage Statistics: ${agentName}\n`);
    console.log('='.repeat(80));

    if (stats.length === 0) {
      console.log(`\nNo usage data found for agent: ${agentName}\n`);
      console.log('='.repeat(80) + '\n');
      return;
    }

    const stat = stats[0];

    console.log(`\nInvocations:       ${stat.total_invocations.toLocaleString()}`);
    console.log(`Total Tokens:      ${stat.total_tokens.toLocaleString()}`);
    console.log(`Average Tokens:    ${Math.round(stat.avg_tokens).toLocaleString()}`);
    console.log(`Maximum Tokens:    ${stat.max_tokens.toLocaleString()}`);
    console.log(`Compactions:       ${stat.compactions_triggered}`);

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Clear old usage records
   */
  async clearOldRecords(days) {
    console.log(`\n🗑️  Clearing context usage records older than ${days} days...\n`);

    const deleted = await this.manager.clearOldRecords(days);

    console.log(`✅ Deleted ${deleted} old record(s).\n`);
  }

  /**
   * Show help message
   */
  showHelp() {
    console.log(`
Usage: aicodepath context <action> [options]

Actions:
  status              Show current context usage status
  health              Show context health score and recommendations
  config              Display current configuration
  edit                Edit configuration file
  stats <agent>       Show statistics for specific agent
  clear [--days N]    Clear usage records older than N days (default: 30)

Examples:
  acp context status
  acp context health
  acp context config
  acp context edit
  acp context stats backend-architect
  acp context clear --days 60
`);
  }
}

// Implementation function for CLI integration
async function contextCommandImpl(action, options = {}) {
  const command = new ContextCommand();
  await command.execute(action, options);
}

// Export wrapped version for CLI use
module.exports = ErrorHandler.wrapCLICommand('context', contextCommandImpl);

// Export class for testing
module.exports.ContextCommand = ContextCommand;

// Allow standalone execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args[0];

  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      options.days = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--agent' && args[i + 1]) {
      options.agent = args[i + 1];
      i++;
    } else if (!args[i].startsWith('--')) {
      // Positional argument for agent name
      if (action === 'stats') {
        options.agent = args[i];
      }
    }
  }

  module.exports(action, options);
}
