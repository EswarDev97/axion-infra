# Phase State Machine - Visual Diagram

## State Transition Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      AICodePath Phase State Machine                      │
└──────────────────────────────────────────────────────────────────────────┘

                                  ┌──────┐
                                  │ IDLE │
                                  └───┬──┘
                                      │
                                      │ (no gates)
                                      ▼
                              ┌──────────────┐
                              │  PRE-FLIGHT  │
                              └──────┬───────┘
                                     │
                       ┌─────────────┴──────────────┐
                       │ Gate: environment-validated │
                       └─────────────┬──────────────┘
                                     ▼
                              ┌───────────┐
                         ┌────┤ INCEPTION │◄────┐
                         │    └─────┬─────┘     │
                         │          │           │
           ┌─────────────┴──────────┴───────┐   │
           │ Gate: requirements-approved    │   │
           └─────────────┬──────────────────┘   │
                         ▼                      │
                  ┌──────────────┐              │
             ┌────┤ CONSTRUCTION │              │
             │    └──────┬───────┘              │
             │           │                      │
             │           │                      │
             │  ┌────────┴───────────────────┐  │
             │  │ Gates:                     │  │
             │  │  - tests-passed            │  │
             │  │  - quality-gates-passed    │  │
             │  └────────┬───────────────────┘  │
             │           ▼                      │
             │    ┌────────────┐                │
             └────┤ OPERATIONS │                │
                  └──────┬─────┘                │
                         │                      │
           ┌─────────────┴───────────┐          │
           │ Gate: deployment-verified│         │
           └─────────────┬────────────┘         │
                         ▼                      │
                    ┌──────────┐                │
                    │COMPLETED │                │
                    └──────────┘                │
                                                │
                                                │
    ┌───────────────────────────────────────────┘
    │ Rollback Transitions (Backward)
    │
    │ Gate: architect-approval
    │
    │
    │ From OPERATIONS to CONSTRUCTION:
    └─► Gate: bug-report-filed
```

## Gate Requirements

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Gate Definitions                               │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ environment-validated                                                  │
├────────────────────────────────────────────────────────────────────────┤
│ Required for: PRE-FLIGHT → INCEPTION                                   │
│                                                                        │
│ Checks:                                                                │
│  ✓ Node.js version compatible                                         │
│  ✓ Git installed                                                      │
│  ✓ Database accessible                                                │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ requirements-approved                                                  │
├────────────────────────────────────────────────────────────────────────┤
│ Required for: INCEPTION → CONSTRUCTION                                 │
│                                                                        │
│ Checks:                                                                │
│  ✓ Requirements document exists                                       │
│  ✓ Has acceptance criteria                                            │
│  ✓ Stakeholder approval received                                      │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ tests-passed                                                           │
├────────────────────────────────────────────────────────────────────────┤
│ Required for: CONSTRUCTION → OPERATIONS                                │
│                                                                        │
│ Checks:                                                                │
│  ✓ Last test run passed                                               │
│  ✓ Coverage above threshold                                           │
│  ✓ No test failures                                                   │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ quality-gates-passed                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ Required for: CONSTRUCTION → OPERATIONS                                │
│                                                                        │
│ Checks:                                                                │
│  ✓ No mock violations                                                 │
│  ✓ Duplication below threshold                                        │
│  ✓ Linting passed                                                     │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ deployment-verified                                                    │
├────────────────────────────────────────────────────────────────────────┤
│ Required for: OPERATIONS → COMPLETED                                   │
│                                                                        │
│ Checks:                                                                │
│  ✓ Deployment artifact exists                                         │
│  ✓ Health check passed                                                │
│  ✓ Monitoring active                                                  │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ architect-approval (Rollback Gate)                                     │
├────────────────────────────────────────────────────────────────────────┤
│ Required for: CONSTRUCTION → INCEPTION                                 │
│                                                                        │
│ Checks:                                                                │
│  ✓ Architecture decision record exists                                │
│  ✓ Rollback justified                                                 │
│  ✓ Team consensus achieved                                            │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ bug-report-filed (Rollback Gate)                                       │
├────────────────────────────────────────────────────────────────────────┤
│ Required for: OPERATIONS → CONSTRUCTION                                │
│                                                                        │
│ Checks:                                                                │
│  ✓ Issue/bug document exists                                          │
│  ✓ References regression                                              │
│  ✓ Severity assessed                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

## Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Component Integration Flow                          │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  Claude Code     │
    │  (User Request)  │
    └────────┬─────────┘
             │
             │ Phase transition request
             ▼
    ┌────────────────────────────┐
    │ phase-entry-validator.js   │
    │ (Hook)                     │
    └────────┬───────────────────┘
             │
             │ validatePhaseTransition()
             ▼
    ┌────────────────────────────┐
    │ SessionStateManager        │
    │  - canTransitionPhase()    │
    │  - transitionPhase()       │
    └────────┬───────────────────┘
             │
             │ Uses
             ▼
    ┌────────────────────────────┐
    │ PhaseStateMachine          │
    │  - canTransition()         │
    │  - transition()            │
    │  - Gate validation         │
    └────────┬───────────────────┘
             │
             ├──► Check gates
             │    ├─► Passed? → Allow transition
             │    └─► Failed? → Block with details
             │
             ├──► Update session state
             │
             ├──► Create checkpoint
             │
             └──► Log transition
```

