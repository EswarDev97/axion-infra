# Sprint Planning - Detailed Steps

## Purpose
**Plan and organize work into time-boxed iterations with velocity tracking**

Sprint Planning focuses on:
- Organizing user stories into manageable sprints
- Estimating story points based on complexity
- Setting sprint goals and commitments
- Establishing team velocity baselines
- Creating a sustainable development cadence

## Prerequisites
- User Stories must be complete (stories.md with estimates)
- Requirements Analysis must be complete
- Workflow Planning must indicate Sprint Planning should execute

## When to Execute

**ALWAYS Execute IF**:
- Multiple user stories identified (more than 3-5 stories)
- Project spans multiple weeks/iterations
- Team velocity tracking is needed
- Agile/Scrum methodology is requested or preferred
- Stakeholder wants regular delivery milestones

**SKIP IF**:
- Single story or very small scope
- One-time implementation with no iteration
- Waterfall approach explicitly preferred
- Proof of concept or spike work only

---

# PART 1: SPRINT CONFIGURATION

## Step 1: Gather Sprint Configuration

Create `aicodepath-docs/inception/sprint-planning/sprint-questions.md`:

```markdown
# Sprint Planning Questions

## Question 1
What is the preferred sprint duration?

A) 1 week - Fast iteration, frequent releases
B) 2 weeks - Standard agile sprint (Recommended)
C) 3 weeks - Extended for complex work
D) 4 weeks - Longer cycles for stability
E) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 2
What is the team size for this project?

A) Solo developer (1 person)
B) Small team (2-3 people)
C) Medium team (4-6 people)
D) Large team (7+ people)
E) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 3
What is the expected availability per team member per sprint?

A) Full-time (40 hours/week)
B) Mostly full-time (30-35 hours/week)
C) Part-time (20 hours/week)
D) Limited (10 hours/week or less)
E) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 4
Do you have historical velocity data from previous projects?

A) Yes - I can provide average story points per sprint
B) No - This is a new team, need to establish baseline
C) Partial - Some data available but not consistent
D) Other (please describe after [Answer]: tag below)

[Answer]:

## Question 5
How should stories be prioritized?

A) Business value first (MoSCoW method)
B) Risk reduction first (tackle unknowns early)
C) Dependencies first (unblock other work)
D) Quick wins first (build momentum)
E) Other (please describe after [Answer]: tag below)

[Answer]:
```

## Step 2: Calculate Team Capacity

Based on answers, calculate:

```markdown
## Team Capacity Calculation

### Inputs
- **Sprint Duration**: [X] weeks
- **Team Size**: [Y] people
- **Availability**: [Z] hours/person/week
- **Focus Factor**: 0.7 (30% overhead for meetings, reviews, etc.)

### Capacity
- **Total Hours**: [Duration] x [Team Size] x [Availability] x [Focus Factor]
- **Estimated Story Points**: [Based on historical velocity or initial estimate]
```

## Step 3: Story Point Estimation

If stories don't have estimates, guide estimation:

### Estimation Scale (Fibonacci)
- **1 point**: Trivial, few hours of work
- **2 points**: Small, half a day to a day
- **3 points**: Medium, 1-2 days
- **5 points**: Larger, 2-4 days
- **8 points**: Large, nearly a full sprint for one person
- **13 points**: Very large, consider breaking down
- **21+ points**: Epic, must be broken down

### Estimation Guidelines
- Compare stories to each other (relative sizing)
- Consider complexity, not just time
- Include testing and documentation effort
- Account for unknowns and risks

---

# PART 2: SPRINT PLANNING

## Step 4: Create Sprint Backlog

Create `aicodepath-docs/inception/sprint-planning/sprint-backlog.md`:

```markdown
# Sprint Backlog

## Sprint Configuration
- **Sprint Duration**: [X] weeks
- **Sprint Start Date**: [Date]
- **Sprint End Date**: [Date]
- **Team Capacity**: [X] story points

## Sprint 1: [Sprint Name/Goal]

### Sprint Goal
[Clear, achievable goal for this sprint]

### Committed Stories
| ID | Story | Points | Priority | Assignee | Status |
|----|-------|--------|----------|----------|--------|
| S1 | [Story title] | [X] | High | TBD | Not Started |
| S2 | [Story title] | [X] | High | TBD | Not Started |

### Total Committed: [X] points

### Sprint Risks
- [Risk 1 and mitigation]
- [Risk 2 and mitigation]

---

## Sprint 2: [Sprint Name/Goal]
[Repeat structure]

---

## Backlog (Future Sprints)
| ID | Story | Points | Priority | Target Sprint |
|----|-------|--------|----------|---------------|
| S5 | [Story title] | [X] | Medium | Sprint 3 |
```

