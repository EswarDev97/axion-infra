# Execution — Templates & Frameworks

## PRD (8-Section Template)

```markdown
# PRD: [Feature Name]

## 1. Summary
One paragraph: what this is, why now, and the expected outcome.

## 2. Contacts
| Role | Name |
|------|------|
| PM | |
| Engineering Lead | |
| Design Lead | |
| Stakeholders | |

## 3. Background & Context
Problem statement. Supporting data. How we got here.

## 4. Objectives & Success Metrics
| Objective | Metric | Baseline | Target | Timeline |
|-----------|--------|----------|--------|----------|

## 5. Target Segments
Who this is for. Who it's NOT for (explicit exclusions help engineering).

## 6. Value Propositions
For each segment: what changes for them after this ships?

## 7. Solution
### 7.1 User Flows
[Link to Figma or embed key flows]

### 7.2 Functional Requirements
| # | Requirement | Priority (Must/Should/Could/Won't) |
|---|-------------|-----------------------------------|

### 7.3 Non-Functional Requirements
Performance, security, accessibility, scalability constraints.

### 7.4 Out of Scope
Explicit list of what this PRD does NOT cover.

## 8. Release Plan
Rollout strategy (% / segment / feature flag). Rollback plan. Launch comms.
```

---

## User Stories (3 C's + INVEST)

**Format**: "As a [persona], I want [goal], so that [benefit]."

**INVEST criteria** (each story should be):
- **I**ndependent (can be built/tested alone)
- **N**egotiable (not a contract, open to discussion)
- **V**aluable (delivers value to user or business)
- **E**stimable (team can size it)
- **S**mall (fits in one sprint)
- **T**estable (clear pass/fail criteria)

**Acceptance Criteria** (Gherkin format):
```
Given [context]
When [action]
Then [outcome]
```

---

## Job Stories (When/Want/So I Can)

**Format**: "When [situation/trigger], I want [motivation/goal], so I can [expected outcome]."

Unlike user stories, job stories focus on context and causality — not persona labels.
Generate 3-5 job stories covering the core use case and edge cases.

---

## WWAS Format (Why-What-Acceptance)

```
## WHY
[Strategic context — what problem this solves and why it matters now]

## WHAT
[Clear description of the change — what will be different after this ships]

## ACCEPTANCE CRITERIA
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
```

---

## Prioritization Frameworks Reference

| Framework | Formula | Best for |
|-----------|---------|---------|
| **ICE** | Impact × Confidence × Ease (1-10 each) | Quick team gut-checks |
| **RICE** | (Reach × Impact × Confidence) / Effort | Feature backlog with data |
| **Kano** | Must-be / Performance / Delighter / Indifferent | Understanding satisfaction drivers |
| **MoSCoW** | Must / Should / Could / Won't | Sprint scope negotiation |
| **Opportunity Score** | Importance − Satisfaction (Dan Olsen) | Underserved need identification |
| **Value vs Effort** | 2×2 matrix | Stakeholder alignment |
| **WSJF** | (Business Value + Time Criticality + Risk Reduction) / Job Size | SAFe environments |
| **Buy-a-Feature** | Stakeholders allocate fake budget | Stakeholder preference discovery |
| **Jobs-to-be-Done rank** | Rank by frequency × frustration | Discovery prioritization |

---

## OKRs (Objective + Key Results)

Generate 3 distinct OKR options for `$ARGUMENTS`:

```
## Option A — [Theme, e.g. "Activation-focused"]

Objective: [Inspiring, qualitative, time-bound goal]

Key Results:
- KR1: [Measurable outcome] from [baseline] to [target] by [date]
- KR2: [Measurable outcome] from [baseline] to [target] by [date]
- KR3: [Measurable outcome] from [baseline] to [target] by [date]

Initiatives (example work that would drive these KRs):
- [Initiative 1]
- [Initiative 2]
```

KR rules: outcome-based (not output), measurable, ambitious but achievable (70% = good).

---

## Outcome Roadmap

