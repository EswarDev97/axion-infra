#!/usr/bin/env node
/**
 * AICodePath Phase State CLI Command
 *
 * Manage phase transitions and gates through the command line.
 *
 * Usage:
 *   aicodepath phase-state <command> [options]
 */

const SessionStateManager = require('../lib/session-state-manager');
const { GATE_DEFINITIONS } = require('../lib/phase-state-machine');
const logger = require('../lib/logger');

/**
 * Format gate details for display
 */
function formatGateDetails(gateDetails) {
  const lines = [];

  for (const detail of gateDetails) {
    const { name, definition, status } = detail;

    lines.push(`\n### ${name}`);
    lines.push(`**Description:** ${definition.description}`);

    if (definition.checks && definition.checks.length > 0) {
      lines.push('\n**Required Checks:**');
      definition.checks.forEach(check => {
        lines.push(`  - ${check}`);
      });
    }

    if (status) {
      lines.push(`\n**Status:** ${status.passed ? '✓ PASSED' : '✗ NOT VALIDATED'}`);
      if (status.passed && status.details) {
        lines.push(`**Details:** ${JSON.stringify(status.details, null, 2)}`);
      }
      if (status.timestamp) {
        lines.push(`**Last Validated:** ${status.timestamp}`);
      }
    } else {
      lines.push('\n**Status:** ⚠ NOT REGISTERED');
    }
  }

  return lines.join('\n');
}

/**
 * Show current phase and available transitions
 */
function showStatus(manager) {
  const machine = manager.getStateMachine();
  const currentPhase = machine.getCurrentPhase();
  const transitions = manager.getAvailablePhaseTransitions();

  console.log('\n=== Phase State Status ===\n');
  console.log(`**Current Phase:** ${currentPhase}\n`);

  if (transitions.length === 0) {
    console.log('**No available transitions from this phase.**\n');
    return;
  }

  console.log('**Available Transitions:**\n');

  for (const transition of transitions) {
    const symbol = transition.satisfied ? '✓' : '✗';
    const status = transition.satisfied ? 'READY' : 'BLOCKED';

    console.log(`${symbol} **${transition.target}** (${status})`);

    if (transition.gates.length === 0) {
      console.log('  No gates required\n');
      continue;
    }

    console.log(`  Required gates: ${transition.gates.length}`);

    if (transition.missingGates.length > 0) {
      console.log(`  Missing: ${transition.missingGates.join(', ')}`);
    }

    if (transition.failedGates.length > 0) {
      console.log(`  Failed: ${transition.failedGates.join(', ')}`);
    }

    console.log('');
  }
}

/**
 * Show detailed gate information
 */
function showGates(manager, targetPhase = null) {
  const machine = manager.getStateMachine();

  if (targetPhase) {
    // Show gates for specific transition
    const transitions = manager.getAvailablePhaseTransitions();
    const transition = transitions.find(t => t.target === targetPhase.toUpperCase());

    if (!transition) {
      console.error(`Error: Invalid transition to ${targetPhase}`);
      process.exit(1);
    }

    console.log(`\n=== Gates for ${machine.getCurrentPhase()} → ${targetPhase.toUpperCase()} ===\n`);

    if (transition.gates.length === 0) {
      console.log('No gates required for this transition.\n');
      return;
    }

    console.log(`**Status:** ${transition.satisfied ? '✓ All gates satisfied' : '✗ Gates not satisfied'}\n`);
    console.log(formatGateDetails(transition.gateDetails));
  } else {
    // Show all gate definitions
    console.log('\n=== All Gate Definitions ===\n');

    for (const [name, def] of Object.entries(GATE_DEFINITIONS)) {
      console.log(`### ${name}`);
      console.log(`**Description:** ${def.description}`);

      if (def.checks && def.checks.length > 0) {
        console.log('\n**Required Checks:**');
        def.checks.forEach(check => {
          console.log(`  - ${check}`);
        });
      }

      const status = machine.getGateStatus(name);
      if (status) {
        console.log(`\n**Status:** ${status.passed ? '✓ PASSED' : '✗ FAILED'}`);
        console.log(`**Last Validated:** ${status.timestamp}`);
      } else {
        console.log('\n**Status:** ⚠ NOT REGISTERED');
      }

      console.log('');
    }
  }
}

/**
 * Register a gate result
 */
function registerGate(manager, gateName, passed, detailsJson = null) {
  let details = {};

  if (detailsJson) {
    try {
      details = JSON.parse(detailsJson);
    } catch (error) {
      console.error('Error: Invalid JSON for gate details');
      process.exit(1);
    }
  }

  const result = manager.registerGate(gateName, passed, details);

  console.log(`\n✓ Gate registered: ${result.gateName}`);
  console.log(`  Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Timestamp: ${result.timestamp}\n`);

  if (details && Object.keys(details).length > 0) {
    console.log('  Details:');
    console.log(JSON.stringify(details, null, 2));
    console.log('');
  }
}

/**
 * Attempt phase transition
 */
