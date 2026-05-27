# Claude Code Team Orchestration: Builder-Validator Patterns

**Source**: https://claudefa.st/blog/guide/agents/team-orchestration
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM]

> **Scope note**: This post covers the **DIY approach using Task tools**, which works without
> any experimental features enabled. For the native **Agent Teams** feature, see
> `agents/agent-teams.md`.

## Problem & Quick Win

**Problem**: Spawning parallel Claude Code agents is fast, but without structured roles,
agents produce inconsistent output that requires manual line-by-line review. You need agents
that check each other's work.

**Quick Win**: Builder-validator chain. Validator runs read-only after builder finishes.

```
TaskCreate(subject="Build auth middleware",
           description="Create JWT validation middleware in src/middleware/auth.ts.
                        Export verifyToken and requireAuth functions.")

TaskCreate(subject="Validate auth middleware",
           description="Read src/middleware/auth.ts. Verify: exports exist,
                        error handling covers expired/malformed tokens,
                        no hardcoded secrets. Report issues only.
                        Do NOT modify files.")

TaskUpdate(taskId="2", addBlockedBy=["1"])
```

Task 2 won't start until Task 1 completes. Validator reads but never writes.

## Why Pairs Beat Solo Agents

An agent that builds code can't objectively review its own output. Same blind spots created
the bugs. Pairing a builder with an independent validator catches issues the builder missed
because the validator starts **fresh**, with no context about implementation shortcuts or
assumptions. Mirrors how human teams work.

## The Builder-Validator Pattern

**Builder prompt** — scoped to creation:

```
You are a builder agent. Your job:

1. Read the task description carefully
2. Implement the solution in the specified files
3. Run any relevant tests
4. Mark your task complete

Rules:

- Only modify files listed in your task
- Do not modify test files (validators handle test verification)
- If you hit a blocker, document it in the task description and mark complete
```

**Validator prompt** — scoped to verification:

```
You are a validator agent. Your job:

1. Read all files the builder created or modified
2. Check against the acceptance criteria in the task description
3. Run the test suite
4. Report findings as a new task if issues exist

Rules:

- Do NOT modify any source files
- Do NOT create new implementation code
- You may only create or update task entries to report issues
- Use Read and Bash (for tests) only - never Edit or Write
```

Key constraint: **validators cannot write code.** Forces them to surface problems instead of
silently "fixing." Enforce at tool level using `.claude/agents/` definitions with
`disallowedTools` (`Edit`, `Write`).

## Dependency Chains for Build-Then-Validate

`addBlockedBy` parameter makes this pattern work:

```
// Phase 1: Parallel builders
TaskCreate(subject="Build user API routes", description="Create CRUD endpoints in src/api/users.ts...")
TaskCreate(subject="Build user database schema", description="Create migration in src/db/migrations/...")

// Phase 2: Validators blocked by their builders
TaskCreate(subject="Validate API routes", description="Read src/api/users.ts. Verify REST conventions...")
TaskCreate(subject="Validate database schema", description="Read migration files. Verify column types...")

TaskUpdate(taskId="3", addBlockedBy=["1"])
TaskUpdate(taskId="4", addBlockedBy=["2"])
```

Cross-cutting validation — multiple blockers:

```
TaskCreate(subject="Integration validation",
           description="Verify API routes correctly reference the database schema.
                        Check that all referenced tables and columns exist.")
TaskUpdate(taskId="5", addBlockedBy=["1", "2"])
```

## Meta-Prompt: Generate Team Plans From Requirements

Add to `CLAUDE.md`:

```
## Team Plan Generation

When I say "team plan: [feature]", generate a task structure:

For each component:

1. TaskCreate a builder task with specific files and acceptance criteria
2. TaskCreate a validator task scoped to read-only verification
3. TaskUpdate to chain validator behind its builder

After all component pairs, add one integration validator blocked by ALL builders.

Format each task description with:

- **Files**: exact paths to create or read
- **Criteria**: measurable acceptance conditions
- **Constraints**: what this agent must NOT do
```

Then "team plan: add Stripe webhook handler." generates the full task dependency graph.

## Resuming Failed Validations

```
// Validator found missing error handling
TaskCreate(subject="Fix: add error handling to user API",
           description="The GET /users/:id endpoint returns 500 on invalid ID format.
                        Add input validation and return 400 for malformed IDs.")
TaskCreate(subject="Re-validate user API error handling",
           description="Verify GET /users/:id returns 400 for non-UUID strings,
                        404 for valid UUID not found, 200 for valid existing user.")
TaskUpdate(taskId="7", addBlockedBy=["6"])
```

Each cycle narrows scope. First builder handles full feature. Fix builders handle specific
issues. Feedback loop converges toward correct output.

## Start With One Pair

Don't restructure your entire workflow. Pick your next feature that touches 2+ files. Create
one builder task + one validator task with `addBlockedBy`. Watch the validator catch
something the builder missed.

Once pattern works, scale it: parallel builders with chained validators, meta-prompts for
automatic plan generation, integration validators that verify components work together.