Convert feature requests into outcome-based roadmap:

| Timeframe | Outcome (why) | Bets (what) | Success Metric |
|-----------|--------------|-------------|----------------|
| Now (Q1) | | | |
| Next (Q2) | | | |
| Later (H2) | | | |

Rule: "Now/Next/Later" over "Q1/Q2/Q3" — less commitment to dates, more commitment to outcomes.

---

## Sprint Plan

```
## Sprint [N] Plan — [Start Date] to [End Date]

### Sprint Goal
[One sentence — what business/user outcome will we achieve?]

### Capacity
| Team Member | Available Days | Focus Area |
|-------------|---------------|------------|
Total capacity: [X] story points / days

### Committed Items
| # | Story | Points | Owner | Dependencies |
|---|-------|--------|-------|-------------|

### Risks & Dependencies
- [Risk 1]: Mitigation: [action]
- [Dependency]: Status: [blocked/unblocked]

### Definition of Done
- [ ] Code reviewed and merged
- [ ] Tests written and passing
- [ ] QA signed off
- [ ] Documentation updated
```

---

## Pre-Mortem (Risk Analysis)

Categories (inspired by product risk management):
- **Tigers** — known, high-probability risks (launch-blocking)
- **Paper Tigers** — feared but unlikely to materialize
- **Elephants** — known but nobody's talking about them

```
## Pre-Mortem — [Feature/Launch Name]

### Imagine: It's [launch date + 3 months] and this failed spectacularly.
### What went wrong?

#### Tigers (will happen if we don't act)
| Risk | Impact | Mitigation | Owner | Status |
|------|--------|-----------|-------|--------|

#### Paper Tigers (probably won't happen, but worth naming)
| Risk | Why unlikely | Watch signal |
|------|-------------|-------------|

#### Elephants (real but undiscussed)
| Elephant | Why it's being avoided | Action to address |
|----------|----------------------|-------------------|
```

---

## Retrospective

**Format A — Start/Stop/Continue:**
```
START (things we should try)
STOP (things that aren't working)
CONTINUE (things working well, double down)
```

**Format B — 4Ls:**
```
LIKED (what went well)
LEARNED (new insights)
LACKED (what was missing)
LONGED FOR (what we wished we had)
```

Facilitation: Generate 3-5 items per category based on sprint context. Identify top 2 action items with owners.

---

## Stakeholder Map

**Power × Interest grid:**
```
HIGH POWER │ Manage Closely  │ Keep Satisfied
           │ [names]         │ [names]
───────────┼─────────────────┼──────────────
LOW POWER  │ Monitor         │ Keep Informed
           │ [names]         │ [names]
           └─────────────────┴──────────────
             LOW INTEREST      HIGH INTEREST
```

For each stakeholder: Communication cadence | Preferred channel | Key concern | How to win them over

---

## Release Notes

Target audience: users (not engineers). Write in plain language.

```markdown
## [Version / Release Name] — [Date]

### What's New
[Most impactful change first — user benefit, not technical description]

### Improvements
- [Improvement 1]
- [Improvement 2]

### Bug Fixes
- [Fix 1]

### Coming Soon
[Optional — builds anticipation]
```

---

## Meeting Notes Template

```markdown
## Meeting: [Title] — [Date]

**Attendees:** [Names]
**Facilitator:** [Name]

### Decisions Made
- [Decision 1]
- [Decision 2]

### Action Items
| Action | Owner | Due |
|--------|-------|-----|

### Key Discussion Points
[Brief summary — not verbatim transcript]

### Parking Lot (deferred topics)
- [Topic]
```

---

## Test Scenarios

```markdown
## Test Scenarios — [Feature Name]

### Scenario 1: [Happy path name]
**Objective:** [What this tests]
**Starting Condition:** [System state before test]
**Steps:**
1. [Step]
2. [Step]
**Expected Outcome:** [Pass criteria]

### Scenario 2: [Edge case name]
...

### Scenario 3: [Error/failure path]
...
```
