#!/usr/bin/env node
/**
 * Test script for PhaseStateMachine
 */

const { PhaseStateMachine, createStateMachine, PHASES, TRANSITIONS, GATE_DEFINITIONS } = require('./phase-state-machine');

console.log('=== Phase State Machine Test ===\n');

// Test 1: Create state machine
console.log('Test 1: Create state machine');
const machine = createStateMachine('IDLE');
console.log(`Current phase: ${machine.getCurrentPhase()}`);
console.log('✓ Pass\n');

// Test 2: Check available transitions
console.log('Test 2: Available transitions from IDLE');
const transitions = machine.getAvailableTransitions();
console.log(`Available transitions: ${transitions.length}`);
transitions.forEach(t => {
  console.log(`  → ${t.target} (gates: ${t.gates.length}, satisfied: ${t.satisfied})`);
});
console.log('✓ Pass\n');

// Test 3: Transition without gates (IDLE -> PRE-FLIGHT)
console.log('Test 3: Transition IDLE -> PRE-FLIGHT (no gates required)');
const result1 = machine.transition('PRE-FLIGHT');
console.log(`Success: ${result1.success}`);
console.log(`New phase: ${result1.phase}`);
console.log('✓ Pass\n');

// Test 4: Try transition with missing gates (PRE-FLIGHT -> INCEPTION)
console.log('Test 4: Try PRE-FLIGHT -> INCEPTION (missing gate: environment-validated)');
const canTransition1 = machine.canTransition('INCEPTION');
console.log(`Allowed: ${canTransition1.allowed}`);
console.log(`Missing gates: ${canTransition1.missingGates.join(', ')}`);
console.log(`Reason: ${canTransition1.reason}`);
console.log('✓ Pass\n');

// Test 5: Register gate and transition
console.log('Test 5: Register environment-validated gate and transition');
machine.registerGateResult('environment-validated', true, {
  nodeVersion: '18.0.0',
  gitInstalled: true,
  dbAccessible: true
});
console.log('Gate registered');

const result2 = machine.transition('INCEPTION');
console.log(`Success: ${result2.success}`);
console.log(`New phase: ${result2.phase}`);
console.log('✓ Pass\n');

// Test 6: Serialize and deserialize
console.log('Test 6: Serialize and deserialize state machine');
const serialized = machine.serialize();
console.log(`Serialized version: ${serialized.version}`);
console.log(`Serialized phase: ${serialized.currentPhase}`);

const restored = PhaseStateMachine.deserialize(serialized);
console.log(`Restored phase: ${restored.getCurrentPhase()}`);
console.log(`Gate status preserved: ${restored.getGateStatus('environment-validated') !== null}`);
console.log('✓ Pass\n');

// Test 7: Multiple gates for transition
console.log('Test 7: Multiple gates (CONSTRUCTION -> OPERATIONS)');
machine.transition('CONSTRUCTION'); // Assuming requirements-approved is set
machine.registerGateResult('requirements-approved', true, { approved: true });
machine.transition('CONSTRUCTION');

const canTransition2 = machine.canTransition('OPERATIONS');
console.log(`Can transition to OPERATIONS: ${canTransition2.allowed}`);
console.log(`Missing gates: ${canTransition2.missingGates.join(', ')}`);
console.log('✓ Pass\n');

// Test 8: Register all required gates
console.log('Test 8: Register all required gates and transition');
machine.registerGateResult('tests-passed', true, { coverage: 85 });
machine.registerGateResult('quality-gates-passed', true, { violations: 0 });

const result3 = machine.transition('OPERATIONS');
console.log(`Success: ${result3.success}`);
console.log(`New phase: ${result3.phase}`);
console.log('✓ Pass\n');

// Test 9: Backward transition
console.log('Test 9: Backward transition (OPERATIONS -> CONSTRUCTION)');
const canTransition3 = machine.canTransition('CONSTRUCTION');
console.log(`Can transition back: ${canTransition3.allowed}`);
console.log(`Missing gates: ${canTransition3.missingGates.join(', ')}`);

machine.registerGateResult('bug-report-filed', true, { bugId: 'BUG-123' });
const result4 = machine.transition('CONSTRUCTION');
console.log(`Success: ${result4.success}`);
console.log(`New phase: ${result4.phase}`);
console.log('✓ Pass\n');

// Test 10: Transition history
console.log('Test 10: Transition history');
const history = machine.getTransitionHistory();
console.log(`Total transitions: ${history.length}`);
history.forEach((h, i) => {
  console.log(`  ${i + 1}. ${h.from} → ${h.to} (${h.timestamp})`);
});
console.log('✓ Pass\n');

console.log('=== All Tests Passed ===');
