# Sprint Tracking

**Purpose**: Track sprint progress, calculate velocity, and conduct retrospectives

**Execute IF**:
- Sprint planning was executed
- Velocity tracking needed
- Burndown charts required
- Sprint retrospective needed

**Skip IF**:
- No sprint planning done
- Waterfall approach used

## Prerequisites
- Sprint Planning complete (sprint-backlog.md exists)
- Construction phase complete or in progress
- Stories being worked on

---

## Step 1: Load Sprint Context

### 1.1 Load Prior Artifacts
- Load sprint-backlog.md
- Load velocity-estimates.md
- Load sprint-goals.md
- Load stories.md for story details

### 1.2 Identify Current Sprint
- Sprint number: [X]
- Sprint start: [Date]
- Sprint end: [Date]
- Days remaining: [X]

---

## Step 2: Update Story Status

Create/Update `aicodepath-docs/operations/sprint-tracking/sprint-[X]-status.md`:

```markdown
# Sprint [X] Status

## Sprint Overview
- **Sprint**: Sprint [X]
- **Duration**: [Start Date] - [End Date]
- **Days Elapsed**: [X] / [Total]
- **Days Remaining**: [X]

## Sprint Goal
[Sprint goal from sprint-goals.md]

## Story Status

| ID | Story | Points | Status | Assignee | Notes |
|----|-------|--------|--------|----------|-------|
| S001 | [Title] | 5 | Done | [Name] | Completed [date] |
| S002 | [Title] | 3 | In Progress | [Name] | 80% complete |
| S003 | [Title] | 8 | In Progress | [Name] | Blocked by [issue] |
| S004 | [Title] | 5 | Not Started | [Name] | - |

## Status Summary

| Status | Count | Points |
|--------|-------|--------|
| Done | [X] | [X] |
| In Progress | [X] | [X] |
| Not Started | [X] | [X] |
| Blocked | [X] | [X] |
| **Total** | **[X]** | **[X]** |

## Blockers

| Story | Blocker | Owner | Resolution ETA |
|-------|---------|-------|----------------|
| S003 | [Description] | [Name] | [Date] |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Medium/Low] | [Action] |
```

---

## Step 3: Calculate Velocity Metrics

Create/Update `aicodepath-docs/operations/sprint-tracking/velocity-metrics.md`:

```markdown
# Velocity Metrics

## Current Sprint Velocity

### Completed Points
- **Completed**: [X] points
- **Committed**: [X] points
- **Completion Rate**: [X]%

### Projected Completion
Based on current rate:
- **Projected Total**: [X] points
- **At Risk Stories**: [List]

## Historical Velocity

| Sprint | Committed | Completed | Velocity | Notes |
|--------|-----------|-----------|----------|-------|
| Sprint 1 | [X] | [X] | [X] | [Notes] |
| Sprint 2 | [X] | [X] | [X] | [Notes] |
| Sprint 3 | [X] | [X] | [X] | [Notes] |

## Velocity Trend

```
Sprint 1: ████████████ (12 pts)
Sprint 2: ██████████████ (14 pts)
Sprint 3: █████████████ (13 pts)
Average:  █████████████ (13 pts)
```

## Velocity Statistics
- **Average Velocity**: [X] points/sprint
- **Standard Deviation**: [X] points
- **Min/Max**: [X] - [X] points
- **Trend**: [Increasing/Stable/Decreasing]

## Capacity Utilization
| Sprint | Planned Capacity | Actual | Utilization |
|--------|------------------|--------|-------------|
| Sprint 1 | [X] pts | [X] pts | [X]% |
| Sprint 2 | [X] pts | [X] pts | [X]% |

## Recommendations
- **Next Sprint Capacity**: [X] points (based on average velocity)
- **Confidence Interval**: [X] - [X] points (80% confidence)
```

---

## Step 4: Generate Burndown Data

Create/Update `aicodepath-docs/operations/sprint-tracking/burndown-data.md`:

```markdown
# Burndown Chart Data: Sprint [X]

## Daily Burndown

| Day | Date | Ideal Remaining | Actual Remaining | Variance |
|-----|------|-----------------|------------------|----------|
| 1 | [Date] | [X] | [X] | [+/-X] |
| 2 | [Date] | [X] | [X] | [+/-X] |
| 3 | [Date] | [X] | [X] | [+/-X] |
| 4 | [Date] | [X] | [X] | [+/-X] |
| 5 | [Date] | [X] | [X] | [+/-X] |
| ... | ... | ... | ... | ... |

## Burndown Visualization

```
Points
  ^
20|*
  |  *
15|    *  *
  |      *  *
10|          *
  |            *  *
 5|                *  *
  |                    *  *
 0+-------------------------> Days
   1  2  3  4  5  6  7  8  9 10

