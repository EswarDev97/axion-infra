# Claude Code Agent Patterns: Six Orchestration Strategies

**Source**: https://claudefa.st/blog/guide/agents/agent-patterns
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM]

> Six agent orchestration patterns. Each fits different situations. Pick the wrong one and
> you waste tokens, create merge conflicts, or get inconsistent output.

## 1. The Orchestrator Pattern

A central AI thread coordinates specialist agents. **Doesn't write code itself.** It plans,
delegates, reviews, and routes.

**When to use**: Multi-domain features that need coordination across frontend, backend, and
database. Any task where someone needs to see the big picture.

**How it works**: Your main chat session becomes the orchestrator. It reads the requirements,
creates a plan, then uses the Task tool to dispatch specialists. When results come back, it
reviews them and decides what happens next.

```
You are the orchestrator. For this feature request, create a plan that:
1. Breaks the work into domain-specific tasks
2. Identifies dependencies between tasks
3. Dispatches each task to a sub-agent with explicit file scope
4. Reviews outputs before marking complete

Do NOT write implementation code yourself. Coordinate only.
```

**Don't use for**: Simple tasks a single agent handles in one pass.

## 2. The Fan-Out / Fan-In Pattern

Dispatch multiple agents in parallel, then merge results into a single output.

**When to use**: Research tasks, multi-file analysis, any work where agents operate on
independent inputs. Code reviews across separate modules. Gathering information from
different parts of a codebase before making a decision.

**How it works**: Multiple Task tool calls in a single message. Each agent reads different
files or analyzes a different concern. When all return, central thread synthesizes.

```
Complete these 4 tasks using parallel sub-agents:

1. Read src/api/ and list all endpoints missing input validation
2. Read src/auth/ and identify any hardcoded secrets or weak patterns
3. Read src/db/ and check for missing indexes on frequently queried columns
4. Read src/utils/ and flag any functions with no error handling

After all agents report back, synthesize findings into a prioritized action list.
```

**The fan-in phase is where value gets created** — the orchestrator spots connections between
findings that no individual agent saw.

**Don't use for**: Agents that need to modify the same files.

## 3. The Validation Chain Pattern

A builder agent creates code. A separate validator agent checks it. They never overlap roles.

**When to use**: Production code changes, security-sensitive work, anything where incorrect
output has high cost.

**How it works**: Two tasks with a dependency. Builder writes code. Validator runs after,
reads output, runs tests, reports issues without modifying files.

```
TaskCreate(
  subject="Build payment webhook handler",
  description="Create Stripe webhook handler in src/api/webhooks/stripe.ts.
  Handle checkout.session.completed, payment_intent.failed events.
  Verify webhook signatures. Include error handling."
)

TaskCreate(
  subject="Validate payment webhook handler",
  description="Read src/api/webhooks/stripe.ts. Verify:
  - Webhook signature verification exists
  - Both event types handled with proper responses
  - Error handling covers malformed payloads
  - No hardcoded secrets
  Report issues only. Do NOT modify any files."
)

TaskUpdate(taskId="2", addBlockedBy=["1"])
```

Validator starts with fresh eyes. Doesn't share builder's assumptions or blind spots. If
validator finds problems, it creates a fix task that routes back to a builder. New validator
chains behind that fix. Cycle narrows until output is correct.

**Don't use for**: Rapid prototyping where speed matters more than correctness.

## 4. The Specialist Routing Pattern

Match tasks to domain-expert agents. Frontend task → frontend specialist. DB migration → DB
expert.

**When to use**: Large projects with multiple domains and established conventions per domain.

**How it works**: Define specialist agents in `.claude/agents/` or encode routing rules in
CLAUDE.md. Orchestrator identifies domain, dispatches appropriately.

```
<!-- In CLAUDE.md -->

## Agent Routing Table

| Task Domain | Route To            | File Scope           |
| ----------- | ------------------- | -------------------- |
| React/UI    | frontend-specialist | src/components/      |
| API routes  | backend-engineer    | src/api/, src/lib/   |
| Database    | database-specialist | src/db/, migrations/ |
| Security    | security-auditor    | Any (read-only)      |
| Tests       | quality-engineer    | tests/, **tests**/   |
```

Scales well — adding a new domain = new agent definition + new routing row. No rewriting
existing agents.

**Don't use for**: Small projects with a single domain.

## 5. The Progressive Refinement Pattern

Start with a rough draft, then improve through multiple passes. Each pass focuses on a
different quality dimension.

**When to use**: Content generation, complex code architecture, any task where getting it
right the first time is unlikely. Blog posts, API schemas, configuration files.

**How it works**: Chain agents sequentially. Each takes the previous output and refines one
aspect.

```
Phase 1 - Draft: "Generate the initial API schema for a task management
system. Include all entities, relationships, and basic validation rules."

Phase 2 - Security review: "Review this schema. Add authentication
requirements, permission checks, and input sanitization rules.
Don't change the core structure."

Phase 3 - Performance review: "Review the schema for performance.
Add indexes, identify N+1 query risks, suggest denormalization
where read performance matters."

Phase 4 - Final validation: "Verify the schema is consistent.
Check that all referenced entities exist, foreign keys are valid,
and naming conventions are uniform."
```

Each phase has a narrow focus. No single agent tries to handle all concerns at once. Mirrors
how experienced developers work: draft → correctness review → performance review → polish.

**Don't use for**: Tasks that must be done in one shot.

## 6. The Watchdog Pattern

Background agents that monitor for specific conditions and alert/act when triggered. Run
continuously alongside your main work.

**When to use**: Long-running sessions where drift is possible. Monitoring context health,
checking for regressions during refactoring, watching for build failures while you work on
something else.

**How it works**: Background a monitoring agent with `Ctrl+B` and continue working. Watchdog
periodically checks its assigned condition. Results surface in task list.

```
Background task: Monitor the test suite while I refactor the auth module.
Every time I complete a change, run the test suite for src/auth/.
If any test fails, immediately create a task with:
- Which test failed
- The assertion error
- Which file I likely broke based on the test name
```

The **context recovery hook** is a watchdog pattern at infrastructure level — monitors
utilization, triggers recovery actions when window fills.

**Don't use for**: Short sessions where monitoring overhead exceeds value.

## Combining Patterns

Real projects don't use a single pattern. Typical complex feature:

1. **Orchestrator** reads requirements and creates a plan
2. **Specialist routing** dispatches tasks to domain experts
3. **Fan-out** runs independent domain tasks in parallel
4. **Validation chains** verify each specialist's output
5. **Progressive refinement** polishes the integrated result
6. **Watchdog** monitors the test suite throughout

**Key skill**: recognize which pattern fits the current task. Start with the simplest pattern
that could work. Add complexity only when simpler patterns fail.
