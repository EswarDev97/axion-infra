# Review Output Template

Standardized output format for `/aicodepath-review` results.
Used by `aicodepath-code-reviewer` agent and `aicodepath-review` skill.

---

## Template: Code Review

```markdown
## Code Review

**Verdict**: APPROVE | REQUEST_CHANGES
**Grade**: A | B | C | D
**Depth**: light | standard | strict
**Files Reviewed**: {N} files
**Task**: {task-id or description}

### Security
{findings, or: ✓ No issues}

### Performance
{findings, or: ✓ No issues}

### Quality
{findings, or: ✓ No issues}

### Accessibility
{findings, or: N/A — non-UI code}

### Findings

| Severity | Location | Issue | Suggestion | Auto-fixable |
|----------|----------|-------|------------|--------------|
| critical | file.js:42 | SQL injection via raw string concat | Use parameterized query | No |
| minor | utils.ts:10 | Unused import `lodash` | Remove import | Yes |

### Recommendations
{Optional non-blocking improvements — only include for grade B or higher}

### Memory Updates
{Patterns discovered worth remembering, e.g. "This project uses X pattern for Y"}
```

---

## Template: Plan Review

```markdown
## Plan Review

**Verdict**: APPROVE | REQUEST_CHANGES
**Grade**: A | B | C | D
**Tasks Reviewed**: {N} tasks

### Clarity
{Assessment: are task descriptions specific and unambiguous?}

### Feasibility
{Assessment: can all tasks be implemented with available stack?}

### Dependencies
{Assessment: are task dependencies accurate and acyclic?}

### Acceptance Criteria (DoD)
{Assessment: is DoD measurable and Yes/No decidable?}

### Value
{Assessment: does the plan solve the stated problem without scope inflation?}

### Spike Candidates
{Tasks that need investigation before implementation:}
| Task | Reason |
|------|--------|
| {task} | New technology / unknown API / complex integration |

### Findings

| Criterion | Issue | Recommendation |
|-----------|-------|----------------|
| Clarity | Task "handle payments" is vague | Rewrite as "Implement Stripe charge endpoint POST /api/payments" |
```

---

## Template: Scope Review

```markdown
## Scope Review

**Summary**: {N}/{total} tasks ({%}) may be outside original scope
**Original Scope**: aicodepath-docs/adr-log.md
**Current Tasks**: aicodepath-docs/task/

### Scope Check

| Task | Quadrant | Recommendation |
|------|----------|----------------|
| Add admin dashboard | Needs Spike | Create investigation task before implementing |
| Fix login bug | Required | Keep — directly in original scope |
| Add dark mode | Recommended | Defer to next phase |
| Rewrite auth module | Avoid | Descope — high risk, low value in this phase |

### In-Scope Items
{N} tasks align with planning.md — no action needed.
```

---

## Grade Definitions

| Grade | What it means | Verdict |
|-------|--------------|---------|
| **A** | No issues or info-only | APPROVE |
| **B** | Minor improvements suggested | APPROVE with suggestions |
| **C** | Multiple warnings or security concern | REQUEST_CHANGES |
| **D** | Critical issues or build failure | REQUEST_CHANGES (block) |

## Severity Definitions

| Severity | Definition | Verdict Impact |
|----------|-----------|----------------|
| **critical** | Security vulnerability, data loss risk, auth bypass | Always REQUEST_CHANGES |
| **major** | Build failure, N+1 query, test failures, type errors | REQUEST_CHANGES |
| **minor** | Style, naming, unused imports, minor performance | APPROVE with suggestion |
| **info** | Best-practice notes, optional improvements | APPROVE |
