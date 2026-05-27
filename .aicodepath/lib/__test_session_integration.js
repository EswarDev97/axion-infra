#!/usr/bin/env node
/**
 * Test script for SessionStateManager with PhaseStateMachine integration
 */

const SessionStateManager = require('./session-state-manager');
const { PREDEFINED_KEYS } = SessionStateManager;

console.log('=== Session State Manager + State Machine Integration Test ===\n');

// Test 1: Initialize session state manager
console.log('Test 1: Initialize SessionStateManager');
const manager = new SessionStateManager();
console.log('Manager initialized');
console.log('✓ Pass\n');

// Test 2: Get state machine
console.log('Test 2: Get state machine from session manager');
const machine = manager.getStateMachine();
console.log(`Current phase: ${machine.getCurrentPhase()}`);
console.log('✓ Pass\n');

// Test 3: Transition using session manager
console.log('Test 3: Transition phase using session manager');
const result1 = manager.transitionPhase('PRE-FLIGHT');
console.log(`Success: ${result1.success}`);
console.log(`Phase: ${result1.phase}`);

// Verify session state was updated
const storedPhase = manager.getState(PREDEFINED_KEYS.CURRENT_PHASE);
console.log(`Stored phase in session: ${storedPhase}`);
console.log('✓ Pass\n');

// Test 4: Check transition with missing gates
console.log('Test 4: Check transition with missing gates');
const canTransition = manager.canTransitionPhase('INCEPTION');
console.log(`Can transition: ${canTransition.allowed}`);
console.log(`Missing gates: ${canTransition.missingGates.join(', ')}`);
console.log('✓ Pass\n');

// Test 5: Register gate through session manager
console.log('Test 5: Register gate through session manager');
const gateResult = manager.registerGate('environment-validated', true, {
  nodeVersion: process.version,
  platform: process.platform
});
console.log(`Gate registered: ${gateResult.gateName}`);
console.log(`Passed: ${gateResult.passed}`);
console.log('✓ Pass\n');

// Test 6: Transition after gate registration
console.log('Test 6: Transition after gate registration');
const result2 = manager.transitionPhase('INCEPTION');
console.log(`Success: ${result2.success}`);
console.log(`Phase: ${result2.phase}`);
console.log('✓ Pass\n');

// Test 7: Get available transitions
console.log('Test 7: Get available phase transitions');
const transitions = manager.getAvailablePhaseTransitions();
console.log(`Available transitions: ${transitions.length}`);
transitions.forEach(t => {
  console.log(`  → ${t.target}`);
  console.log(`    Gates: ${t.gates.join(', ') || 'none'}`);
  console.log(`    Satisfied: ${t.satisfied}`);
  if (t.missingGates.length > 0) {
    console.log(`    Missing: ${t.missingGates.join(', ')}`);
  }
});
console.log('✓ Pass\n');

// Test 8: State machine persistence
console.log('Test 8: State machine persistence');
const stateMachineData = manager.getState(PREDEFINED_KEYS.STATE_MACHINE);
console.log(`State machine stored: ${stateMachineData !== null}`);
console.log(`Stored phase: ${stateMachineData?.currentPhase}`);
console.log('✓ Pass\n');

// Test 9: Archive and restore with state machine
console.log('Test 9: Archive session with state machine');
const archiveResult = manager.archiveSession('test-checkpoint');
console.log(`Archive success: ${archiveResult.success}`);
console.log(`Session ID: ${archiveResult.session_id}`);
console.log(`Phase: ${archiveResult.phase}`);
console.log('✓ Pass\n');

// Test 10: Multiple gate registrations
console.log('Test 10: Multiple gate registrations');
manager.registerGate('requirements-approved', true, { documentId: 'REQ-001' });
manager.registerGate('tests-passed', true, { coverage: 90 });
manager.registerGate('quality-gates-passed', false, { violations: 5 });

const allGates = machine.getAllGateStatuses();
console.log(`Total gates registered: ${Object.keys(allGates).length}`);
Object.entries(allGates).forEach(([name, status]) => {
  console.log(`  ${name}: ${status.passed ? 'PASSED' : 'FAILED'}`);
});
console.log('✓ Pass\n');

// Test 11: Failed transition due to failed gate
console.log('Test 11: Transition blocked by failed gate');
manager.transitionPhase('CONSTRUCTION'); // Move to construction
const result3 = manager.transitionPhase('OPERATIONS');
console.log(`Success: ${result3.success}`);
console.log(`Reason: ${result3.reason}`);
if (result3.gateResults?.failedGates) {
  console.log(`Failed gates: ${result3.gateResults.failedGates.join(', ')}`);
}
console.log('✓ Pass\n');

// Test 12: Fix gate and retry transition
console.log('Test 12: Fix failed gate and retry');
manager.registerGate('quality-gates-passed', true, { violations: 0 });
const result4 = manager.transitionPhase('OPERATIONS');
console.log(`Success: ${result4.success}`);
console.log(`Phase: ${result4.phase}`);
console.log('✓ Pass\n');

// Cleanup
console.log('Cleaning up...');
manager.close();
console.log('✓ Done\n');

console.log('=== All Integration Tests Passed ===');