function transition(manager, targetPhase) {
  const machine = manager.getStateMachine();
  const currentPhase = machine.getCurrentPhase();

  // Check if transition is allowed
  const canTransition = manager.canTransitionPhase(targetPhase);

  console.log(`\n=== Phase Transition: ${currentPhase} → ${targetPhase.toUpperCase()} ===\n`);

  if (!canTransition.allowed) {
    console.log(`✗ Transition BLOCKED\n`);
    console.log(`**Reason:** ${canTransition.reason}\n`);

    if (canTransition.missingGates.length > 0) {
      console.log('**Missing Gates:**');
      canTransition.missingGates.forEach(gate => {
        const def = GATE_DEFINITIONS[gate];
        console.log(`  - ${gate}: ${def?.description || 'Unknown gate'}`);
      });
      console.log('');
    }

    if (canTransition.failedGates.length > 0) {
      console.log('**Failed Gates:**');
      canTransition.failedGates.forEach(gate => {
        const def = GATE_DEFINITIONS[gate];
        console.log(`  - ${gate}: ${def?.description || 'Unknown gate'}`);
      });
      console.log('');
    }

    console.log('**Remediation:**');
    console.log('Register the required gates before attempting this transition.\n');
    console.log('Example:');
    console.log(`  aicodepath phase-state register ${canTransition.missingGates[0] || canTransition.failedGates[0]} true '{"key":"value"}'\n`);

    process.exit(1);
  }

  // Perform transition
  const result = manager.transitionPhase(targetPhase);

  if (result.success) {
    console.log(`✓ Transition SUCCESSFUL\n`);
    console.log(`**Previous Phase:** ${result.previousPhase}`);
    console.log(`**Current Phase:** ${result.phase}`);
    console.log(`**Timestamp:** ${result.timestamp}\n`);

    if (result.checkpoint_id) {
      console.log(`**Checkpoint Created:** ${result.checkpoint_id}\n`);
    }
  } else {
    console.log(`✗ Transition FAILED\n`);
    console.log(`**Reason:** ${result.reason}\n`);
    process.exit(1);
  }
}

/**
 * Show transition history
 */
function showHistory(manager) {
  const machine = manager.getStateMachine();
  const history = machine.getTransitionHistory();

  console.log('\n=== Phase Transition History ===\n');

  if (history.length === 0) {
    console.log('No transitions recorded.\n');
    return;
  }

  history.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.from} → ${entry.to}`);
    console.log(`   Timestamp: ${entry.timestamp}`);

    const gateCount = Object.keys(entry.gateResults || {}).length;
    if (gateCount > 0) {
      console.log(`   Gates active: ${gateCount}`);
    }

    console.log('');
  });

  console.log(`**Total Transitions:** ${history.length}\n`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
AICodePath Phase State Manager
===============================

Manage phase transitions and validation gates.

USAGE:
  aicodepath phase-state <command> [options]

COMMANDS:
  status                             Show current phase and available transitions
  gates [target-phase]               Show gate definitions (all or for specific transition)
  register <gate> <passed> [details] Register gate validation result
                                     - gate: Gate name (e.g., environment-validated)
                                     - passed: true or false
                                     - details: Optional JSON string with details
  transition <target-phase>          Attempt phase transition
  history                            Show phase transition history

EXAMPLES:
  # Show current status
  aicodepath phase-state status

  # Show gates for transition to INCEPTION
  aicodepath phase-state gates INCEPTION

  # Register a passing gate
  aicodepath phase-state register environment-validated true '{"nodeVersion":"18.0.0"}'

  # Register a failing gate
  aicodepath phase-state register tests-passed false '{"failed":5}'

  # Attempt transition
  aicodepath phase-state transition INCEPTION

  # Show history
  aicodepath phase-state history

GATE NAMES:
  environment-validated              Environment checks (Node.js, git, DB)
  requirements-approved              Requirements documentation validated
  tests-passed                       Test suite execution successful
  quality-gates-passed               Code quality gates satisfied
  architect-approval                 Architecture decision approval (rollback)
  deployment-verified                Deployment validation successful
  bug-report-filed                   Bug report documented (rollback)

PHASE TRANSITIONS:
  IDLE → PRE-FLIGHT                  (no gates)
  PRE-FLIGHT → INCEPTION             (environment-validated)
  INCEPTION → CONSTRUCTION           (requirements-approved)
  CONSTRUCTION → OPERATIONS          (tests-passed, quality-gates-passed)
  OPERATIONS → COMPLETED             (deployment-verified)
  CONSTRUCTION → INCEPTION           (architect-approval)
  OPERATIONS → CONSTRUCTION          (bug-report-filed)

For more information, see:
  .aicodepath/lib/PHASE-STATE-MACHINE-README.md
    `);
    process.exit(0);
  }

  const manager = new SessionStateManager();

  try {
    switch (command) {
      case 'status':
        showStatus(manager);
        break;

      case 'gates':
        showGates(manager, args[1] || null);
        break;

      case 'register': {
        const gateName = args[1];
        const passedStr = args[2];
        const detailsJson = args[3] || null;

        if (!gateName || !passedStr) {
          console.error('Error: gate name and passed status required');
          console.log('Usage: aicodepath phase-state register <gate> <true|false> [details-json]');
          process.exit(1);
        }

        const passed = passedStr.toLowerCase() === 'true';
        registerGate(manager, gateName, passed, detailsJson);
        break;
      }

      case 'transition': {
        const targetPhase = args[1];

        if (!targetPhase) {
          console.error('Error: target phase required');
          console.log('Usage: aicodepath phase-state transition <target-phase>');
          process.exit(1);
        }

        transition(manager, targetPhase);
        break;
      }

      case 'history':
        showHistory(manager);
        break;

      default:
        console.error(`Error: Unknown command '${command}'`);
        console.log('Run "aicodepath phase-state help" for usage information.');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Phase state command failed', {
      context: 'phase-state-cli',
      command,
      error: error.message,
      stack: error.stack
    });
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  } finally {
    manager.close();
  }
}

module.exports = {
  showStatus,
  showGates,
  registerGate,
  transition,
  showHistory
};
