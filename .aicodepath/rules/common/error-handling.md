# Error Handling and Recovery Procedures

## General Error Handling Principles

### When Errors Occur
1. **Identify the error**: Clearly state what went wrong
2. **Assess impact**: Determine if the error is blocking or can be worked around
3. **Communicate**: Inform the user about the error and options
4. **Offer solutions**: Provide clear steps to resolve or work around the error
5. **Document**: Log the error and resolution in `audit.md`

### Error Severity Levels

**Critical**: Workflow cannot continue
- Missing required files or artifacts
- Invalid user input that cannot be processed
- System errors preventing file operations

**High**: Phase cannot complete as planned
- Incomplete answers to required questions
- Contradictory user responses
- Missing dependencies from prior phases

**Medium**: Phase can continue with workarounds
- Optional artifacts missing
- Non-critical validation failures
- Partial completion possible

**Low**: Minor issues that don't block progress
- Formatting inconsistencies
- Optional information missing
- Non-blocking warnings

## Phase-Specific Error Handling

### Context Assessment Errors

**Error**: Cannot read workspace files
- **Cause**: Permission issues, missing directories
- **Solution**: Ask user to verify workspace path and permissions
- **Workaround**: Proceed with user-provided information only

**Error**: Existing `aicodepath-state.md` is corrupted
- **Cause**: Manual editing, incomplete previous run
- **Solution**: Ask user if they want to start fresh or attempt recovery
- **Recovery**: Create backup, start new state file

**Error**: Cannot determine required phases
- **Cause**: Insufficient information from user
- **Solution**: Ask clarifying questions about intent and scope
- **Workaround**: Default to comprehensive execution plan

### Requirements Assessment Errors

**Error**: User provides contradictory requirements
- **Cause**: Unclear understanding, changing needs
- **Solution**: Create follow-up questions to resolve contradictions
- **Do Not Proceed**: Until contradictions are resolved

**Error**: Requirements document cannot be converted
- **Cause**: Unsupported format, corrupted file
- **Solution**: Ask user to provide requirements in supported format
- **Workaround**: Work with user's verbal description

**Error**: Incomplete answers to verification questions
- **Cause**: User skipped questions, unclear what to answer
- **Solution**: Highlight unanswered questions, provide examples
- **Do Not Proceed**: Until all required questions are answered

### Story Development Errors

**Error**: Cannot map requirements to stories
- **Cause**: Requirements too vague, missing functional details
- **Solution**: Return to Requirements Assessment for clarification
- **Workaround**: Create stories based on available information, mark as incomplete

**Error**: User provides ambiguous story planning answers
- **Cause**: Unclear options, complex decision
- **Solution**: Add follow-up questions with specific examples
- **Do Not Proceed**: Until ambiguities are resolved

### Sprint Planning Errors

**Error**: Cannot estimate story points
- **Cause**: Insufficient story detail, unclear complexity
- **Solution**: Ask for more story details or use relative sizing
- **Workaround**: Use placeholder estimates, refine later

**Error**: Sprint capacity exceeds available time
- **Cause**: Over-commitment, underestimated complexity
- **Solution**: Reprioritize backlog, move items to next sprint
- **Recovery**: Adjust sprint goals to match capacity

### Database Design Errors

**Error**: Circular foreign key dependencies
- **Cause**: Poor schema design, tight coupling
- **Solution**: Identify circular dependencies, suggest refactoring
- **Recovery**: Use nullable FKs or separate tables

**Error**: Index strategy conflicts with query patterns
- **Cause**: Mismatch between design and expected queries
- **Solution**: Review query patterns, adjust index strategy
- **Workaround**: Document trade-offs, let user decide

### AI Implementation Errors

**Error**: Model cost exceeds budget
- **Cause**: Underestimated token usage, expensive model selected
- **Solution**: Suggest alternative models, optimize prompts
- **Recovery**: Use tiered model approach (cheap for simple, expensive for complex)

