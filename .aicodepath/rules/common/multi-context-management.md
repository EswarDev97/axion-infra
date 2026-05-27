# Multi-Context Window Management

**Purpose**: Enable seamless continuation across context windows using structured state files

**Based on**: Anthropic's best practices for long-running agents and multi-context workflows

---

## Overview

Long-running AICodePath workflows may span multiple context windows (sessions). This document defines strategies for maintaining state, resuming work, and ensuring continuity across sessions.

---

## Core Strategies

### 1. Structured State Files (JSON)

Use JSON files for state that needs to be parsed reliably:

| File | Purpose |
|------|---------|
| `context-state.json` | Overall session state and resume point |
| `implementation-status.json` | Code generation progress |
| `tests.json` | Test results and status |

Use Markdown for human-readable progress:

| File | Purpose |
|------|---------|
| `aicodepath-state.md` | Workflow progress with checkboxes |
| `audit.md` | Decision audit trail |

### 2. Init Script

Run `scripts/init.sh` at the start of each new context window to quickly understand current state.

### 3. Git for State Tracking

Use git commits to checkpoint progress and enable rollback.

---

## State File Specifications

### context-state.json

Primary state file for session management:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-06T15:30:00Z",
  "sessionId": "uuid-here",
  "project": {
    "name": "project-name",
    "path": "/path/to/project",
    "type": "greenfield|brownfield",
    "crNumber": "CR-001",
    "techStack": {
      "language": "typescript",
      "framework": "nestjs",
      "database": "postgresql",
      "cloud": "aws"
    }
  },
  "workflow": {
    "phase": "CONSTRUCTION",
    "stage": "Code Generation",
    "status": "in_progress"
  },
  "resumePoint": {
    "file": "aicodepath-docs/construction/plans/U001-code-generation-plan.md",
    "step": "generate-services",
    "lastCheckbox": 5,
    "nextAction": "Generate AuthService"
  },
  "recentDecisions": [
    {
      "timestamp": "2026-01-06T15:00:00Z",
      "decision": "Use bcrypt for password hashing",
      "rationale": "Industry standard, good performance"
    }
  ],
  "pendingQuestions": [],
  "lastCommit": {
    "hash": "abc123",
    "message": "docs(cr-001/user-service): add design artifacts",
    "timestamp": "2026-01-06T14:00:00Z"
  },
  "contextWindowHistory": [
    {
      "windowNumber": 1,
      "startedAt": "2026-01-06T10:00:00Z",
      "endedAt": "2026-01-06T12:00:00Z",
      "stagesCompleted": ["workspace-detection", "requirements-analysis"],
      "filesCreated": ["requirements.md", "requirement-questions.md"]
    }
  ],
  "preferences": {
    "cloud": "aws",
    "techStack": "managed",
    "costApproach": "optimize",
    "compliance": ["soc2"]
  }
}
```

### implementation-status.json

Detailed progress for code generation:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-06T15:30:00Z",
  "currentUnit": "U001-user-service",
  "currentStage": "code-generation",
  "completedSteps": [
    "generate-entities",
    "generate-dtos",
    "generate-repositories"
  ],
  "pendingSteps": [
    "generate-services",
    "generate-controllers",
    "generate-tests"
  ],
  "currentStep": {
    "name": "generate-services",
    "started": "2026-01-06T15:28:00Z",
    "filesCreated": ["user.service.ts"],
    "filesRemaining": ["auth.service.ts", "email.service.ts"]
  },
  "units": [
    {
      "id": "U001",
      "name": "user-service",
      "status": "in_progress",
      "stages": {
        "functional-design": "completed",
        "database-design": "completed",
        "code-generation": "in_progress"
      },
      "commits": []
    }
  ],
  "blockers": [],
  "notes": "Waiting for email service API decision"
}
```

### tests.json

Test status tracking:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-06T15:30:00Z",
  "summary": {
    "total": 45,
    "passed": 42,
    "failed": 2,
    "skipped": 1
  },
  "coverage": {
    "lines": 78,
    "branches": 65,
    "functions": 82
  },
  "failures": [
    {
      "file": "src/services/user.service.test.ts",
      "test": "should validate email format",
      "error": "Expected true to be false",
      "line": 42,
      "attempts": 1
    }
  ],
  "recentlyFixed": []
}
```

---

## Session Resumption Flow

### On New Context Window

1. **Run init.sh**:
```bash
./scripts/init.sh /path/to/project
```

2. **Claude reads state files**:
   - `context-state.json` for overall status
   - `implementation-status.json` for current work
   - `tests.json` for test status
   - `aicodepath-state.md` for checkbox progress

3. **Present resumption summary**:

```markdown
# Session Resumption

