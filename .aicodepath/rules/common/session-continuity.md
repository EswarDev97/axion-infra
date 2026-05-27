# Session Continuity Templates

## Welcome Back Prompt Template
When a user returns to continue work on an existing AICodePath project, present this prompt:

```markdown
**Welcome back! I can see you have an existing AICodePath project in progress.**

Based on your aicodepath-state.md, here's your current status:
- **Project**: [project-name]
- **Current Phase**: [INCEPTION/CONSTRUCTION/OPERATIONS]
- **Current Stage**: [Stage Name]
- **Last Completed**: [Last completed step]
- **Next Step**: [Next step to work on]

**What would you like to work on today?**

A) Continue where you left off ([Next step description])
B) Review a previous stage ([Show available stages])

[Answer]:
```

## MANDATORY: Session Continuity Instructions
1. **Always read aicodepath-state.md first** when detecting existing project
2. **Parse current status** from the workflow file to populate the prompt
3. **MANDATORY: Load Previous Stage Artifacts** - Before resuming any stage, automatically read all relevant artifacts from previous stages:
   - **Reverse Engineering**: Read architecture.md, code-structure.md, api-documentation.md
   - **Requirements Analysis**: Read requirements.md, requirement-verification-questions.md
   - **User Stories**: Read stories.md, personas.md, story-generation-plan.md
   - **Sprint Planning**: Read sprint-backlog.md, velocity-estimates.md, sprint-goals.md
   - **Application Design**: Read application-design artifacts (components.md, component-methods.md, services.md)
   - **Units Generation**: Read unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md
   - **Per-Unit Design**: Read functional-design.md, nfr-requirements.md, nfr-design.md, infrastructure-design.md
   - **Database Design**: Read schema-design.md, migrations/, index-strategy.md, audit-logging.md, cost-analysis.md
   - **AI Implementation**: Read model-selection.md, cost-analysis.md, prompt-templates/, rag-architecture.md, agent-design.md
   - **Code Stages**: Read all code files, plans, AND all previous artifacts
4. **Smart Context Loading by Stage**:
   - **Early Stages (Workspace Detection, Reverse Engineering)**: Load workspace analysis
   - **Requirements/Stories**: Load reverse engineering + requirements artifacts
   - **Sprint Planning**: Load requirements + stories + velocity history
   - **Design Stages**: Load requirements + stories + architecture + design artifacts
   - **Database Design**: Load all design artifacts + data requirements
   - **AI Implementation**: Load all design artifacts + AI requirements + budget constraints
   - **Code Stages**: Load ALL artifacts + existing code files
5. **Adapt options** based on architectural choice and current phase
6. **Show specific next steps** rather than generic descriptions
7. **Log the continuity prompt** in audit.md with timestamp
8. **Context Summary**: After loading artifacts, provide brief summary of what was loaded for user awareness
9. **Asking questions**: ALWAYS ask clarification or user feedback questions by placing them in .md files. DO NOT place the multiple-choice questions in-line in the chat session.

## Error Handling
If artifacts are missing or corrupted during session resumption, see [error-handling.md](error-handling.md) for guidance on recovery procedures.

## Knowledge Base Integration

When the knowledge base is initialized (`aicodepath-docs/aicodepath.db` exists), use it for enhanced session continuity:

### Query Recent Context
```bash
# Get current workflow state
node lib/kb-query.js get-workflow

# Get recent decisions
node lib/kb-query.js get-decisions --limit=5

# Get session history
node lib/kb-query.js get-state
```

### Load Artifacts from Database
```bash
# Search for relevant artifacts
node lib/kb-query.js search "authentication"

# Get traceability chain
node lib/kb-query.js get-traceability <artifact-id> --direction=forward
```

### Update Session State
```bash
# Set current phase/stage
node lib/kb-query.js set-state current_phase "construction"
node lib/kb-query.js set-state current_stage "code-generation"
node lib/kb-query.js set-state current_unit "auth-module"
```

### Knowledge Base Context Loading Order
1. Query `session_state` table for current phase/stage/unit
2. Query `session_history` for recent activity
3. Query `artifacts` for relevant documents
4. Query `decisions` for context-specific decisions
5. Query `workflow_state` for progress status

### Fallback Behavior
If knowledge base is not initialized:
1. Fall back to file-based artifact loading
2. Use aicodepath-state.md for status tracking
3. Prompt user to run `./scripts/init-knowledge-base.sh`

## Sprint Context Loading
When resuming during an active sprint:
1. Load current sprint backlog and goals
2. Check story completion status
3. Calculate remaining capacity
4. Identify any blocked items
5. Present sprint health summary

## AI/Database Context Loading
When resuming AI or database stages:
1. Load previous cost estimates
2. Check for any budget updates from user
3. Verify model/schema decisions are still valid
4. Present cost-to-date summary if applicable