**Error**: RAG retrieval quality issues
- **Cause**: Poor embedding choice, inadequate chunking
- **Solution**: Review chunking strategy, test different embeddings
- **Workaround**: Increase retrieved context, add reranking

### Code Generation Errors

**Error**: Cannot generate code for a step
- **Cause**: Insufficient design information, unclear requirements
- **Solution**: Skip step, document as incomplete, continue
- **Recovery**: Return to step after gathering more information

**Error**: Generated code has syntax errors
- **Cause**: Template issues, language-specific problems
- **Solution**: Fix syntax errors, regenerate if needed
- **Validation**: Verify code compiles before proceeding

**Error**: Test generation fails
- **Cause**: Complex logic, missing test framework setup
- **Solution**: Generate basic test structure, mark for manual completion
- **Workaround**: Proceed without tests, add in Operations phase

## Recovery Procedures

### Partial Phase Completion

**Scenario**: Phase was interrupted mid-execution

**Recovery Steps**:
1. Load the phase plan file
2. Identify last completed step (last [x] checkbox)
3. Resume from next uncompleted step
4. Verify all prior steps are actually complete
5. Continue execution normally

### Corrupted State File

**Scenario**: `aicodepath-state.md` is corrupted or inconsistent

**Recovery Steps**:
1. Create backup: `aicodepath-state.md.backup`
2. Ask user which phase they're actually on
3. Regenerate state file from scratch
4. Mark completed phases based on existing artifacts
5. Resume from current phase

### Missing Artifacts

**Scenario**: Required artifacts from prior phase are missing

**Recovery Steps**:
1. Identify which artifacts are missing
2. Determine if they can be regenerated
3. If yes: Return to that phase, regenerate artifacts
4. If no: Ask user to provide information manually
5. Document the gap in `audit.md`

### User Wants to Restart Phase

**Scenario**: User is unhappy with phase results and wants to redo

**Recovery Steps**:
1. Confirm user wants to restart (data will be lost)
2. Archive existing artifacts: `{artifact}.backup`
3. Reset phase status in `aicodepath-state.md`
4. Clear phase checkboxes in plan files
5. Re-execute phase from beginning

### User Wants to Skip Phase

**Scenario**: User wants to skip a phase that was planned

**Recovery Steps**:
1. Confirm user understands implications
2. Document skip reason in `audit.md`
3. Mark phase as "SKIPPED" in `aicodepath-state.md`
4. Proceed to next phase
5. Note: May cause issues in later phases if dependencies missing

## Escalation Guidelines

### When to Ask for User Help

**Immediately**:
- Contradictory or ambiguous user input
- Missing required information
- Technical constraints AI cannot resolve
- Decisions requiring business judgment

**After Attempting Resolution**:
- Repeated errors in same step
- Complex technical issues
- Unusual project structures
- Integration with external systems

### When to Suggest Starting Over

**Consider Fresh Start If**:
- Multiple phases have errors
- State file is severely corrupted
- User cannot provide missing information
- Artifacts are inconsistent across phases

## Logging Requirements

### Error Logging Format

```markdown
## Error - [Phase Name]
**Timestamp**: [ISO timestamp]
**Error Type**: [Critical/High/Medium/Low]
**Description**: [What went wrong]
**Cause**: [Why it happened]
**Resolution**: [How it was resolved]
**Impact**: [Effect on workflow]

---
```

### Recovery Logging Format

```markdown
## Recovery - [Phase Name]
**Timestamp**: [ISO timestamp]
**Issue**: [What needed recovery]
**Recovery Steps**: [What was done]
**Outcome**: [Result of recovery]
**Artifacts Affected**: [List of files]

---
```

## Prevention Best Practices

1. **Validate Early**: Check inputs and dependencies before starting work
2. **Checkpoint Often**: Update checkboxes immediately after completing steps
3. **Communicate Clearly**: Explain what you're doing and why
4. **Ask Questions**: Don't assume - clarify ambiguities immediately
5. **Document Everything**: Log all decisions and changes in `audit.md`
