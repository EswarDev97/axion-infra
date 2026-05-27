# Phase State Machine

Formal state machine for AICodePath phase transitions with validation gates.

## Overview

The Phase State Machine enforces a formal transition model between workflow phases, requiring validation gates to pass before phase transitions are allowed. This ensures that each phase has met its prerequisites before advancing.

## Architecture

### States

```
IDLE → PRE-FLIGHT → INCEPTION → CONSTRUCTION → OPERATIONS → COMPLETED
```

### Valid Transitions

| From | To | Required Gates |
|------|-----|----------------|
| IDLE | PRE-FLIGHT | None |
| PRE-FLIGHT | INCEPTION | `environment-validated` |
| INCEPTION | CONSTRUCTION | `requirements-approved` |
| CONSTRUCTION | OPERATIONS | `tests-passed`, `quality-gates-passed` |
| OPERATIONS | COMPLETED | `deployment-verified` |
| CONSTRUCTION | INCEPTION (rollback) | `architect-approval` |
| OPERATIONS | CONSTRUCTION (rollback) | `bug-report-filed` |

### Gate Definitions

#### environment-validated
**Description:** Environment validation checks
**Required Checks:**
- Node.js version compatible
- Git installed
- Database accessible

**Example Registration:**
```javascript
manager.registerGate('environment-validated', true, {
  nodeVersion: '18.0.0',
  gitVersion: '2.40.0',
  dbConnected: true
});
```

#### requirements-approved
**Description:** Requirements documentation validated
**Required Checks:**
- Requirements document exists
- Has acceptance criteria
- Stakeholder approval received

**Example Registration:**
```javascript
manager.registerGate('requirements-approved', true, {
  documentId: 'REQ-001',
  approvedBy: 'architect',
  acceptanceCriteria: 12
});
```

#### tests-passed
**Description:** Test suite execution successful
**Required Checks:**
- Last test run passed
- Coverage above threshold
- No test failures

**Example Registration:**
```javascript
manager.registerGate('tests-passed', true, {
  totalTests: 150,
  passed: 150,
  coverage: 85.5,
  threshold: 80
});
```

#### quality-gates-passed
**Description:** Code quality gates satisfied
**Required Checks:**
- No mock violations
- Duplication below threshold
- Linting passed

**Example Registration:**
```javascript
manager.registerGate('quality-gates-passed', true, {
  mockViolations: 0,
  duplicationPercent: 2.5,
  lintErrors: 0
});
```

#### architect-approval
**Description:** Architecture decision approval for rollback
**Required Checks:**
- Architecture decision record exists
- Rollback justified
- Team consensus achieved

**Example Registration:**
```javascript
manager.registerGate('architect-approval', true, {
  adrId: 'ADR-042',
  rollbackReason: 'Major design flaw discovered',
  approvedBy: 'lead-architect'
});
```

#### deployment-verified
**Description:** Deployment validation successful
**Required Checks:**
- Deployment artifact exists
- Health check passed
- Monitoring active

**Example Registration:**
```javascript
manager.registerGate('deployment-verified', true, {
  artifactId: 'v1.2.3',
  healthCheckUrl: 'https://api.example.com/health',
  healthStatus: 'healthy',
  monitoringEnabled: true
});
```

#### bug-report-filed
**Description:** Bug report documented for regression
**Required Checks:**
- Issue/bug document exists
- References regression
- Severity assessed

**Example Registration:**
```javascript
manager.registerGate('bug-report-filed', true, {
  issueId: 'BUG-789',
  severity: 'critical',
  regressionRef: 'v1.2.3',
  description: 'Production payment processing failure'
});
```

## Usage

### Basic Usage (Standalone)

```javascript
const { PhaseStateMachine, createStateMachine } = require('./.aicodepath/lib/phase-state-machine');

// Create state machine
const machine = createStateMachine('IDLE');

// Transition (no gates required)
const result1 = machine.transition('PRE-FLIGHT');
console.log(result1.success); // true
console.log(result1.phase);   // 'PRE-FLIGHT'

// Try transition with missing gates
const canTransition = machine.canTransition('INCEPTION');
console.log(canTransition.allowed);      // false
console.log(canTransition.missingGates); // ['environment-validated']

// Register gate
machine.registerGateResult('environment-validated', true, {
  nodeVersion: '18.0.0'
});

// Now transition is allowed
const result2 = machine.transition('INCEPTION');
console.log(result2.success); // true
console.log(result2.phase);   // 'INCEPTION'
```

