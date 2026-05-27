#!/usr/bin/env node
/**
 * Phase State Machine for AICodePath
 *
 * Formal state machine for phase transitions with validation gates.
 * Ensures phases can only transition when required gates pass.
 *
 * States: IDLE -> PRE-FLIGHT -> INCEPTION -> CONSTRUCTION -> OPERATIONS -> COMPLETED
 *
 * Features:
 * - Formal state transitions with gate validation
 * - Gate result tracking and management
 * - Serialization for checkpoint integration
 * - Forward and backward transitions
 * - Detailed gate status reporting
 *
 * @module phase-state-machine
 */

/**
 * Valid phase states
 */
const PHASES = {
  IDLE: 'IDLE',
  PRE_FLIGHT: 'PRE-FLIGHT',
  INCEPTION: 'INCEPTION',
  CONSTRUCTION: 'CONSTRUCTION',
  OPERATIONS: 'OPERATIONS',
  COMPLETED: 'COMPLETED',
};

/**
 * Phase transition definitions with required gates
 *
 * Each transition key is in format 'SOURCE->TARGET'
 * Each transition specifies gates that must pass before transition is allowed
 */
const TRANSITIONS = {
  'IDLE->PRE-FLIGHT': { gates: [] },
  'PRE-FLIGHT->INCEPTION': { gates: ['environment-validated'] },
  'INCEPTION->CONSTRUCTION': { gates: ['requirements-approved'] },
  'CONSTRUCTION->OPERATIONS': { gates: ['tests-passed', 'quality-gates-passed'] },
  'OPERATIONS->COMPLETED': { gates: ['deployment-verified'] },
  // Backward transitions
  'CONSTRUCTION->INCEPTION': { gates: ['architect-approval'] },
  'OPERATIONS->CONSTRUCTION': { gates: ['bug-report-filed'] },
};

/**
 * Gate definitions with descriptions
 */
const GATE_DEFINITIONS = {
  'environment-validated': {
    name: 'environment-validated',
    description: 'Environment validation checks (Node.js version, git, DB accessible)',
    checks: ['Node.js version compatible', 'Git installed', 'Database accessible'],
  },
  'requirements-approved': {
    name: 'requirements-approved',
    description: 'Requirements documentation validated',
    checks: ['Requirements document exists', 'Has acceptance criteria', 'Stakeholder approval'],
  },
  'tests-passed': {
    name: 'tests-passed',
    description: 'Test suite execution successful',
    checks: ['Last test run passed', 'Coverage above threshold', 'No test failures'],
  },
  'quality-gates-passed': {
    name: 'quality-gates-passed',
    description: 'Code quality gates satisfied',
    checks: ['No mock violations', 'Duplication below threshold', 'Linting passed'],
  },
  'architect-approval': {
    name: 'architect-approval',
    description: 'Architecture decision approval for rollback',
    checks: ['Architecture decision record exists', 'Rollback justified', 'Team consensus'],
  },
  'deployment-verified': {
    name: 'deployment-verified',
    description: 'Deployment validation successful',
    checks: ['Deployment artifact exists', 'Health check passed', 'Monitoring active'],
  },
  'bug-report-filed': {
    name: 'bug-report-filed',
    description: 'Bug report documented for regression',
    checks: ['Issue/bug document exists', 'References regression', 'Severity assessed'],
  },
};

/**
 * PhaseStateMachine - Manages phase transitions with gate validation
 */
class PhaseStateMachine {
  /**
   * Initialize state machine
   *
   * @param {string} currentPhase - Initial phase (default: IDLE)
   */
  constructor(currentPhase = 'IDLE') {
    this.currentPhase = this._normalizePhase(currentPhase);
    this.gateResults = {}; // { gateName: { passed, details, timestamp } }
    this.transitionHistory = []; // Track transition history
  }

  /**
   * Normalize phase name to match PHASES enum
   * @private
   */
  _normalizePhase(phase) {
    if (!phase) return PHASES.IDLE;

    const normalized = phase.toUpperCase().replace(/[-_\s]/g, '-');

    // Map common variations
    const phaseMap = {
      'IDLE': PHASES.IDLE,
      'PRE-FLIGHT': PHASES.PRE_FLIGHT,
      'PREFLIGHT': PHASES.PRE_FLIGHT,
      'INCEPTION': PHASES.INCEPTION,
      'CONSTRUCTION': PHASES.CONSTRUCTION,
      'OPERATIONS': PHASES.OPERATIONS,
      'COMPLETED': PHASES.COMPLETED,
    };

    return phaseMap[normalized] || phase;
  }

