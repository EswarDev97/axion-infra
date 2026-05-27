---
name: aicodepath-analyze
description: Understand, explain, audit, or assess code — structured analysis with findings, patterns, and risks.
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep, TodoWrite, Skill
argument-hint: "<file, directory, or topic to analyze>"
---

# AICodePath Analyze

## When to Activate

- "analyze this", "explain this code", "what does X do"
- "find issues with", "audit", "review this"
- "what patterns are used", "how is X structured"
- "how does X work", "explain X workflow", "walk me through X", "trace X flow"
- "tell me how X works", "what happens when X is triggered"
- Understanding an end-to-end feature flow (workflow, pipeline, job, process)
- OPERATIONS phase: diagnosing performance, security, or architecture problems
- Before refactoring: understand what exists before changing it

## Analysis Types

### Code Analysis
Understand what code does and how it fits in the system:
1. Read the target file(s) with full context
2. Trace call paths in and out
3. Identify patterns, abstractions, and dependencies
4. Note deviations from project conventions

### Codebase Audit
Systematic assessment across multiple files:
1. Glob to find all relevant files
2. Grep for patterns (anti-patterns, conventions, inconsistencies)
3. Read representative samples
4. Synthesize findings with counts and file:line refs

### Architecture Analysis
Understand system structure:
1. Map layers (API → service → data)
2. Identify coupling and dependency directions
3. Find violation of layering or separation of concerns
4. Compare against CLAUDE.md / DEVELOPER-GUIDE.md rules

### Workflow / Flow Analysis
Trace how a named feature, workflow, or process executes end-to-end:

1. Identify the likely entry point from the query (function name, class, route, event)
2. Check if the code graph is indexed:
   ```bash
   python3 -c "
   import sqlite3, os
   db = os.path.join('aicodepath-docs', 'aicodepath.db')
   if not os.path.exists(db):
       print('NOT_INDEXED')
   else:
       conn = sqlite3.connect(db)
       n = conn.execute('SELECT COUNT(*) FROM code_entities').fetchone()[0]
       conn.close()
       print(f'INDEXED:{n}')
   "
   ```
3. **If indexed (entities > 0)**: Delegate to the code graph skill:
   ```
   Use Skill tool → /aicodepath-code-graph
   Run: search_entities(query="<entry point>") → callees_of(qualified_name, max_depth=4)
   ```
   Present the result as a numbered execution sequence with file:line at each step.
4. **If not indexed**: Inform the user. Offer to build the graph via `/aicodepath-code-graph`.
   Fall back to manual tracing: Grep → Read → follow call chain. Mark output as "manual trace
   (graph traversal unavailable)".
5. Output format: numbered flow "1 → 2 → 3 → ..." with brief description + file:line per step.

### Performance Analysis
Find bottlenecks:
1. Identify hot paths (high-frequency call sites)
2. Look for N+1 queries, unbounded loops, large allocations
3. Find sync operations that should be async
4. Check caching opportunities

## Output Format

```markdown
## Analysis: [Target]

### Summary
[2-3 sentence executive summary]

### Findings

| # | Finding | Severity | Location |
|---|---------|----------|---------|
| 1 | [finding] | HIGH/MED/LOW/INFO | file:line |

### Key Patterns
- [Pattern 1]: [description + example location]

### Risks
- [Risk]: [what could go wrong + conditions]

### Recommendations
1. [Actionable recommendation with file:line target]

### What NOT to Change
- [Things that look odd but are intentional]
```

## Analysis Depth

| Trigger | Depth | Strategy |
|---------|-------|---------|
| Single file | Focused | Read full file, trace 1 level out |
| Module/feature | Moderate | Read all files, grep for usages |
| Full codebase audit | Comprehensive | Explore agent + pattern grep |
| Security audit | Maximum | Check all input surfaces, auth gates, DB queries |
| Workflow / flow question | Structured | Identify entry point → code graph callees_of (indexed) or Grep fallback |

## Red Flags — Poor Analysis

- Summarizing code without reading it ("this probably does X")
- Missing the non-obvious parts (the interesting code is usually the edge cases)
- Generic recommendations not tied to specific file:line
- Confusing "what it does" with "whether it's correct"
- Not checking how it's actually used (call sites)

## Integration

```
/aicodepath-analyze → (findings) → /aicodepath-brainstorm → /aicodepath-write-plan
/aicodepath-analyze (workflow query) → /aicodepath-code-graph (callees_of chain) → numbered flow explanation
```

For large codebases: use `/aicodepath-codebase-pattern-finder` first to map structure,
then `/aicodepath-analyze` for deep-dive on specific areas.
