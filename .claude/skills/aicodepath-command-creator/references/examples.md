# Command Examples

This document provides complete, real-world examples of slash commands adapted for AICodePath projects. Use these as references when creating new commands.

## Example 1: submit-stack (Workflow Automation Pattern)

**Pattern:** Workflow Automation (Analyze → Act → Report)

**Full source:**

```markdown
---
description: Create git commit and submit stack with git workflow
argument-hint: <description>
---

# Submit Stack

Automatically create a git commit with a helpful summary message and submit the entire git stack as pull requests.

## What This Command Does

1. **Analyze changes**: First checks for .PLAN.md file to understand context, otherwise reviews git status and diff
2. **Create commit**: Generates a concise single-sentence commit message summarizing the changes
3. **Submit stack**: Creates/updates PRs for the entire stack using git workflow
4. **Report results**: Shows the submitted PRs and their URLs

## Usage

\`\`\`bash
# With description argument
/submit-stack "Add user authentication feature"

# Without argument (will analyze changes automatically)
/submit-stack
\`\`\`

## Implementation Steps

When this command is invoked:

### 1. Analyze Current Changes

**FIRST**: Check if `.PLAN.md` exists in the repository root:

\`\`\`bash
if [ -f .PLAN.md ]; then
  # Use .PLAN.md for context
else
  # Fall back to git analysis
fi
\`\`\`

If `.PLAN.md` exists:

- Read the plan file to understand what was implemented
- Use the plan's summary and goals to create the commit message

If no `.PLAN.md`:

- Run `git status` and `git diff HEAD` to see changes
- Review the changes to create an accurate summary

### 2. Create Git Commit

Based on the analysis:

- If user provided an argument, use it as the basis for the commit message
- If `.PLAN.md` exists, summarize what was implemented from the plan
- Otherwise, analyze the git changes and create a descriptive single-sentence summary
- Ensure the commit message follows the repository's commit style (check `git log` for patterns)
- **DO NOT include any Claude Code footer or co-authorship attribution**

\`\`\`bash
git add .
git commit -m "[Single sentence summary of what was done]"
\`\`\`

### 3. Submit Stack

Submit all PRs in the stack using your git workflow tool:

\`\`\`bash
# Example with gh CLI
gh pr create --stack

# Or use your project's specific workflow
\`\`\`

### 4. Show Results

After submission, show:

- Number of PRs created/updated
- PR URLs
- Current stack status

## Important Notes

- **Check for .PLAN.md FIRST** before analyzing git changes
- **NEVER run additional exploration commands** beyond checking .PLAN.md, git status/diff/log
- **Stage all changes** with `git add .` before committing
- **Single sentence summary**: Keep commit message concise and focused
- **Follow repo patterns**: Check recent commits with `git log` to match style
- **NO Claude footer**: Do not add any attribution or generated-by footer
- If there are no staged or unstaged changes, report to the user and exit

## Error Handling

If any step fails:

- Report the specific command that failed
- Show the error message
- Ask the user how to proceed (don't retry automatically)

## Example Output

\`\`\`
Analyzing changes...
✓ Found .PLAN.md - using plan context
✓ Found changes in 3 files

Creating commit: "Add aicodepath submit-stack command for automated PR workflow"
✓ Commit created

Submitting stack...
✓ 2 PRs created/updated:
  - PR #123: feature-branch (new)
  - PR #122: base-branch (updated)

Current stack:
◯ feature-branch (current)
◯ base-branch
◉ main
\`\`\`
```

**Key features of this example:**

- Argument handling (optional `<description>`)
- Context file priority check (`.PLAN.md` first)
- Conditional logic based on file existence
- Specific command flags explained
- Clear anti-patterns ("NEVER run additional exploration")
- Expected output format shown

## Example 2: ensure-ci (Iterative Fixing Pattern)

**Pattern:** Iterative Fixing (Run → Parse → Fix → Repeat)

**Full source:**

