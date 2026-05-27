# Mid-Workflow Changes and Phase Management

## Overview

Users may request changes to the execution plan or phase execution during the workflow. This document provides guidance on handling these requests safely and effectively.

---

## Types of Mid-Workflow Changes

### 1. Adding a Skipped Phase

**Scenario**: User wants to add a phase that was originally skipped

**Example**: "Actually, I want to add user stories even though we skipped that stage"

**Handling**:
1. **Confirm Request**: "You want to add User Stories stage. This will create user stories and personas. Confirm?"
2. **Check Dependencies**: Verify all prerequisite phases are complete
3. **Update Execution Plan**: Add phase to `workflow-planning.md` with rationale
4. **Update State**: Mark phase as "PENDING" in `aicodepath-state.md`
5. **Execute Phase**: Follow normal phase execution process
6. **Log Change**: Document in `audit.md` with timestamp and reason

---

### 2. Skipping a Planned Phase

**Scenario**: User wants to skip a phase that was planned to execute

**Example**: "Let's skip the NFR Design stage for now"

**Handling**:
1. **Confirm Request**: "You want to skip NFR Design. This means no NFR patterns will be incorporated. Confirm?"
2. **Warn About Impact**: Explain what will be missing and potential consequences
3. **Get Explicit Confirmation**: User must explicitly confirm understanding of impact
4. **Update Execution Plan**: Mark phase as "SKIPPED" with reason
5. **Update State**: Mark phase as "SKIPPED" in `aicodepath-state.md`
6. **Adjust Later Phases**: Note that later phases may need manual setup
7. **Log Change**: Document in `audit.md` with timestamp and reason

---

### 3. Restarting Current Stage

**Scenario**: User is unhappy with current stage results and wants to redo it

**Example**: "I don't like these user stories. Can we start over?"

**Handling**:
1. **Understand Concern**: "What specifically would you like to change about the stories?"
2. **Offer Options**:
   - **Option A**: Modify existing artifacts (faster, preserves some work)
   - **Option B**: Complete restart (clean slate, more time)
3. **If Restart Chosen**:
   - Archive existing artifacts: `{artifact}.backup.{timestamp}`
   - Reset stage checkboxes in plan file
   - Mark stage as "IN PROGRESS" in `aicodepath-state.md`
   - Clear stage completion status
   - Re-execute from beginning
4. **Log Change**: Document reason for restart and what will change

---

### 4. Restarting Previous Stage

**Scenario**: User wants to go back and redo a completed stage

**Example**: "I want to change the architectural decision we made earlier"

**Handling**:
1. **Assess Impact**: Identify all stages that depend on the stage to be restarted
2. **Warn User**: "Restarting Application Design will require redoing: Units Planning, Units Generation, per-unit design (all units), Code Planning, Code Generation. Confirm?"
3. **Get Explicit Confirmation**: User must understand full impact
4. **If Confirmed**:
   - Archive all affected artifacts
   - Reset all affected stages in `aicodepath-state.md`
   - Clear checkboxes in all affected plan files
   - Return to the stage to restart
   - Re-execute from that point forward
5. **Log Change**: Document full impact and reason for restart

---

### 5. Changing Stage Depth

**Scenario**: User wants to change the depth level of current or upcoming stage

**Example**: "Let's do a comprehensive requirements analysis instead of standard"

**Handling**:
1. **Confirm Request**: "You want to change Requirements Analysis from Standard to Comprehensive depth. This will be more thorough but take longer. Confirm?"
2. **Update Execution Plan**: Change depth level in `workflow-planning.md`
3. **Adjust Approach**: Follow comprehensive depth guidelines for the stage
4. **Log Change**: Document depth change and reason

---

### 6. Pausing Workflow

**Scenario**: User needs to pause and resume later

**Example**: "I need to stop for now and continue tomorrow"

**Handling**:
1. **Complete Current Step**: Finish the current step in progress if possible
2. **Update Checkboxes**: Mark all completed steps with [x]
3. **Update State**: Ensure `aicodepath-state.md` reflects current status
4. **Log Pause**: Document pause point in `audit.md`
5. **Provide Resume Instructions**: "When you return, I'll detect your existing project and offer to continue from: [current phase, current step]"

---

### 7. Changing Architectural Decision