## Step 5: Create Velocity Estimates

Create `aicodepath-docs/inception/sprint-planning/velocity-estimates.md`:

```markdown
# Velocity Estimates

## Initial Velocity Estimate

### Calculation Method
- **Method**: [Historical/Team Assessment/Industry Average]
- **Confidence Level**: [Low/Medium/High]

### Baseline Velocity
- **Estimated Points per Sprint**: [X] points
- **Variance Range**: [X-Y] points

### Assumptions
- [Team availability assumption]
- [No major interruptions]
- [Learning curve factor if new tech]

## Velocity Tracking Template

| Sprint | Planned | Completed | Velocity | Notes |
|--------|---------|-----------|----------|-------|
| Sprint 1 | [X] | TBD | TBD | Initial sprint |
| Sprint 2 | [X] | TBD | TBD | |

## Velocity Adjustment Triggers
- Adjust down if: [Conditions]
- Adjust up if: [Conditions]
```

## Step 6: Create Sprint Goals

Create `aicodepath-docs/inception/sprint-planning/sprint-goals.md`:

```markdown
# Sprint Goals

## Sprint 1 Goal
**Goal**: [Clear, measurable goal]
**Success Criteria**:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

**Key Deliverables**:
- [Deliverable 1]
- [Deliverable 2]

**Definition of Done**:
- Code complete and reviewed
- Tests passing
- Documentation updated
- Deployed to [environment]

---

## Sprint 2 Goal
[Repeat structure]

---

## Release Goal (if applicable)
**Target Release**: [Date/Sprint]
**Release Scope**: [Description]
**Release Criteria**:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

---

# PART 3: APPROVAL

## Step 7: Update State Tracking

Update `aicodepath-docs/aicodepath-state.md`:

```markdown
### INCEPTION PHASE
- [x] Workspace Detection
- [x] Reverse Engineering (if applicable)
- [x] Requirements Analysis
- [x] User Stories
- [x] Sprint Planning
```

## Step 8: Present Completion Message

```markdown
# Sprint Planning Complete

Sprint planning has created:
- **Sprint Configuration**: [Duration] week sprints
- **Team Capacity**: [X] story points per sprint
- **Sprints Planned**: [X] sprints
- **Total Scope**: [X] story points across all sprints

Sprint Overview:
- Sprint 1: [Goal] - [X] points
- Sprint 2: [Goal] - [X] points
- [Additional sprints...]

> **REVIEW REQUIRED:**
> Please examine the sprint plan at: `aicodepath-docs/inception/sprint-planning/`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Modify sprint configuration, story assignments, or goals
> **Approve & Continue** - Approve sprint plan and proceed to **Workflow Planning**
```

## Step 9: Wait for Explicit Approval
- Do not proceed until the user explicitly approves the sprint plan
- Log user's response in audit.md with complete raw input

---

# CRITICAL RULES

## Planning Rules
- **ASK ABOUT VELOCITY**: Always clarify if historical data exists
- **DON'T OVERCOMMIT**: Leave buffer (typically 80% capacity)
- **PRIORITIZE CLEARLY**: Every story must have clear priority
- **DEFINE DONE**: Sprint goals must have clear success criteria

## Estimation Rules
- **RELATIVE SIZING**: Compare stories to each other, not absolute time
- **INCLUDE ALL WORK**: Testing, documentation, deployment
- **FLAG UNKNOWNS**: Large estimates (13+) need breakdown
- **TEAM CONSENSUS**: Estimates should be agreed upon

## Tracking Rules
- **UPDATE REGULARLY**: Velocity updates after each sprint
- **ADJUST EXPECTATIONS**: Re-plan if velocity differs significantly
- **DOCUMENT LEARNINGS**: Capture what affected velocity
