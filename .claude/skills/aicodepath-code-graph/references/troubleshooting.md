# Code Graph Troubleshooting Reference

Load when a query returns empty or unexpected results.
Do NOT load for routine indexing or standard queries.

---

## Symptom → Cause → Fix

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| `callers_of` / `callees_of` returns empty list | Entity has no tracked call edges | Check: calls to external libs (not indexed), dynamic dispatch, or unsupported call pattern in that language |
| `tests_for` returns empty list | No static call edges to test entities, OR test files excluded | Verify test directory is not in `_DEFAULT_EXCLUDES`: `node_modules`, `.git`, `__pycache__`, `dist`, `build`, `.venv` |
| `impact_radius total = 0` | Entity is a leaf node (no outgoing edges) | Expected — entity only calls external/unindexed code; not a graph error |
| `entity not found` | Qualified name doesn't match — file renamed, or wrong format | Run `search_entities(query="<name>")` first; qualified name format: `repo:package:file_path:ClassName.method_name` |
| `callers_of` returns wrong callers | Bare name passed — matched wrong entity | Always resolve via `search_entities` first; multiple files can define the same function name |
| `visualize_graph` freezes browser | Too many nodes rendered at once | Set `max_nodes=200` or use narrower scope: `package`, `file`, or `impact` |
| `tests_for` misses tests you can see | Dynamic test framework (jest.each, pytest.parametrize) | Static edges only — dynamic runners don't generate call edges; inspect test files manually |
| `file_summary` returns merged results | Path fragment matches multiple files | Use a more specific substring that uniquely identifies one file |
| `diff-reindex` doesn't fix stale data after rename | Old paths persist after directory move | Run full `reindex` (mode B in Step 2B) after structural filesystem changes |
| All queries return empty after `build_or_update_graph` | Build completed but DB shows entities = 0 | Check Python parser installed (`python3 -m py_compile`) and re-run Step 2A |
| Cross-language call missing from graph | IPC / subprocess boundary | Expected — graph only tracks static intra-language edges; Python→TypeScript via subprocess not tracked |
| `impact_radius` times out on large central function | High fan-out node + deep BFS | Reduce `max_hops` to 2–3; or scope query to specific package |

---

## Supported Languages

Python, JavaScript, TypeScript, TSX, Go, Rust, Java, C, C++, Ruby, Kotlin, Swift, PHP

---

## Auto-Indexing Details

The `graph-git-hook` PostToolUse hook auto-triggers `diff-reindex` after:
`git commit` · `git pull` · `git merge` · `git checkout` · `git rebase` · `git stash pop` · `git cherry-pick`

**Important:** Auto-indexing does NOT run on fresh clones. Always check Step 1 in a new environment.