## CLI Command Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLI Command Flow                                 │
└─────────────────────────────────────────────────────────────────────────┘

$ aicodepath phase-state status
         │
         ▼
  ┌──────────────────┐
  │ phase-state.js   │
  │ (CLI Command)    │
  └────────┬─────────┘
           │
           ├─► Create SessionStateManager
           │
           ├─► Get state machine
           │
           ├─► Query available transitions
           │
           └─► Format and display:
               ├─► Current phase
               ├─► Available transitions
               ├─► Gate status
               └─► Missing/failed gates

$ aicodepath phase-state register environment-validated true '{"version":"18"}'
         │
         ▼
  ┌──────────────────┐
  │ phase-state.js   │
  └────────┬─────────┘
           │
           ├─► Parse gate name, status, details
           │
           ├─► SessionStateManager.registerGate()
           │
           └─► Display confirmation

$ aicodepath phase-state transition INCEPTION
         │
         ▼
  ┌──────────────────┐
  │ phase-state.js   │
  └────────┬─────────┘
           │
           ├─► Check canTransitionPhase()
           │   ├─► Allowed? → Proceed
           │   └─► Blocked? → Show missing gates
           │
           ├─► transitionPhase()
           │
           ├─► Create checkpoint
           │
           └─► Display result
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Data Persistence                               │
└─────────────────────────────────────────────────────────────────────────┘

  PhaseStateMachine                  SessionStateManager
         │                                   │
         │ serialize()                       │
         └──────────────────────────────────►│
                                             │
                     session_state table     │
                     ┌──────────────────┐    │
                     │ key: phase_state │◄───┘
                     │ value: {         │
                     │   version: "1.0" │
                     │   currentPhase   │
                     │   gateResults    │
                     │   history        │
                     │ }                │
                     └──────────────────┘
                             │
         ┌───────────────────┘
         │ deserialize()
         ▼
  PhaseStateMachine
  (Restored state)
```

## Transition Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Transition Decision Logic                          │
└─────────────────────────────────────────────────────────────────────────┘

                      Start Transition
                            │
                            ▼
                    ┌───────────────┐
                    │ Valid         │  No
                    │ Transition?   ├─────► Reject: Invalid transition
                    └───────┬───────┘
                            │ Yes
                            ▼
                    ┌───────────────┐
                    │ Gates         │  No
                    │ Required?     ├─────► Allow transition
                    └───────┬───────┘
                            │ Yes
                            ▼
                    ┌───────────────┐
                    │ All Gates     │
                    │ Registered?   │
                    └───────┬───────┘
                            │
                  ┌─────────┴──────────┐
                  │ No                 │ Yes
                  ▼                    ▼
         ┌───────────────┐    ┌───────────────┐
         │ Block with    │    │ All Gates     │
         │ missing gates │    │ Passed?       │
         └───────────────┘    └───────┬───────┘
                                      │
                            ┌─────────┴──────────┐
                            │ No                 │ Yes
                            ▼                    ▼
                   ┌───────────────┐    ┌───────────────┐
                   │ Block with    │    │ Allow         │
                   │ failed gates  │    │ Transition    │
                   └───────────────┘    └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │ Update state  │
                                        │ Save machine  │
                                        │ Create        │
                                        │ checkpoint    │
                                        │ Log event     │
                                        └───────────────┘
```

## File Structure

```
.aicodepath/
├── lib/
│   ├── phase-state-machine.js          ← Core state machine
│   ├── PHASE-STATE-MACHINE-README.md   ← Documentation
│   ├── phase-state-machine-diagram.md  ← This file
│   ├── session-state-manager.js        ← Integration (modified)
│   ├── __test_state_machine.js         ← Unit tests
│   └── __test_session_integration.js   ← Integration tests
│
├── commands/
│   └── phase-state.js                  ← CLI command
│
└── hooks/
    └── phase-entry-validator.js        ← Hook integration (modified)
```

## Quick Reference

### Common Operations

```bash
# Check current phase and gates
aicodepath phase-state status

# View required gates for transition
aicodepath phase-state gates INCEPTION

# Register gate result
aicodepath phase-state register environment-validated true

# Attempt transition
aicodepath phase-state transition INCEPTION

# View transition history
aicodepath phase-state history
```

### Code Examples

```javascript
// Check transition
const canTransition = manager.canTransitionPhase('INCEPTION');
if (canTransition.allowed) {
  manager.transitionPhase('INCEPTION');
} else {
  console.log('Missing:', canTransition.missingGates);
}

// Register gate
manager.registerGate('environment-validated', true, {
  nodeVersion: '18.0.0'
});

// View available transitions
const transitions = manager.getAvailablePhaseTransitions();
transitions.forEach(t => {
  console.log(`${t.target}: ${t.satisfied ? 'READY' : 'BLOCKED'}`);
});
```

---

**Note:** This diagram provides a visual representation of the Phase State Machine architecture and data flow. For detailed implementation information, see [PHASE-STATE-MACHINE-README.md](./PHASE-STATE-MACHINE-README.md).