**Scenario**: User wants to change from monolith to microservices (or vice versa)

**Handling**:
1. **Assess Current Progress**: Determine how far into workflow
2. **Explain Impact**:
   - If before Units Planning: Minimal impact, just update decision
   - If after Units Planning: Must redo Units Planning, Units Generation, all per-unit design
   - If after Code Generation: Significant rework required
3. **Recommend Approach**:
   - Early in workflow: Restart from Application Design stage
   - Late in workflow: Consider if modification is feasible vs. restart
4. **Get Confirmation**: User must understand full scope of change
5. **Execute Change**: Follow restart procedures for affected stages

---

### 8. Changing Sprint Configuration

**Scenario**: User wants to modify sprint duration or capacity

**Example**: "Let's change to 2-week sprints instead of 3-week"

**Handling**:
1. **Assess Impact on Current Sprint**: Determine if sprint is in progress
2. **Recalculate Capacity**: Adjust story points per sprint
3. **Replan if Needed**: Move stories between sprints
4. **Update Artifacts**: Modify sprint-backlog.md, velocity-estimates.md
5. **Log Change**: Document change and rationale

---

### 9. Changing AI Model Selection

**Scenario**: User wants to switch AI models after design

**Example**: "Budget changed, we need to use a cheaper model"

**Handling**:
1. **Review Current Design**: Identify model-specific dependencies
2. **Assess Cost Impact**: Calculate new cost projections
3. **Evaluate Capability Impact**: Determine if new model meets requirements
4. **Update Artifacts**: Modify model-selection.md, cost-analysis.md, prompt-templates/
5. **Warn About Trade-offs**: Explain any quality or capability reductions
6. **Log Change**: Document change and new cost projections

---

### 10. Changing Database Schema Post-Design

**Scenario**: User wants to modify database schema after design completion

**Example**: "We need to add audit columns to all tables"

**Handling**:
1. **Assess Impact**: Identify affected tables and relationships
2. **Update Schema Design**: Modify schema-design.md
3. **Create Migration**: Add migration file for changes
4. **Update Index Strategy**: Adjust indexes if needed
5. **Recalculate Costs**: Update cost-analysis.md if storage changes significantly
6. **Log Change**: Document schema change and migration approach

---

## General Guidelines for Handling Changes

### Before Making Changes

1. **Understand the Request**: Ask clarifying questions
2. **Assess Impact**: Identify all affected stages, artifacts, and dependencies
3. **Explain Consequences**: Clearly communicate what will need to be redone
4. **Offer Alternatives**: Sometimes modification is better than restart
5. **Get Explicit Confirmation**: User must understand and accept the impact

### During Changes

1. **Archive Existing Work**: Always backup before making destructive changes
2. **Update All Tracking**: Keep `aicodepath-state.md`, plan files, and `audit.md` in sync
3. **Communicate Progress**: Keep user informed about what's happening
4. **Validate Changes**: Ensure changes are consistent across all artifacts
5. **Test Continuity**: Verify workflow can continue smoothly after changes

### After Changes

1. **Verify Consistency**: Check that all artifacts are aligned with changes
2. **Update Documentation**: Ensure all references are updated
3. **Log Completely**: Document full change history in `audit.md`
4. **Confirm with User**: Verify changes meet user's expectations
5. **Resume Workflow**: Continue with normal execution from new state

---

## Logging Requirements

### Change Request Log Format

```markdown
## Change Request - [Phase Name]
**Timestamp**: [ISO timestamp]
**Request**: [What user wants to change]
**Current State**: [Where we are in workflow]
**Impact Assessment**: [What will be affected]
**User Confirmation**: [User's explicit confirmation]
**Action Taken**: [What was done]
**Artifacts Affected**: [List of files changed/reset]

---
```

---

## Best Practices

1. **Always Confirm**: Never make destructive changes without explicit user confirmation
2. **Explain Impact**: Users need to understand consequences before deciding
3. **Offer Options**: Sometimes there are multiple ways to handle a change
4. **Archive First**: Always backup before making destructive changes
5. **Update Everything**: Keep all tracking files in sync
6. **Log Thoroughly**: Document all changes for audit trail
7. **Validate After**: Ensure workflow can continue smoothly
8. **Be Flexible**: Workflow should adapt to user needs, not force rigid process