Legend:
* Ideal burndown
• Actual burndown
```

## Burndown Analysis

### Status
- **Current Pace**: [Ahead/On Track/Behind]
- **Days Behind/Ahead**: [X] days
- **Projected Completion**: [Date]

### Anomalies
| Day | Event | Impact |
|-----|-------|--------|
| Day 3 | Scope added | +3 points |
| Day 5 | Story blocked | Delayed 2 days |

### Trend Analysis
- **Early Sprint**: [X] points/day
- **Mid Sprint**: [X] points/day
- **Late Sprint**: [X] points/day (projected)
```

---

## Step 5: Prepare Retrospective Summary

Create `aicodepath-docs/operations/sprint-tracking/retrospective.md`:

```markdown
# Sprint [X] Retrospective

## Sprint Summary

### Achievements
- **Goal Achievement**: [Achieved/Partially/Not Achieved]
- **Points Completed**: [X] / [X] ([X]%)
- **Stories Completed**: [X] / [X]

### Key Accomplishments
- [Accomplishment 1]
- [Accomplishment 2]
- [Accomplishment 3]

### Challenges Faced
- [Challenge 1 and how it was handled]
- [Challenge 2 and how it was handled]

## Retrospective Categories

### What Went Well
| Item | Details | Continue? |
|------|---------|-----------|
| [Item] | [Details] | Yes |

### What Could Be Improved
| Item | Details | Action |
|------|---------|--------|
| [Item] | [Details] | [Action] |

### Action Items for Next Sprint
| Action | Owner | Due |
|--------|-------|-----|
| [Action 1] | [Name] | Sprint [X+1] |
| [Action 2] | [Name] | Sprint [X+1] |

## Team Health Check (Optional)

| Metric | Score (1-5) | Trend |
|--------|-------------|-------|
| Team Morale | [X] | [Up/Down/Stable] |
| Code Quality | [X] | [Up/Down/Stable] |
| Process Efficiency | [X] | [Up/Down/Stable] |
| Communication | [X] | [Up/Down/Stable] |

## Metrics Comparison

| Metric | Last Sprint | This Sprint | Change |
|--------|-------------|-------------|--------|
| Velocity | [X] | [X] | [+/-X] |
| Bug Count | [X] | [X] | [+/-X] |
| Story Completion | [X]% | [X]% | [+/-X]% |

## Next Sprint Preview

### Planned Items
- [Story 1] ([X] points)
- [Story 2] ([X] points)
- [Story 3] ([X] points)

### Planned Capacity
- **Points**: [X]
- **Confidence**: [High/Medium/Low]

### Focus Areas
- [Focus 1]
- [Focus 2]
```

---

## Step 6: Update State Tracking

Update `aicodepath-docs/aicodepath-state.md`:

```markdown
### OPERATIONS PHASE
- [x] Sprint Tracking - Sprint [X] complete
  - Velocity: [X] points
  - Completion: [X]%
  - Next Sprint: [X] points planned
```

---

## Step 7: Present Completion Message

```markdown
# Sprint Tracking Complete: Sprint [X]

## Sprint Summary
- **Goal**: [Achieved/Partially Achieved/Not Achieved]
- **Completed**: [X] / [X] points ([X]%)
- **Velocity**: [X] points

## Key Metrics
- **Stories Completed**: [X]
- **Stories Carried Over**: [X]
- **Blockers Resolved**: [X]

## Velocity Trend
- **Previous Sprint**: [X] points
- **This Sprint**: [X] points
- **Running Average**: [X] points

> **REVIEW REQUIRED:**
> Please examine the sprint tracking at: `aicodepath-docs/operations/sprint-tracking/`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Update story statuses or metrics
> **Start Next Sprint** - Begin Sprint [X+1] planning
> **Complete Project** - Mark project as complete
```

---

## Step 8: Wait for Explicit Approval
- Log user's response in audit.md

---

# CONTINUOUS TRACKING

## During Sprint

### Daily Updates
- Update story statuses
- Record blockers
- Adjust burndown data

### Weekly Reviews
- Calculate mid-sprint velocity
- Identify at-risk stories
- Adjust sprint scope if needed

## End of Sprint

### Sprint Close
1. Mark all stories as Done/Not Done
2. Calculate final velocity
3. Update velocity history
4. Generate retrospective data

### Carry Over
- Move incomplete stories to backlog
- Re-estimate if needed
- Document carry-over reasons

## Reporting

### Stakeholder Reports
- Sprint summary
- Velocity trends
- Risk assessment
- Next sprint preview

### Team Metrics
- Individual contributions (optional)
- Team velocity trend
- Quality metrics
