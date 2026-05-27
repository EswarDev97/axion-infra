# Lessons Learned

Rules for capturing, storing, and retrieving project-specific lessons in `knowledge.md`.

---

## Auto-Extraction Triggers

A lesson should be extracted and written to `aicodepath-docs/knowledge.md` when:

| Trigger | Example |
|---------|---------|
| **GICL learn phase** | After a GICL session reaches ≥90 score — extract what drove the improvement |
| **`/aicodepath-verify` failure** | If verify fails and you find the root cause — document the root cause pattern |
| **Post-commit** (`/aicodepath-learn`) | After a commit — capture any non-obvious decision made |
| **Repeating workaround** | When you apply the same fix for the 2nd time in a session |
| **API quirk discovered** | When a library behaves differently from its docs |
| **Convention clarified** | When the team's actual convention differs from what you assumed |

---

## What TO Capture

Lessons worth keeping in `knowledge.md`:

- **Project conventions** not documented elsewhere (naming, file layout, auth pattern)
- **API quirks** specific to this project's version/configuration (e.g., "this ORM requires explicit `await` on `.save()`")
- **Repeating workarounds** that will likely be needed again (e.g., "always use `--force` flag with this CLI tool on WSL")
- **Non-obvious dependencies** between components ("changing X requires regenerating Y")
- **Failed approaches** with reasons (prevents rediscovering a dead end)
- **Performance gotchas** specific to this codebase (e.g., "N+1 query in UserService.findAll")

---

## What NOT TO Capture

> Rule: capture what NOT to capture is as important as what to capture — low-signal entries dilute the knowledge base.

Do NOT pollute `knowledge.md` with:

- General programming best practices (e.g., "use async/await", "prefer const over let")
- One-time fixes specific to a single session's state
- Information already in the codebase (README, comments, existing docs)
- Framework documentation that belongs in official docs
- Decisions that are obvious from reading the code

---

## knowledge.md Entry Format

Each entry must be self-contained and actionable:

```markdown
## [YYYY-MM-DD] <short title>

**Context**: What was happening when this was discovered.
**Finding**: The non-obvious thing learned.
**Action**: What to do differently next time (imperative).
**Source**: GICL session / verify failure / post-commit / manual

---
```

### Example

```markdown
## [2026-03-26] ORM requires explicit transaction commit in test teardown

**Context**: Integration tests were leaving dirty state after failures.
**Finding**: The ORM's auto-rollback only runs if the connection is closed cleanly;
abrupt test exits leave transactions open.
**Action**: Always call `await db.rollback()` in `afterEach` — do not rely on ORM auto-cleanup.
**Source**: GICL session (iteration 3 flagged persistent test pollution)

---
```

---

## Integration

- `/aicodepath-knowledge`: reads `knowledge.md` at session start
- `/aicodepath-learn`: invoked post-commit to extract and write lessons
- `/aicodepath-gicl-start`: GICL loop writes lessons at the Learn phase
- `/aicodepath-verify`: triggers lesson extraction on failure root-cause discovery