### Integrated Usage (with SessionStateManager)

```javascript
const SessionStateManager = require('./.aicodepath/lib/session-state-manager');

const manager = new SessionStateManager();

// Check if transition is allowed
const canTransition = manager.canTransitionPhase('INCEPTION');
if (!canTransition.allowed) {
  console.log('Missing gates:', canTransition.missingGates);
}

// Register gate
manager.registerGate('environment-validated', true, {
  nodeVersion: process.version
});

// Transition phase (updates session state)
const result = manager.transitionPhase('INCEPTION');
console.log(result.success);  // true
console.log(result.phase);    // 'INCEPTION'

// Get available transitions
const transitions = manager.getAvailablePhaseTransitions();
transitions.forEach(t => {
  console.log(`→ ${t.target}`);
  console.log(`  Satisfied: ${t.satisfied}`);
  console.log(`  Missing gates: ${t.missingGates.join(', ')}`);
});

manager.close();
```

### Hook Integration (phase-entry-validator)

The `phase-entry-validator.js` hook automatically uses the state machine to validate phase transitions:

```javascript
// Called by Claude Code on phase transitions
function validatePhaseTransition(context) {
  const phase = context.targetPhase;

  // Check state machine
  const stateManager = new SessionStateManager();
  const canTransition = stateManager.canTransitionPhase(phase);

  if (!canTransition.allowed) {
    return {
      proceed: false,
      message: formatGateFailures(canTransition),
      retryable: true
    };
  }

  return { proceed: true };
}
```

## API Reference

### PhaseStateMachine Class

#### Constructor
```javascript
new PhaseStateMachine(currentPhase = 'IDLE')
```

#### Methods

**canTransition(targetPhase): Object**
- Check if transition to target phase is allowed
- Returns: `{ allowed, missingGates, failedGates, reason }`

**transition(targetPhase): Object**
- Attempt transition to target phase
- Returns: `{ success, phase, previousPhase, gateResults, reason, timestamp }`

**getCurrentPhase(): string**
- Get current phase

**getAvailableTransitions(): Array<Object>**
- Get all valid transitions from current phase
- Returns array of: `{ target, gates, satisfied, missingGates, failedGates, gateDetails }`

**registerGateResult(gateName, passed, details): Object**
- Register gate validation result
- Returns: `{ success, gateName, passed, timestamp }`

**getGateStatus(gateName): Object|null**
- Get status of specific gate
- Returns: `{ passed, details, timestamp }` or null

**getAllGateStatuses(): Object**
- Get all gate statuses
- Returns: `{ [gateName]: { passed, details, timestamp } }`

**getTransitionHistory(): Array<Object>**
- Get transition history
- Returns array of: `{ from, to, timestamp, gateResults }`

**serialize(): Object**
- Serialize state machine to JSON
- Returns: `{ version, currentPhase, gateResults, transitionHistory, serializedAt }`

**static deserialize(data): PhaseStateMachine**
- Restore state machine from serialized data

### SessionStateManager Extensions

**getStateMachine(): PhaseStateMachine**
- Get state machine instance

**transitionPhase(targetPhase): Object**
- Transition phase using state machine
- Updates session state on success
- Returns transition result

**canTransitionPhase(targetPhase): Object**
- Check if transition is allowed
- Returns gate validation results

**registerGate(gateName, passed, details): Object**
- Register gate validation result
- Persists to session state

**getAvailablePhaseTransitions(): Array<Object>**
- Get available transitions with gate status

**getCurrentPhaseFromStateMachine(): string**
- Get current phase from state machine

## CLI Interface

### Test Transitions
```bash
node .aicodepath/lib/phase-state-machine.js transitions INCEPTION
```

### Check Transition
```bash
node .aicodepath/lib/phase-state-machine.js check PRE-FLIGHT INCEPTION
# Exit code 0 if allowed, 1 if blocked
```

### View Gate Definitions
```bash
# All gates
node .aicodepath/lib/phase-state-machine.js gates

# Specific gate
node .aicodepath/lib/phase-state-machine.js gates environment-validated
```

### Create State Machine
```bash
node .aicodepath/lib/phase-state-machine.js create INCEPTION
```

## Integration with Hooks

The state machine is automatically used by:

