#!/usr/bin/env node

/**
 * AICodePath CLI - Unified command-line interface
 *
 * Provides both 'aicodepath' and 'acp' commands with subcommands:
 * - init: Initialize knowledge base
 * - agent: Agent management (list, show, invoke, search, stats)
 * - dashboard: Launch dashboard
 * - preflight: Run preflight checks
 * - validate: Run validators
 * - context: Context management
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');

// Version from package.json
const packageJson = require(path.join(__dirname, '..', 'package.json'));

program
  .name('aicodepath')
  .description('AICodePath - AI-Guided Development Path for Claude Code')
  .version(packageJson.version);

// Init command
program
  .command('init')
  .description('Initialize AICodePath knowledge base')
  .action(async () => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'init.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: init command not found. Make sure AICodePath is fully installed.');
        process.exit(1);
      }
      const initCommand = require(commandPath);
      await initCommand();
    } catch (error) {
      console.error('❌ Init failed:', error.message);
      process.exit(1);
    }
  });

// Agent command
program
  .command('agent <action> [agentName]')
  .description('Agent management: list, show <name>, invoke <name>, search <query>, stats, audit <name|all>')
  .option('-n, --name <name>', 'Agent name')
  .option('-t, --task <description>', 'Task description')
  .option('-o, --output <path>', 'Output file path')
  .option('--check-wiring', 'Check wiring completeness (audit mode only)')
  .option('--format <format>', 'Output format: text, json, github-actions (audit mode)', 'text')
  .action(async (action, agentName, options) => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'agent.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: agent command not found. Run Phase 2 implementation first.');
        process.exit(1);
      }
      // Forward positional agentName into options so agent.js can use it
      if (agentName && !options.name) options.name = agentName;
      const agentCommand = require(commandPath);
      await agentCommand(action, options);
    } catch (error) {
      console.error('❌ Agent command failed:', error.message);
      process.exit(1);
    }
  });

// Dashboard command
program
  .command('dashboard')
  .description('Launch AICodePath dashboard')
  .option('-p, --port <number>', 'Dashboard port (default: 3899)', '3899')
  .action(async (options) => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'dashboard.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: dashboard command not found. Run Phase 5 implementation first.');
        process.exit(1);
      }
      const dashboardCommand = require(commandPath);
      await dashboardCommand(options);
    } catch (error) {
      console.error('❌ Dashboard failed:', error.message);
      process.exit(1);
    }
  });

// Generate command
program
  .command('generate <type>')
  .description('Generate diagrams from code (er, class, c4, flowchart)')
  .option('-f, --files <files...>', 'Source files to analyze')
  .option('-u, --unit <unit>', 'Unit name')
  .option('-o, --output <path>', 'Output file path')
  .action(async (type, options) => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'generate.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: generate command not found. Make sure AICodePath is fully installed.');
        process.exit(1);
      }
      const generateCommand = require(commandPath);
      await generateCommand(type, options);
    } catch (error) {
      console.error('❌ Generate failed:', error.message);
      process.exit(1);
    }
  });

// Preflight command
program
  .command('preflight')
  .description('Run preflight checks (plugins, MCP servers, environment)')
  .action(async () => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'preflight.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: preflight command not found. Make sure AICodePath is fully installed.');
        process.exit(1);
      }
      const preflightCommand = require(commandPath);
      await preflightCommand();
    } catch (error) {
      console.error('❌ Preflight failed:', error.message);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Run validators on current code')
  .option('-f, --files <patterns>', 'File patterns to validate (comma-separated)')
  .action(async (options) => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'validate.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: validate command not found. Make sure AICodePath is fully installed.');
        process.exit(1);
      }
      const validateCommand = require(commandPath);
      await validateCommand(options);
    } catch (error) {
      console.error('❌ Validate failed:', error.message);
      process.exit(1);
    }
  });

// Context command
program
  .command('context <action>')
  .description('Context management: status, config, compact')
  .action(async (action, options) => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'context.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: context command not found. Run Phase 3 implementation first.');
        process.exit(1);
      }
      const contextCommand = require(commandPath);
      await contextCommand(action, options);
    } catch (error) {
      console.error('❌ Context command failed:', error.message);
      process.exit(1);
    }
  });

// Features command
program
  .command('features [subcommand] [name]')
  .description('Feature flag management: list, enable <name>, disable <name>, info <name>')
  .action(async (subcommand, name) => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'features.js');
      const featuresCommand = require(commandPath);
      const args = [subcommand, name].filter(Boolean);
      await featuresCommand(args);
    } catch (error) {
      console.error('❌ Features command failed:', error.message);
      process.exit(1);
    }
  });

// Orchestrate command
program
  .command('orchestrate [action]')
  .description('Multi-agent orchestration: plan, execute, status, merge')
  .option('-s, --session <id>', 'Session ID')
  .option('-m, --max-agents <n>', 'Maximum concurrent agents', '3')
  .action(async (action, options) => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'orchestrate.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: orchestrate command not found.');
        process.exit(1);
      }
      const { handleCommand } = require(commandPath);
      const args = [action, options.session, options.maxAgents].filter(Boolean);
      await handleCommand(args);
    } catch (error) {
      console.error('❌ Orchestrate failed:', error.message);
      process.exit(1);
    }
  });

// Phase-state command
program
  .command('phase-state [subcommand]')
  .description('Phase state machine: status, gates, transition, history')
  .option('-p, --phase <name>', 'Phase name for transition')
  .option('-g, --gate <name>', 'Gate name to register')
  .action(async (subcommand, options) => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'phase-state.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: phase-state command not found.');
        process.exit(1);
      }
      const phaseState = require(commandPath);
      const cmd = subcommand || 'status';
      if (cmd === 'status' && phaseState.showStatus) await phaseState.showStatus();
      else if (cmd === 'gates' && phaseState.showGates) await phaseState.showGates();
      else if (cmd === 'history' && phaseState.showHistory) await phaseState.showHistory();
      else if (cmd === 'transition' && phaseState.transition) await phaseState.transition(options.phase);
      else if (cmd === 'register-gate' && phaseState.registerGate) await phaseState.registerGate(options.gate);
      else {
        console.error(`❌ Unknown subcommand: ${cmd}. Use status, gates, transition, history.`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Phase-state failed:', error.message);
      process.exit(1);
    }
  });

// Init-db command
program
  .command('init-db')
  .description('Initialize the SQLite knowledge base (cross-platform replacement for init-knowledge-base.sh)')
  .action(async () => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'init-db.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: init-db command not found. Make sure AICodePath is fully installed.');
        process.exit(1);
      }
      const initDbCommand = require(commandPath);
      await initDbCommand();
    } catch (error) {
      console.error('❌ init-db failed:', error.message);
      process.exit(1);
    }
  });

// Update command
program
  .command('update [target-path]')
  .description('Update AICodePath in a target project (preserves project customizations)')
  .option('-s, --source <path>', 'Framework source path (auto-detected from this binary)')
  .option('-n, --dry-run', 'Show what would change without making changes')
  .action(async (targetPath, options) => {
    try {
      await require(path.join(__dirname, '..', 'commands', 'update.js'))(targetPath, options);
    } catch (err) { console.error('❌ Update failed:', err.message); process.exit(1); }
  });

// Checkpoint command
program
  .command('checkpoint <action> [args...]')
  .description('Checkpoint management: create, list, show <id>, compare <id1> <id2>')
  .option('-m, --message <message>', 'Checkpoint message (for create)')
  .option('--phase <phase>', 'Phase label (for create or list filter)')
  .option('--stage <stage>', 'Stage label (for create)')
  .option('--limit <n>', 'Max results (for list)')
  .action(async (action, args, options) => {
    try {
      const commandPath = path.join(__dirname, '..', 'commands', 'checkpoint.js');
      if (!fs.existsSync(commandPath)) {
        console.error('❌ Error: checkpoint command not found.');
        process.exit(1);
      }
      // Merge positional args into options for show/compare
      const merged = { ...options, id: args[0], id1: args[0], id2: args[1] };
      const checkpointCommand = require(commandPath);
      await checkpointCommand(action, merged);
    } catch (error) {
      console.error('❌ Checkpoint failed:', error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
