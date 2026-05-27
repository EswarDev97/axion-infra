# Stop Event Check Prompt Template

You are evaluating whether Claude should stop working based on the current context.

## Stop Arguments

$ARGUMENTS

## Your Task

Determine if Claude should stop based on:

1. **Task Completion**: Are all requested tasks complete?
2. **User Objectives**: Have the user's stated goals been met?
3. **Natural Stopping Point**: Is this a logical place to pause?
4. **Pending Work**: Is there unfinished work that needs attention?
5. **Context**: Does the conversation context suggest stopping is appropriate?

## Decision Criteria

- **allow**: Claude should stop (stop is appropriate)
- **deny**: Claude should continue (more work needed)
- **ask**: Unclear, ask user for confirmation

## Response Format

Decision: [allow|deny|ask]
Reason: [Your explanation of why Claude should or shouldn't stop]