1. **phase-entry-validator.js** - Validates phase transitions
2. **session-state-manager.js** - Manages phase state
3. **checkpoint-manager.js** - Creates checkpoints on transitions (via session-state-manager)

## Examples

### Example 1: Full Workflow

```javascript
const manager = new SessionStateManager();

// Start workflow
manager.transitionPhase('PRE-FLIGHT');

// Register environment validation
manager.registerGate('environment-validated', true, {
  nodeVersion: '18.0.0',
  gitVersion: '2.40.0'
});

// Move to inception
manager.transitionPhase('INCEPTION');

// Register requirements
manager.registerGate('requirements-approved', true, {
  documentId: 'REQ-001',
  acceptanceCriteria: 15
});

// Move to construction
manager.transitionPhase('CONSTRUCTION');

// Register quality gates
manager.registerGate('tests-passed', true, { coverage: 85 });
manager.registerGate('quality-gates-passed', true, { violations: 0 });

// Move to operations
manager.transitionPhase('OPERATIONS');

manager.close();
```

### Example 2: Handle Failed Gates

```javascript
const manager = new SessionStateManager();

// Setup phase
manager.transitionPhase('PRE-FLIGHT');
manager.registerGate('environment-validated', true, {});
manager.transitionPhase('INCEPTION');
manager.registerGate('requirements-approved', true, {});
manager.transitionPhase('CONSTRUCTION');

// Register failed gate
manager.registerGate('tests-passed', false, {
  totalTests: 100,
  passed: 95,
  failed: 5,
  failedTests: ['auth.test.js', 'payment.test.js']
});

manager.registerGate('quality-gates-passed', true, {});

// Try to transition (will fail)
const result = manager.transitionPhase('OPERATIONS');
console.log(result.success); // false
console.log(result.reason);  // 'Gates not satisfied: tests-passed'

// Fix tests and re-register
manager.registerGate('tests-passed', true, {
  totalTests: 100,
  passed: 100,
  failed: 0
});

// Now transition succeeds
const result2 = manager.transitionPhase('OPERATIONS');
console.log(result2.success); // true

manager.close();
```

### Example 3: Rollback Workflow

```javascript
const manager = new SessionStateManager();

// Move to operations (assuming gates are set)
// ... setup code ...

// Production issue discovered, need to rollback
manager.registerGate('bug-report-filed', true, {
  issueId: 'BUG-456',
  severity: 'critical',
  description: 'Payment processing failure'
});

// Rollback to construction
const result = manager.transitionPhase('CONSTRUCTION');
console.log(result.success); // true
console.log(result.phase);   // 'CONSTRUCTION'

// View transition history
const machine = manager.getStateMachine();
const history = machine.getTransitionHistory();
console.log('Transition history:', history);

manager.close();
```

## Best Practices

1. **Always check before transitioning**: Use `canTransitionPhase()` before attempting transitions
2. **Register gates proactively**: Register gate results as soon as validation completes
3. **Include detailed gate info**: Provide comprehensive details when registering gates
4. **Use session manager**: Prefer `SessionStateManager` over direct `PhaseStateMachine` for automatic persistence
5. **Handle failed transitions**: Check `result.success` and provide remediation guidance
6. **Leverage transition history**: Use history for audit trails and debugging

## Backward Compatibility

The state machine is integrated as an enhancement. If the state machine is not available or errors occur:

- `phase-entry-validator.js` falls back to file-based validation
- Direct phase setting via `setState()` still works but logs warnings
- Existing code continues to function without modification

## Testing

Run the test suite:

```bash
node .aicodepath/lib/__test_state_machine.js
node .aicodepath/lib/__test_session_integration.js
```

## Future Enhancements

Planned improvements:

1. **Custom gates**: Allow projects to define additional gates
2. **Gate dependencies**: Gates that require other gates to pass first
3. **Time-based gates**: Gates that expire after a certain time
4. **Parallel gates**: Gates that can be validated concurrently
5. **Gate notifications**: Alert when gates fail or need attention
6. **Visual state diagram**: Generate visual representation of state machine

## Related Documentation

- [Session State Manager README](./session-state-manager-README.md)
- [Phase Entry Validator Hook](../hooks/phase-entry-validator.js)
- [AICodePath Enhancement Blueprint](../../docs/enhancement-blueprint.md)

---

**Version:** 1.0.0
**Author:** AICodePath Team
**Last Updated:** 2026-02-05