```markdown
---
description: Run CI checks and iteratively fix issues until all checks pass
---

You are an implementation finalizer. Your task is to run CI checks and iteratively fix any issues until all checks pass successfully.

## Your Mission

Run the full CI pipeline and automatically fix any failures. Keep iterating until all checks pass or you get stuck on an issue that requires human intervention.

## CI Pipeline

Determine the CI command based on project type:

**For projects with Makefile:**
\`\`\`bash
make all-ci
\`\`\`

**For Node.js projects:**
\`\`\`bash
npm run ci
# or
npm test
\`\`\`

**For Python projects:**
\`\`\`bash
pytest && pyright && ruff check
\`\`\`

## Iteration Process

### 1. Initial Run

Start by running the CI command to see the current state.

### 2. Parse Failures

Analyze the output to identify which check(s) failed. Common failure patterns:

- **Lint failures**: Look for linting errors
- **Format failures**: Look for formatting issues
- **Type errors**: Look for type checking failures
- **Test failures**: Look for test assertion errors

### 3. Apply Targeted Fixes

Based on the failure type, apply appropriate fixes:

#### Lint Failures

\`\`\`bash
# For Python
ruff check --fix

# For JavaScript/TypeScript
npm run lint:fix
\`\`\`

#### Format Failures

\`\`\`bash
# For Python
ruff format

# For JavaScript/TypeScript
npm run format
\`\`\`

#### Type Errors

- Use Read tool to examine the file at the reported line number
- Use Edit tool to fix type annotations, add type hints, or fix type mismatches
- Follow the coding standards in AICODEPATH.md or AGENTS.md

#### Test Failures

- Read the test file and source file involved
- Analyze the assertion error or exception
- Edit the source code or test to fix the issue
- Consider if the test is validating correct behavior

### 4. Verify Fix

After applying fixes, run the CI command again to verify.

### 5. Repeat Until Success

Continue the cycle: run → identify failures → fix → verify

## Iteration Control

**Safety Limits:**

- **Maximum iterations**: 10 attempts
- **Stuck detection**: If the same error appears 3 times in a row, stop
- **Progress tracking**: Use TaskCreate/TaskUpdate to show iteration progress

## Progress Reporting

Use TaskCreate/TaskUpdate to track your progress:

\`\`\`
Iteration 1: Fixing lint errors
Iteration 2: Fixing format errors
Iteration 3: Fixing type errors in src/auth/index.ts
Iteration 4: All checks passed
\`\`\`

Update the status as you work through each iteration.

## When to Stop

**SUCCESS**: Stop when CI exits with code 0 (all checks passed)

**STUCK**: Stop and report to user if:

1. You've completed 10 iterations without success
2. The same error persists after 3 fix attempts
3. You encounter an error you cannot automatically fix

## Stuck Reporting Format

If you get stuck, report clearly:

\`\`\`markdown
## Finalization Status: STUCK

I was unable to resolve the following issue after N attempts:

**Check**: [lint/format/type/test]

**Error**:
[Exact error message]

**File**: [file path if applicable]

**Attempted Fixes**:
1. [What you tried first]
2. [What you tried second]
3. [What you tried third]

**Next Steps**:
[Suggest what needs to be done manually]
\`\`\`

## Success Reporting Format

When all checks pass:

\`\`\`markdown
## Finalization Status: SUCCESS

All CI checks passed after N iteration(s):

✓ Lint: PASSED
✓ Format: PASSED
✓ Type Check: PASSED
✓ Tests: PASSED

The code is ready for commit/PR.
\`\`\`

## Important Guidelines

1. **Be systematic**: Fix one type of error at a time
2. **Run full CI**: Always run full CI command, not individual checks
3. **Track progress**: Use TaskCreate/TaskUpdate for every iteration
4. **Don't guess**: Read files before making changes
5. **Follow standards**: Adhere to AICODEPATH.md or AGENTS.md coding standards
6. **Fail gracefully**: Report clearly when stuck
7. **Be efficient**: Use targeted fixes

## Begin Now

Start by running the appropriate CI command and begin the iterative fix process. Track your progress and report your final status clearly.
```

**Key features of this example:**

- Maximum iteration limit (10 attempts)
- Stuck detection (same error 3 times)
- Per-error-type fix instructions
- Task tracking for progress
- Clear success/failure reporting formats
- Detailed example flow showing iterations

## Example 3: create-implementation-plan (Agent Delegation Pattern)

**Pattern:** Agent Delegation (Context → Delegate → Iterate)

**Full source:**

```markdown
---
description: Create an implementation plan using a specialized planning agent
---

## ⚠️ PLANNING-ONLY MODE ACTIVE

I'll help you create an implementation plan using a specialized planning agent. This workflow is designed for **planning only** - no code will be written until the plan is finalized and saved to disk.

### How This Works

1. **You provide context** about what needs to be built
2. **The agent creates a plan** (displayed in terminal for review)
3. **We iterate together** until the plan is perfect
4. **Plan is saved to disk** as a markdown file
5. **Then (and only then)** implementation can begin

### Provide Your Planning Context

You can share:

- A feature you want to implement
- An error message or bug to fix
- Performance issues to optimize
- A refactoring goal
- Any relevant context or requirements

**What would you like to plan?**

---

**IMPORTANT AGENT INSTRUCTIONS:**

When invoking the planning agent:

1. **DO NOT write any code during planning phase**
2. **DO NOT use Edit, Write, or any modification tools**
3. **ONLY output the plan to terminal for iterative review**
4. **ONLY persist to disk after explicit user approval**
5. The agent should remain in "Phase 1: Human-Readable Planning" mode until the user explicitly approves with signals like "looks good", "approved", or "ready to implement"

The goal is to create a comprehensive implementation plan that will be saved as a `.PLAN.md` file at the repository root, which can then guide future implementation work.
```

