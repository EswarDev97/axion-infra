# Context ROT Prevention

**Purpose**: Detect and mitigate context degradation, hallucination accumulation, and "drift" over long sessions.

**Reference**: https://www.understandingai.org/p/context-rot-the-emerging-challenge

---

## Overview

Context ROT (Reduction Over Time) occurs when:
- Earlier context becomes less influential in responses
- Accumulated errors compound over conversation
- Model begins to "hallucinate" based on earlier mistakes
- State tracking becomes inconsistent

---

## Detection Signals

### Signal 1: Factual Inconsistency
Watch for contradictions with previously established facts:
- Entity names changing
- Configuration values inconsistent
- Architecture decisions contradicting earlier choices

### Signal 2: Assumption Drift
Detect when assumptions start replacing verified information:
- Using "should be" instead of verified values
- Guessing file paths instead of reading files
- Assuming data formats instead of checking schema

### Signal 3: Compounding Errors
Recognize error chains:
- Fixes that introduce new issues
- Test failures persisting across iterations
- Same mistake repeated in different forms

---

## Prevention Strategies

### Strategy 1: Periodic State Verification

**Every 5-10 major operations**, verify state against source of truth:

```markdown
## Context Health Check

- [ ] Re-read aicodepath-state.md - does it match my understanding?
- [ ] Check implementation-status.json - are completed items accurate?
- [ ] Verify current file contents match my mental model
- [ ] Confirm database schema matches design documents
```

### Strategy 2: Explicit Context Refresh

When detecting potential rot, execute context refresh (see hook).

### Strategy 3: Assumption Logging

Log all assumptions made during implementation:

```markdown
## Assumptions Log

| Timestamp | Assumption | Source | Verified |
|-----------|------------|--------|----------|
| [time] | DB uses snake_case | data-modeling-rules.json | Yes |
| [time] | API returns camelCase | Assumed from convention | **NO - VERIFY** |
```

### Strategy 4: Session Segmentation

For long sessions, periodically:
1. Summarize completed work
2. Write checkpoint to state files
3. Clear working assumptions
4. Re-establish context from saved state

---

## Mitigation Actions

### When ROT is Detected:

1. **STOP** current implementation
2. **READ** all relevant state files
3. **VERIFY** critical assumptions against actual files
4. **CORRECT** any inconsistencies found
5. **LOG** the correction in audit.md
6. **RESUME** with verified context

### Context Reset Checkpoint

```markdown
## Context Reset Checkpoint

**Trigger**: [What triggered the reset]
**State Before**: [Summary of potentially corrupted context]
**Verified State**: [Verified from source files]
**Corrections Made**: [List of corrections]
**Resumed At**: [Where work continues]
```

---

## Integration Points

- Hook: `context-health-hook.js` triggers health check
- Invoke after every 10 GICL iterations
- Invoke when test failures persist 3+ iterations
- Invoke when user reports unexpected behavior
- Invoke at start of new session

---

## References

- Multi-Context Management: `rules/common/multi-context-management.md`
- Session Continuity: `rules/common/session-continuity.md`
- GICL Iterative Loop: `rules/construction/iterative-loop.md`
