# Claude Code Speed Optimization

**Source**: https://claudefa.st/blog/guide/performance/speed-optimization
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM]

## Problem & Quick Win

**Problem**: Claude Code feels slow, taking too long to respond to your requests.

**Quick Win**: Switch to a faster model for simple tasks with `/model haiku`. Haiku responds
significantly faster than Sonnet for straightforward questions like syntax help, quick
explanations, or simple code generation.

## Speed depends on three factors you control

Model selection, context size, and prompt specificity.

## Response Time Killers

- **Bloated context** — Long sessions accumulate context that slows everything down.
- **Model mismatch** — Using Claude Sonnet for basic questions is like driving a truck to the
  corner store.
- **Vague prompts** — "help me with this code" forces Claude to guess. Specific requests get
  faster, more accurate responses.

## The 3-Round Optimization Process

### Round 1: Model Selection

```
/model haiku    # Quick questions, syntax help, simple edits
/model sonnet   # Complex refactoring, architecture decisions
```

Switch to Haiku for quick answers, then back to Sonnet for deep reasoning. No restart needed.

### Round 2: Context Management

```
/compact        # Compress conversation history when it grows large
/clear          # Start fresh when switching to unrelated tasks
```

Use `/compact` when responses slow down — it summarizes while preserving key context.

### Round 3: Write Specific Prompts

**Slow** → **Fast**:

- "Fix this function" → "Add null check for the user parameter in handleSubmit"
- "Help me with the database" → "Write a Prisma query to fetch users with their posts, ordered by createdAt desc"

Specific prompts eliminate back-and-forth clarification, often cutting total interaction time
in half.

## Advanced Techniques

- **Parallel sessions**: Open multiple terminal windows for independent tasks. Work on
  frontend in one session while Claude handles backend in another.
- **Batch related tasks**: combine three requests into one numbered list.
  ```
  "In the UserProfile component:
  1. Add loading state
  2. Handle the error case
  3. Add the avatar upload button"
  ```
- **CLAUDE.md patterns**: Define project-specific patterns so Claude doesn't re-explain them
  every session.
- **Shell aliases**:
  ```
  alias cc="claude"
  alias cch="claude --model haiku"
  ```

## Cost-Speed Balance

Faster responses typically mean lower token usage, reduced model costs with strategic Haiku
use, higher productivity per dollar, and less context accumulation.

## When Speed Matters Most

- Tight feedback loops during active debugging
- Exploration phase — faster responses encourage more experimentation
- Code reviews — quick responses help maintain context

## Common Mistakes

- Never compacting — letting context grow unbounded until responses crawl
- Sonnet for everything when Haiku suffices
- Serial thinking — waiting for one response before starting the next task
- Vague requests — making Claude guess

## Success Verification

You're optimized when:
- Simple questions get answered almost instantly with Haiku
- You `/compact` before context bloat
- You run parallel sessions for independent work
- Your development rhythm stays uninterrupted