**Previous Session**: 2026-01-06T15:30:00Z
**Phase**: CONSTRUCTION
**Stage**: Code Generation
**Unit**: U001-user-service

**Progress**:
- Completed: 5/8 steps
- Current: generate-services
- Files remaining: auth.service.ts, email.service.ts

**Test Status**:
- 2 failing tests need attention
- See tests.json for details

**Last Commit**: abc123 - docs(cr-001/user-service): add design artifacts

---

> **WHAT WOULD YOU LIKE TO DO?**
>
> A) Continue from current step
> B) Review failing tests first
> C) See full status summary
> D) Start fresh (not recommended)
```

---

## Context Window Best Practices

### From Anthropic Documentation

1. **Use different prompts for first vs subsequent windows**:
   - First window: Set up framework, write tests, create scripts
   - Subsequent windows: Resume from todo list, verify state

2. **Write tests in structured format (tests.json)**:
   - Less likely to be inappropriately modified
   - Easy to track pass/fail status

3. **Set up quality of life tools (init.sh)**:
   - Prevents repeated work
   - Quick orientation on resume

4. **Use git for state tracking**:
   - Log of what's been done
   - Checkpoints for rollback

5. **Provide verification tools**:
   - Playwright MCP for testing UIs
   - Run tests to verify correctness

6. **Encourage complete context usage**:
   - Work systematically on tasks
   - Don't stop early due to context concerns
   - Save state before context ends

---

## State Persistence Rules

### When to Update State Files

| Event | Update |
|-------|--------|
| Stage starts | `context-state.json` workflow status |
| Step completes | `implementation-status.json` currentStep |
| Checkbox marked | `aicodepath-state.md` and implementation-status |
| Test runs | `tests.json` results |
| Commit created | `context-state.json` lastCommit |
| Decision made | `context-state.json` recentDecisions |
| Error occurs | `implementation-status.json` blockers |

### Immediate Updates

State files must be updated IMMEDIATELY when:
- A plan step is completed
- A test passes/fails
- A commit is created
- An error blocks progress

Do NOT batch updates - update as soon as the event occurs.

---

## Recovery Procedures

### Corrupted State File

1. Check git for last known good version:
```bash
git log --oneline aicodepath-docs/context-state.json
git show {commit}:aicodepath-docs/context-state.json
```

2. Restore from git:
```bash
git checkout {commit} -- aicodepath-docs/context-state.json
```

3. Verify and update with current progress

### Missing State Files

1. Check if backed up in git
2. If not, reconstruct from:
   - `aicodepath-state.md` checkboxes
   - `audit.md` logs
   - Git commit history

### Inconsistent State

1. `context-state.json` is source of truth for phase/stage
2. `implementation-status.json` is source of truth for steps
3. `aicodepath-state.md` checkboxes should match implementation-status
4. If inconsistent, trust JSON over markdown

---

## Integration with Workflow

### Start of Workflow

```markdown
## Session Initialization

1. Check for existing state files
2. If found:
   - Parse context-state.json
   - Present resumption options
   - Wait for user choice
3. If not found:
   - Create new context-state.json
   - Initialize other state files
   - Proceed with workflow
```

### End of Stage

```markdown
## Stage Completion

1. Update implementation-status.json
2. Update context-state.json
3. Update aicodepath-state.md checkboxes
4. Log in audit.md
5. Commit state files if configured
```

### Before Context Ends

```markdown
## Context Window Ending

If approaching context limit:

1. Complete current step if possible
2. Update all state files
3. Commit current progress
4. Log resume point clearly
5. Present "safe to end" message:

> **Session can be safely ended.**
>
> **Current state saved:**
> - Phase: CONSTRUCTION
> - Stage: Code Generation
> - Resume point: generate-services (step 5/8)
>
> **On next session:**
> - Run `./scripts/init.sh` to see status
> - Say "Resume workflow" to continue
```

---

## State File Locations

```
aicodepath-docs/
├── context-state.json        # Overall session state
├── implementation-status.json # Code generation progress
├── tests.json                 # Test results
├── aicodepath-state.md            # Human-readable state
├── audit.md                   # Decision audit trail
└── ...
```

---

## References

- Init script: `scripts/init.sh`
- State templates: `state-templates/`
- Session continuity: `rules/common/session-continuity.md`
- Error handling: `rules/common/error-handling.md`
- Anthropic docs: Multi-context window workflows, Effective harnesses for long-running agents
