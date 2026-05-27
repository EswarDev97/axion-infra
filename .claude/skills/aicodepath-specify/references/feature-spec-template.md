# Feature Specification Template

## Naming Convention

`F{NNN}-{kebab-case-name}.md` — e.g., `F001-user-authentication.md`

## Template

```markdown
# F{NNN}: {Feature Name}

## Status
{COMPLETE|PARTIAL|MISSING|STUB}

## Description
[What this feature does in 2-3 sentences]

## User Stories
- As a [role], I want [action], so that [benefit]

## Acceptance Criteria
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]

## Technical Notes
[Implementation hints, constraints, dependencies]

## Priority
{P0|P1|P2|P3}

## Dependencies
- [Other feature IDs this depends on]

## Effort Estimate
{S|M|L|XL}
```

## Status Marker Rules

| Marker | Meaning | Criteria |
|--------|---------|----------|
| `COMPLETE` | Fully implemented and tested | All acceptance criteria met, tests pass |
| `PARTIAL` | Some implementation exists | Some criteria met, gaps remain |
| `MISSING` | No implementation | Feature specified but not built |
| `STUB` | Placeholder only | Function exists but returns mock data |

## Priority Definitions

| Priority | Criteria |
|----------|----------|
| **P0** | Core business logic, security, data integrity — system doesn't work without it |
| **P1** | Important user-facing features — system works but is degraded without it |
| **P2** | Nice-to-have features — improves UX but not blocking |
| **P3** | Future considerations — document now, implement later |

## Constitution Template

```markdown
# Project Constitution

## Mission
[One-sentence purpose extracted from source material]

## Principles
1. [Principle derived from architecture decisions]
2. [Principle derived from coding standards]
3. [Principle derived from business context]

## Non-Negotiables
- [Hard constraints from requirements or existing code]

## Quality Bar
- Test coverage target: [extracted or default 80%]
- Performance budget: [extracted or default]
- Accessibility standard: [extracted or default WCAG 2.1 AA]
```

## Spec Index Template

```markdown
# Feature Specifications

**Generated**: [date]
**Source**: [brainstorm/RE/requirements]
**Total Features**: [N]

## Status Summary

| Status | Count | Percentage |
|--------|-------|------------|
| COMPLETE | X | XX% |
| PARTIAL | X | XX% |
| MISSING | X | XX% |
| STUB | X | XX% |

## Feature Index

| ID | Feature | Status | Priority | Effort |
|----|---------|--------|----------|--------|
| F001 | [name] | COMPLETE | P0 | M |
```