  /**
   * Get transition key for source and target phases
   * @private
   */
  _getTransitionKey(source, target) {
    return `${source}->${target}`;
  }

  /**
   * Check if a transition is valid
   * @private
   */
  _isValidTransition(targetPhase) {
    const key = this._getTransitionKey(this.currentPhase, targetPhase);
    return key in TRANSITIONS;
  }

  /**
   * Get required gates for a transition
   * @private
   */
  _getRequiredGates(targetPhase) {
    const key = this._getTransitionKey(this.currentPhase, targetPhase);
    const transition = TRANSITIONS[key];
    return transition ? transition.gates : null;
  }

  /**
   * Check if all required gates are satisfied
   * @private
   */
  _checkGates(requiredGates) {
    const missing = [];
    const failed = [];

    for (const gateName of requiredGates) {
      const gateStatus = this.gateResults[gateName];

      if (!gateStatus) {
        missing.push(gateName);
      } else if (!gateStatus.passed) {
        failed.push(gateName);
      }
    }

    return { missing, failed };
  }

  /**
   * Check if transition to target phase is allowed
   *
   * @param {string} targetPhase - Target phase to transition to
   * @returns {Object} - { allowed: boolean, missingGates: string[], failedGates: string[], reason: string }
   */
  canTransition(targetPhase) {
    const normalizedTarget = this._normalizePhase(targetPhase);

    // Check if this is a valid transition
    if (!this._isValidTransition(normalizedTarget)) {
      return {
        allowed: false,
        missingGates: [],
        failedGates: [],
        reason: `Invalid transition from ${this.currentPhase} to ${normalizedTarget}`,
      };
    }

    // Get required gates
    const requiredGates = this._getRequiredGates(normalizedTarget);

    // If no gates required, transition is allowed
    if (!requiredGates || requiredGates.length === 0) {
      return {
        allowed: true,
        missingGates: [],
        failedGates: [],
        reason: 'No gates required',
      };
    }

    // Check gate status
    const { missing, failed } = this._checkGates(requiredGates);

    if (missing.length > 0 || failed.length > 0) {
      return {
        allowed: false,
        missingGates: missing,
        failedGates: failed,
        reason: `Gates not satisfied: ${[...missing, ...failed].join(', ')}`,
      };
    }

    return {
      allowed: true,
      missingGates: [],
      failedGates: [],
      reason: 'All gates satisfied',
    };
  }