**Key features of this example:**

- User-facing explanation of the workflow
- Clear phase boundaries (planning vs implementation)
- Explicit anti-patterns ("DO NOT write code")
- User approval trigger ("looks good", "approved")
- Tells agent which specialized agent to invoke
- Specifies where to save output (`.PLAN.md` at root)

## Example 4: aicodepath-review (Simple Execution Pattern)

**Pattern:** Simple Execution (Parse Arguments → Execute → Return Output)

**Minimal example structure:**

```markdown
---
description: Perform a code review using AICodePath standards
argument-hint: [base-branch]
---

# AICodePath Review

Performs a thorough code review of changes between the current branch and the base branch using AICodePath standards.

## What This Command Does

1. Determines base branch (uses provided argument or defaults to main/master)
2. Checks for AICODEPATH.md guidelines
3. Reviews code against project standards
4. Displays review findings and suggestions

## Usage

\`\`\`bash
# With explicit base branch
/aicodepath-review develop

# Without argument (auto-detects main/master)
/aicodepath-review
\`\`\`

## Implementation Steps

### 1. Determine Base Branch

If `[base-branch]` argument is provided:

- Use the specified branch

If no argument:

- Check if `main` branch exists: `git rev-parse --verify main`
- If yes, use `main`
- If no, use `master`

### 2. Check for AICodePath Guidelines

Look for project guidelines in priority order:

1. `AICODEPATH.md` - AICodePath-specific guidelines
2. `aicodepath-docs/docs/coding-standards.md`
3. `AGENTS.md` - coding standards
4. `.github/CONTRIBUTING.md` - contribution guidelines

### 3. Get Changed Files

\`\`\`bash
git diff --name-only [base-branch]..HEAD
\`\`\`

### 4. Review Each File

For each changed file:

- Read the file
- Check against coding standards
- Identify potential issues
- Suggest improvements

### 5. Display Results

Show the review findings:

- Files reviewed
- Issues found (categorized by severity)
- Suggestions for improvements
- Compliance with coding standards

## Error Handling

If any step fails:

- Show the error message
- Check if the base branch exists
- Verify git repository is valid

## Notes

- Square brackets `[base-branch]` indicate optional argument
- Checks AICodePath-specific standards if available
- Provides actionable feedback
```

**Key features of this example:**

- Optional argument handling (square brackets)
- Argument defaulting logic
- AICodePath-specific context checks
- Clear output structure

## Pattern Comparison

| Feature               | submit-stack             | ensure-ci          | create-implementation-plan | aicodepath-review        |
| --------------------- | ------------------------ | ------------------ | -------------------------- | ------------------------ |
| **Pattern**           | Workflow Automation      | Iterative Fixing   | Agent Delegation           | Simple Execution         |
| **Arguments**         | Optional `<description>` | None               | None                       | Optional `[base-branch]` |
| **Context Files**     | Checks `.PLAN.md`        | Checks standards   | None                       | Checks `AICODEPATH.md`   |
| **Iterations**        | Single pass              | Up to 10           | Iterative (user-driven)    | Single pass              |
| **Tool Usage**        | Git commands             | Make, Edit tools   | Task tool (agent)          | Git, Read tools          |
| **Progress Tracking** | Inline reporting         | Task tracking      | None (user reviews)        | None                     |
| **Error Handling**    | Ask user                 | Stop if stuck      | None specified             | Show error message       |
| **Success Criteria**  | PRs submitted            | Exit code 0        | User approves plan         | Review completes         |

## Usage Guidance

**Use submit-stack as a reference when:**

- Command needs to check context files first
- Workflow has clear sequential steps
- Git operations are involved
- Results need clear reporting

**Use ensure-ci as a reference when:**

- Command needs to iterate until success
- Multiple error types need different fixes
- Progress tracking is important
- Stuck detection is needed

**Use create-implementation-plan as a reference when:**

- Command delegates to specialized agent
- User review/approval is required
- No direct code modification should happen
- Output is saved to specific location

**Use aicodepath-review as a reference when:**

- Command is a simple workflow
- Main logic can be direct execution
- Argument handling is straightforward
- Output is structured report
