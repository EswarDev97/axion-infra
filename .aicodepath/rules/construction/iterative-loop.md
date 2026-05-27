# GICL - Governed Iterative Construction Loop

## Overview

GICL (Governed Iterative Construction Loop) is a controlled, deterministic code refinement loop that autonomously iterates on code until quality thresholds are met. It provides enterprise governance through multi-signal evaluation, hard stops, and KB-backed persistence.

## When to Use GICL

GICL is **optional** and should be enabled when:
- Building complex units that require multiple refinement cycles
- Test-driven development is in effect
- High code quality standards are required
- Autonomous refinement is preferred over manual iteration

GICL is **OFF by default**. Enable it explicitly via:
- CLI: `--iterative` flag
- Settings: `.claude/settings.json` → `"iterativeMode": true`
- Environment: `AICODEPATH_ITERATIVE_MODE=true`

## State Machine

```
IDLE → INITIALIZED → ITERATING → COMPLETE
                 ↓         ↓
             STOPPED ← ─ ─ ┘
```

### States

| State | Description |
|-------|-------------|
| `IDLE` | Initial state, ready to start |
| `INITIALIZED` | Session created, ready for iterations |
| `ITERATING` | Currently running an iteration |
| `COMPLETE` | Score met threshold, loop complete |
| `STOPPED` | Hard stop triggered |
| `ERROR` | Error occurred during iteration |

### Events

| Event | From | To | Description |
|-------|------|-----|-------------|
| `initialize` | IDLE | INITIALIZED | Create session |
| `start_iteration` | INITIALIZED | ITERATING | Begin iteration |
| `continue` | ITERATING | INITIALIZED | Continue to next iteration |
| `pass` | ITERATING | COMPLETE | Score met threshold |
| `hard_stop` | ITERATING | STOPPED | Stop condition triggered |
| `error` | * | ERROR | Error occurred |
| `reset` | * | IDLE | Reset loop |

## Scoring

GICL uses a weighted multi-signal scoring system:

| Signal | Default Weight | Description |
|--------|---------------|-------------|
| Tests | 35% | Test pass/fail rate |
| Guidelines | 20% | Coding standards compliance |
| Architecture | 15% | Architecture pattern adherence |
| Duplication | 20% | Code duplication score |
| Authenticity | 10% | AI-generated code quality |

### Score Thresholds

| Threshold | Score | Action |
|-----------|-------|--------|
| Pass | ≥ 90 | Complete loop successfully |
| Acceptable | ≥ 75 | Continue iteration |
| Needs Work | ≥ 60 | Continue with warnings |
| Fail | < 60 | Consider stopping |

## Hard Stops

GICL will stop automatically when:

1. **Score Too Low**: Final score drops below 70
2. **Excessive Duplication**: Duplication score below 70
3. **Score Degradation**: Score drops by more than 10 points in one iteration
4. **Stuck**: Same score for 3 consecutive iterations
5. **Max Iterations**: Reached maximum iteration limit
6. **Manual Stop**: `.gicl-stop` file detected

## Complexity Detection

Iteration limits are automatically determined by code complexity:

| Complexity | LOC | Functions | Iteration Limit |
|------------|-----|-----------|-----------------|
| Trivial | < 100 | < 3 | 3 |
| Simple | 100-300 | 3-10 | 5 |
| Moderate | 300-1000 | 10-30 | 7 |
| Complex | 1000-3000 | 30-100 | 10 |
| Very Complex | > 3000 | > 100 | 15 |

## Iteration Flow

Each iteration follows this sequence:

1. **Run Tests**: Execute test suite
2. **Run Validators**: Execute all registered validators
3. **Calculate Score**: Aggregate signals into final score
4. **Check Stop Conditions**: Evaluate hard stop triggers
5. **Generate Fix Plan**: Identify highest-priority fixes
6. **Record Iteration**: Persist to KB for audit
7. **Apply Fixes or Complete**: Either continue or finish

## Integration with Build-and-Test

When GICL is enabled during the build-and-test stage:

```
BUILD-AND-TEST
├── Build code
├── Run initial tests
└── IF iterativeMode = true
    └── GICL Loop
        ├── Iteration 1
        ├── Iteration 2
        └── ... until COMPLETE or STOPPED
```

## Session Persistence

GICL sessions are persisted to the KB for:
- **Resume**: Continue interrupted sessions
- **Audit**: Full iteration history
- **Analytics**: Track improvement patterns

### Session Data

```sql
-- Session table
loop_sessions: id, unit_name, target_path, max_iterations,
               current_iteration, status, final_score, ...

-- Iteration table
loop_iterations: session_id, iteration, test_score, guideline_score,
                 architecture_score, duplication_score, final_score, ...
```

## Control Files

Create these files in the project root to control GICL:

| File | Effect |
|------|--------|
| `.gicl-stop` | Stop current iteration and end loop |
| `.gicl-pause` | Pause before next iteration |
| `.gicl-skip` | Skip GICL entirely |

## Configuration

### .gicl.json

```json
{
  "maxIterations": 10,
  "weights": {
    "tests": 35,
    "guidelines": 20,
    "architecture": 15,
    "duplication": 20,
    "authenticity": 10
  },
  "customThresholds": {
    "minTestScore": 80,
    "minDuplicationScore": 75
  }
}
```

### .claude/settings.json

```json
{
  "iterativeMode": true,
  "gicl": {
    "maxIterations": 10,
    "passThreshold": 90
  }
}
```

## CLI Commands

```bash
# Enable iterative mode for a build
aicodepath construct --iterative

# Enable for specific unit
aicodepath construct --unit=auth-module --iterative

# Resume an interrupted session
aicodepath gicl resume <session-id>

# List active sessions
aicodepath gicl sessions

# Get session history
aicodepath gicl history <session-id>
```

## Best Practices

1. **Start Simple**: Enable GICL for moderately complex units first
2. **Monitor Early Iterations**: Watch for score patterns
3. **Trust Hard Stops**: Don't override stop conditions without reason
4. **Review Fix Plans**: Ensure suggested fixes are appropriate
5. **Use Escape Hatches**: Add `// aicodepath: allow-*` comments when needed

## Escape Hatches

If GICL is blocking on false positives:

```javascript
// aicodepath: allow-duplication
// Allows specific code to have duplicates

// aicodepath: skip-iteration
// Skip this file in GICL iterations
```

## Troubleshooting

### Score Not Improving
- Check if tests are deterministic
- Review fix plan for missed issues
- Consider adjusting weights

### Stuck in Loop
- GICL will auto-stop after 3 same-score iterations
- Create `.gicl-stop` file to manually stop
- Check for flaky tests

### Session Not Found
- Sessions expire after 7 days of inactivity
- Check KB connectivity
- Verify session ID is correct

## Related Documents

- [Build and Test](./build-and-test.md)
- [Code Generation](./code-generation.md)
- [Testing Guidelines](../guidelines/testing.json)