  /**
   * Attempt transition to target phase
   *
   * @param {string} targetPhase - Target phase to transition to
   * @returns {Object} - { success: boolean, phase: string, previousPhase: string, gateResults: Object, reason: string }
   */
  transition(targetPhase) {
    const normalizedTarget = this._normalizePhase(targetPhase);
    const canTransitionResult = this.canTransition(normalizedTarget);

    if (!canTransitionResult.allowed) {
      return {
        success: false,
        phase: this.currentPhase,
        previousPhase: this.currentPhase,
        targetPhase: normalizedTarget,
        gateResults: canTransitionResult,
        reason: canTransitionResult.reason,
        timestamp: new Date().toISOString(),
      };
    }

    // Perform transition
    const previousPhase = this.currentPhase;
    this.currentPhase = normalizedTarget;

    // Record transition in history
    this.transitionHistory.push({
      from: previousPhase,
      to: normalizedTarget,
      timestamp: new Date().toISOString(),
      gateResults: { ...this.gateResults },
    });

    return {
      success: true,
      phase: this.currentPhase,
      previousPhase,
      targetPhase: normalizedTarget,
      gateResults: canTransitionResult,
      reason: 'Transition successful',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current phase
   *
   * @returns {string} Current phase
   */
  getCurrentPhase() {
    return this.currentPhase;
  }

  /**
   * Get available transitions from current phase
   *
   * @returns {Array<Object>} Array of { target: string, gates: string[], satisfied: boolean, missingGates: string[], failedGates: string[] }
   */
  getAvailableTransitions() {
    const available = [];

    // Find all transitions from current phase
    for (const [key, transition] of Object.entries(TRANSITIONS)) {
      const [source, target] = key.split('->');
      if (source === this.currentPhase) {
        const { missing, failed } = this._checkGates(transition.gates);
        const satisfied = missing.length === 0 && failed.length === 0;

        available.push({
          target,
          gates: transition.gates,
          satisfied,
          missingGates: missing,
          failedGates: failed,
          gateDetails: transition.gates.map(gateName => ({
            name: gateName,
            definition: GATE_DEFINITIONS[gateName] || { name: gateName, description: 'Unknown gate' },
            status: this.getGateStatus(gateName),
          })),
        });
      }
    }

    return available;
  }

  /**
   * Register gate validation result
   *
   * @param {string} gateName - Name of the gate
   * @param {boolean} passed - Whether gate validation passed
   * @param {Object} details - Detailed validation results
   * @returns {Object} - { success: boolean, gateName: string, passed: boolean, timestamp: string }
   */
  registerGateResult(gateName, passed, details = {}) {
    this.gateResults[gateName] = {
      passed,
      details,
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      gateName,
      passed,
      timestamp: this.gateResults[gateName].timestamp,
    };
  }

  /**
   * Get status of a specific gate
   *
   * @param {string} gateName - Name of the gate
   * @returns {Object|null} - { passed: boolean, details: Object, timestamp: string } or null if not found
   */
  getGateStatus(gateName) {
    return this.gateResults[gateName] || null;
  }

  /**
   * Get all gate statuses
   *
   * @returns {Object} - { [gateName]: { passed: boolean, details: Object, timestamp: string } }
   */
  getAllGateStatuses() {
    return { ...this.gateResults };
  }

  /**
   * Clear a specific gate result
   *
   * @param {string} gateName - Name of the gate to clear
   */
  clearGateResult(gateName) {
    delete this.gateResults[gateName];
  }

  /**
   * Clear all gate results
   */
  clearAllGateResults() {
    this.gateResults = {};
  }

  /**
   * Get transition history
   *
   * @returns {Array<Object>} Array of past transitions
   */
  getTransitionHistory() {
    return [...this.transitionHistory];
  }

  /**
   * Serialize state machine to JSON-compatible object
   *
   * @returns {Object} Serialized state machine data
   */
  serialize() {
    return {
      version: '1.0',
      currentPhase: this.currentPhase,
      gateResults: { ...this.gateResults },
      transitionHistory: [...this.transitionHistory],
      serializedAt: new Date().toISOString(),
    };
  }

  /**
   * Restore state machine from snapshot data
   *
   * @param {Object} data - Snapshot data (from serialize())
   * @returns {PhaseStateMachine} New state machine instance
   */
  static fromSnapshot(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid snapshot data');
    }

    const machine = new PhaseStateMachine(data.currentPhase || 'IDLE');
    machine.gateResults = data.gateResults ? { ...data.gateResults } : {};
    machine.transitionHistory = [...(data.transitionHistory || [])];

    return machine;
  }

  /** Alias for restoring from trusted internal storage. */
  static restore(data) {
    return PhaseStateMachine.fromSnapshot(data);
  }
}

/**
 * Factory function to create a new state machine
 *
 * @param {string} currentPhase - Initial phase (default: IDLE)
 * @returns {PhaseStateMachine} New state machine instance
 */
function createStateMachine(currentPhase = 'IDLE') {
  return new PhaseStateMachine(currentPhase);
}

// Export class, factory, and constants
module.exports = {
  PhaseStateMachine,
  createStateMachine,
  PHASES,
  TRANSITIONS,
  GATE_DEFINITIONS,
};

// ============================================================================
// CLI INTERFACE
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'create': {
        // create [phase]
        const phase = args[1] || 'IDLE';
        const machine = createStateMachine(phase);
        console.log('State machine created:');
        console.log(JSON.stringify(machine.serialize(), null, 2));
        break;
      }

      case 'transitions': {
        // transitions <current-phase>
        const phase = args[1];
        if (!phase) {
          console.error('Error: current phase required');
          console.log('Usage: phase-state-machine.js transitions <current-phase>');
          process.exit(1);
        }

        const machine = createStateMachine(phase);
        const available = machine.getAvailableTransitions();

        console.log(`\nAvailable transitions from ${phase}:\n`);
        for (const transition of available) {
          console.log(`→ ${transition.target}`);
          console.log(`  Status: ${transition.satisfied ? '✓ ALLOWED' : '✗ BLOCKED'}`);
          console.log(`  Required gates: ${transition.gates.length === 0 ? 'None' : transition.gates.join(', ')}`);

          if (transition.missingGates.length > 0) {
            console.log(`  Missing gates: ${transition.missingGates.join(', ')}`);
          }
          if (transition.failedGates.length > 0) {
            console.log(`  Failed gates: ${transition.failedGates.join(', ')}`);
          }
          console.log('');
        }
        break;
      }

