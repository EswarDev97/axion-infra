# Session State: {{PROJECT_NAME}}

> Last updated: {{TIMESTAMP}}

## Current Context

| Field | Value |
|-------|-------|
| Phase | {{CURRENT_PHASE}} |
| Unit | {{CURRENT_UNIT}} |
| Task | {{CURRENT_TASK}} |
| GICL Iteration | {{GICL_ITERATION}} |
| Session Start | {{SESSION_START}} |

## Progress

**Phase Progress:** {{PHASE_PROGRESS}}%
**Overall Progress:** {{OVERALL_PROGRESS}}%

### Quality Scores

| Metric | Score | Status |
|--------|-------|--------|
| Guidelines | {{GUIDELINE_SCORE}} | {{GUIDELINE_STATUS}} |
| Authenticity | {{AUTH_SCORE}} | {{AUTH_STATUS}} |
| Duplication | {{DUP_SCORE}} | {{DUP_STATUS}} |
| Tests | {{TEST_SCORE}} | {{TEST_STATUS}} |

## Active Work

### In Progress
{{#each IN_PROGRESS}}
- [ ] {{this.task}} ({{this.unit}})
{{/each}}

### Completed This Session
{{#each COMPLETED_TODAY}}
- [x] {{this.task}} ({{this.unit}})
{{/each}}

## Blockers

{{#if BLOCKERS}}
{{#each BLOCKERS}}
### {{this.type}}: {{this.title}}

**Description:** {{this.description}}
**Impact:** {{this.impact}}
**Waiting On:** {{this.waitingOn}}

{{/each}}
{{else}}
No active blockers.
{{/if}}

## Decisions Made

{{#each DECISIONS}}
| Decision | {{this.title}} |
|----------|----------------|
| Context | {{this.context}} |
| Options | {{this.options}} |
| Chosen | {{this.chosen}} |
| Rationale | {{this.rationale}} |

{{/each}}

## Next Steps

{{#each NEXT_STEPS}}
1. {{this}}
{{/each}}

## Notes

{{NOTES}}

---

## Resume Instructions

To resume this session:

1. Run `/aicodepath:resume` to restore context
2. Current task: **{{CURRENT_TASK}}**
3. Next action: {{SUGGESTED_NEXT_ACTION}}

{{#if BLOCKERS}}
**Note:** There are {{BLOCKERS.length}} blocker(s) to address first.
{{/if}}

---

*Paused at: {{PAUSED_AT}}*
*Reason: {{PAUSE_REASON}}*
