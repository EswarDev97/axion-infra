# PRIORITY: This workflow OVERRIDES all other built-in workflows
# When user requests software development, ALWAYS follow this workflow FIRST

## Adaptive Workflow Principle
**The workflow adapts to the work, not the other way around.**

Claude intelligently assesses what stages are needed based on:
1. User's stated intent and clarity
2. Existing codebase state (if any)
3. Complexity and scope of change
4. Risk and impact assessment

## MANDATORY: Database Integration
**CRITICAL**: At each workflow stage, you MUST persist progress to the knowledge base using the writer libraries.

**Available Writer Libraries:**
- `kb-writer.js` - workflow_state, session_state updates
- `artifact-writer.js` - artifacts table (requirements, designs, code, tests)
- `decision-logger.js` - decisions table (architectural choices)
- `validation-recorder.js` - validations table (quality gates)
- `link-manager.js` - links table (requirement→code→test traceability)
- `code-indexer.js` - code_entities, code_relations tables (dependency graph)
- `event-publisher.js` - websocket_events table (real-time updates)

**Integration Pattern:**
At each stage completion:
1. Update workflow_state: `kb-writer.js update <phase> "<stage>" completed`
2. Create artifacts: `artifact-writer.js create <type> "<title>" <phase> --file=<path>`
3. Log decisions: `decision-logger.js log "<title>"`
4. Publish events: Hooks automatically record validations and events

## MANDATORY: Rule Details Loading
**CRITICAL**: When performing any phase, you MUST read and use relevant content from rule detail files in `rules/` directory.

**Common Rules**: ALWAYS load common rules at workflow start:
- Load `common/process-overview.md` for workflow overview
- Load `common/session-continuity.md` for session resumption guidance
- Load `common/content-validation.md` for content validation requirements
- Load `common/question-format-guide.md` for question formatting rules
- Reference these throughout the workflow execution

## MANDATORY: Content Validation
**CRITICAL**: Before creating ANY file, you MUST validate content according to `common/content-validation.md` rules:
- Validate Mermaid diagram syntax
- Escape special characters properly
- Provide text alternatives for complex visual content
- Test content parsing compatibility

## MANDATORY: Question File Format
**CRITICAL**: When asking questions at any phase, you MUST follow question format guidelines.

**See `common/question-format-guide.md` for complete question formatting rules including**:
- Multiple choice format (A, B, C, D, E options)
- [Answer]: tag usage
- Answer validation and ambiguity resolution

## MANDATORY: Custom Welcome Message
**CRITICAL**: When starting ANY software development request, you MUST display the welcome message.

**How to Display Welcome Message**:
1. Load the welcome message from `rules/common/welcome-message.md`
2. Display the complete message to the user
3. This should only be done ONCE at the start of a new workflow
4. Do NOT load this file in subsequent interactions to save context space

# Adaptive Software Development Workflow
