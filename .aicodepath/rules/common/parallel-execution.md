# Parallel Execution

Rules for when to parallelize tool calls and subagent tasks, and when NOT to.

---

## WHEN TO Parallelize

Parallelize when tasks are **truly independent** — no task reads output produced by another:

| Scenario | Example |
|----------|---------|
| Multiple file reads with no dependencies | Read 5 config files to understand the system |
| Multiple grep/glob searches | Search for patterns in different directories |
| Multiple subagent tasks on separate files | 6 language JSON rule files, each in its own file |
| Analysis of independent modules | Frontend vs backend code review simultaneously |
| Multiple web fetches | Fetching docs for 3 different libraries |

**Signal**: If you could reorder the tasks arbitrarily and still get correct results, they're safe to parallelize.

---

## WHEN NOT TO Parallelize

Never parallelize when tasks have **ordering constraints or shared state**:

| Scenario | Reason |
|----------|--------|
| Task B reads output of Task A | B will read stale/missing data |
| Two agents write to the same file | Write race → file corruption or lost content |
| DB migration then query code | Query must run after schema exists |
| `npm install` then `npm test` | Install must complete before test can run |
| Compile then run | Binary doesn't exist yet |
| Multiple edits to the same file | Last writer wins, earlier writes lost |

**Signal**: If Task B mentions "after Task A" or "using the output of Task A", they're sequential.

---

## Shared File Write Race Avoidance

When parallel workers must update the same file:

1. **Pre-allocate stubs** — write all placeholders in one atomic operation before dispatch
2. **Named stub replacement** — each worker replaces only its own uniquely-named stub
3. **Serialize the merge step** — final cleanup runs as a single post-wave task
4. **Never append** — append operations from parallel writers collide; replace named sections instead

---

## Cost Note

Parallel subagent spawns use separate context windows — each agent costs its own token budget.
Spawning 10 agents for 10 trivial file writes costs ~10× more than doing them sequentially in the main conversation.

**Rule**: Parallelize when the time savings outweigh the token cost. Use parallel agents for tasks that take >30 seconds each (e.g., LLM-heavy analysis), not for simple file writes.