      case 'gates': {
        // gates [gate-name]
        const gateName = args[1];

        if (gateName) {
          const definition = GATE_DEFINITIONS[gateName];
          if (definition) {
            console.log(JSON.stringify(definition, null, 2));
          } else {
            console.log(`Gate '${gateName}' not found`);
          }
        } else {
          console.log('\nGate Definitions:\n');
          for (const [name, def] of Object.entries(GATE_DEFINITIONS)) {
            console.log(`${name}:`);
            console.log(`  ${def.description}`);
            console.log('');
          }
        }
        break;
      }

      case 'check': {
        // check <current-phase> <target-phase>
        const currentPhase = args[1];
        const targetPhase = args[2];

        if (!currentPhase || !targetPhase) {
          console.error('Error: current and target phases required');
          console.log('Usage: phase-state-machine.js check <current-phase> <target-phase>');
          process.exit(1);
        }

        const machine = createStateMachine(currentPhase);
        const result = machine.canTransition(targetPhase);

        console.log(`\nTransition check: ${currentPhase} -> ${targetPhase}\n`);
        console.log(`Status: ${result.allowed ? '✓ ALLOWED' : '✗ BLOCKED'}`);
        console.log(`Reason: ${result.reason}`);

        if (result.missingGates.length > 0) {
          console.log(`\nMissing gates:`);
          result.missingGates.forEach(gate => console.log(`  - ${gate}`));
        }

        if (result.failedGates.length > 0) {
          console.log(`\nFailed gates:`);
          result.failedGates.forEach(gate => console.log(`  - ${gate}`));
        }

        process.exit(result.allowed ? 0 : 1);
        break;
      }

      default:
        console.log(`
AICodePath Phase State Machine
===============================

Formal state machine for phase transitions with validation gates.

USAGE:
  phase-state-machine.js <command> [options]

COMMANDS:
  create [phase]                     Create new state machine (default: IDLE)
  transitions <current-phase>        Show available transitions from phase
  gates [gate-name]                  Show gate definitions (all or specific)
  check <current> <target>           Check if transition is allowed

PHASES:
  IDLE -> PRE-FLIGHT -> INCEPTION -> CONSTRUCTION -> OPERATIONS -> COMPLETED

VALID TRANSITIONS:
  IDLE         -> PRE-FLIGHT     (no gates)
  PRE-FLIGHT   -> INCEPTION      (gate: environment-validated)
  INCEPTION    -> CONSTRUCTION   (gate: requirements-approved)
  CONSTRUCTION -> OPERATIONS     (gate: tests-passed, quality-gates-passed)
  OPERATIONS   -> COMPLETED      (gate: deployment-verified)

BACKWARD TRANSITIONS:
  CONSTRUCTION -> INCEPTION      (gate: architect-approval)
  OPERATIONS   -> CONSTRUCTION   (gate: bug-report-filed)

GATE DEFINITIONS:
  environment-validated          Node.js version, git, DB accessible
  requirements-approved          Requirements doc exists with acceptance criteria
  tests-passed                   Last test run passed, coverage above threshold
  quality-gates-passed           No mock violations, duplication below threshold
  architect-approval             Architecture decision record exists
  deployment-verified            Deployment artifact exists, health check passed
  bug-report-filed               Issue/bug document references regression

EXAMPLES:
  # Check available transitions
  phase-state-machine.js transitions INCEPTION

  # Check if transition is allowed
  phase-state-machine.js check PRE-FLIGHT INCEPTION

  # Show gate definitions
  phase-state-machine.js gates
  phase-state-machine.js gates environment-validated

INTEGRATION:
  Use in Node.js:
    const { PhaseStateMachine, createStateMachine } = require('.aicodepath/lib/phase-state-machine');

    const machine = createStateMachine('IDLE');

    // Register gate result
    machine.registerGateResult('environment-validated', true, { nodeVersion: '18.0.0' });

    // Check transition
    const canTransition = machine.canTransition('INCEPTION');
    if (canTransition.allowed) {
      const result = machine.transition('INCEPTION');
      console.log(\`Transitioned to \${result.phase}\`);
    }

    // Serialize for checkpoint
    const serialized = machine.serialize();
    const restored = PhaseStateMachine.fromSnapshot(serialized);

NOTES:
  - Gates must be registered before transition attempts
  - Failed gates block transitions until re-validated
  - State machine can be serialized for session persistence
  - Transition history is tracked for audit trail
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
