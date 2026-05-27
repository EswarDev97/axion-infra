# Mutation Playbook

Dimension-specific rewrite strategies and Claude Code feature checklist.
Loaded before each mutation step. Not loaded at every invocation.

---

## Mutation Strategy: TARGETED (not full rewrite)

Identify 1–2 lowest-scoring dimensions from the audit.
Rewrite ONLY those sections — preserve everything scoring well.

---

## Dimension-Specific Strategies

### Weak D1 — Knowledge Delta (max 20)

**Goal:** Every paragraph earns its tokens. >70% Expert content, <10% Redundant.

Actions:
- Tag each section [E] Expert / [A] Activation / [R] Redundant
- Delete all [R] sections without mercy (Claude already knows this)
- Replace generic best-practices with non-obvious trade-offs
- Add decision trees: "When X fails, try Y because Z"
- Add expert-only insights: "NEVER do X because [non-obvious reason]"
- Replace "how to use library X" with domain-specific edge cases

Red flags to remove: "what is X", standard library tutorials, "write clean code"

### Weak D2 — Mindset + Procedures (max 15)

**Goal:** Transfer expert thinking patterns + domain-specific workflows Claude doesn't know.

Actions:
- Add a "Before [action], ask yourself:" thinking framework
- Surface non-obvious step ordering (e.g., "validate BEFORE packing, not after")
- Add critical steps easy to miss in this domain
- Replace generic procedures (open → edit → save) with domain-specific sequences
- Add "Purpose / Constraints / Differentiation" mental checklist for the domain

### Weak D3 — Anti-Pattern Quality (max 15)

**Goal:** Specific NEVER list with WHY per item — not vague warnings.

Actions:
- Each NEVER must have a concrete consequence: "NEVER do X — causes Y failure"
- Replace "avoid X" with "NEVER X — here's what happens when you do"
- Add the failure scenario that makes the anti-pattern dangerous
- Source from: common mistakes in this domain, real-world incidents
- Minimum 4 specific NEVER items, each with WHY

### Weak D4 — Specification Compliance (max 15)

**Goal:** Description = trigger conditions only. All frontmatter valid. Frontmatter matches the live spec.

Actions:
- Rewrite description: "Use when [TRIGGER CONDITIONS]" format only
- Remove any description of what the skill does — only when/why to use it
- Include explicit trigger keywords users actually type
- Check: name ≤ 64 chars, description ≤ 300 chars ideally
- Verify argument-hint matches actual usage
- Verify allowed-tools matches all tools used in body

**If `spec_context` is loaded (live spec was fetched during setup):**
- Cross-check frontmatter field names against the current skills reference — rename any that have changed
- Verify every value in `allowed-tools` is a currently valid tool name
- If `spec_deprecations[]` in state.json is non-empty: scan the skill body for each deprecated pattern and replace with the current alternative from spec_context
- After fixing, clear the entry from `spec_deprecations[]` and log: "Fixed deprecated pattern: [pattern] → [replacement]"

### Weak D5 — Progressive Disclosure (max 15)

**Goal:** Content layered by when it's needed. Detail in references/, not body.

Actions:
- If SKILL.md body > 200 lines: identify sections not needed at every invocation
- Move procedural detail to `references/<topic>.md`
- Add explicit loading trigger in body: "Read `references/X.md` when [condition]"
- Layer 1 (always): what skill does, when to use it, entry point
- Layer 2 (on invocation): key process steps, HARD-GATEs, anti-patterns
- Layer 3 (on demand): detailed procedures, examples, edge cases

### Weak D6 — Freedom Calibration (max 15)

**Goal:** Constraint level matched to task fragility. Not over-constrained, not under.

Over-constrained signals (remove HARD-GATEs):
- Every step has a HARD-GATE (blocks natural judgment)
- Constraints that don't prevent real failure modes
- "MUST" on things that are already natural Claude behavior

Under-constrained signals (add HARD-GATEs):
- Discipline-enforcing skill with no blocking mechanism
- Easy rationalization paths not addressed
- "Should" language on non-negotiable requirements

Fix: Add HARD-GATE only for the top 1–2 real failure modes. Remove the rest.

### Weak D7 — Pattern Recognition (max 10)

**Goal:** Skill structure matches its pattern type.

Identify the skill's type, then align structure:

| Pattern | Structure |
|---------|-----------|
| **Mindset** | Thinking frameworks, mental models, "before you start" questions |
| **Navigation** | Decision trees, "when X do Y", flow diagrams |
| **Philosophy** | Principles with WHY, trade-off tables, what NOT to do |
| **Process** | Ordered steps, checkpoints, evidence requirements |
| **Tool** | Commands, flags, examples, error handling |

Mismatch example: Process skill structured as Philosophy → add ordered steps + checkpoints.

### Weak D8 — Practical Usability (max 15)

**Goal:** Decision trees, fallbacks, edge cases — usable under pressure.

Actions:
- Add "when stuck" table: Problem → Solution
- Add decision tree for the most common branching point
- Add fallback path: "If X fails, do Y instead of Z"
- Add edge case table: edge condition → correct handling
- Replace "consider X" with "if X then Y, else Z"
- Add specific commands, not vague instructions

---

## Claude Code Feature Checklist (every mutation)

Run this check after writing the mutation, before output validation:

```
□ Body > 200 lines?
  → Yes: Is detail that's not needed every invocation moved to references/?
  → If no references/ yet: create it now, add loading trigger

□ references/ files added?
  → Loading trigger present in body for each? ("Read references/X.md when Y")

□ Deterministic/repeatable operations?
  → Should these be in scripts/ instead of inline instructions?

□ allowed-tools in frontmatter?
  → Does it list every tool used in the body? (Read, Write, Bash, WebSearch, Agent, etc.)

□ description field?
  → Is it trigger conditions only? No description of what skill does?
  → Starts with "Use when..." or equivalent?

□ HARD-GATE usage?
  → Only on genuine non-negotiable blockers (1–2 max)?
  → Not on things Claude would do naturally anyway?

□ Rationalization table?
  → Does it address the top failure modes by name?
  → Each excuse → concrete reality response?
```

---

## Mutation Output Validation (before writing)

Always validate generated SKILL.md before writing to disk:

```
1. Parse frontmatter block (between --- markers)
   Required: name, description, user-invocable
   If any missing → FAIL → retry with error context

2. Count body lines (excluding frontmatter)
   If > 500 AND no references/ offloading → FAIL → retry

3. Scan body for tool usage (Read, Write, Bash, WebSearch, Agent, TodoWrite, etc.)
   If tool used but not in allowed-tools → FAIL → retry

4. Scan for "references/<filename>" mentions
   If found → check corresponding loading trigger exists
   If missing trigger → FAIL → retry

5. Check description field
   If starts with "This skill" or "A skill that" → WARN (not FAIL)
   Log: "Description may describe skill rather than trigger conditions"
```

Retry format:
```
"Previous mutation produced invalid output:
 [specific violation: e.g., 'allowed-tools missing WebSearch but body uses it']
 Regenerate the mutation fixing this issue while preserving all improvements made."
```

If second attempt also fails → revert to `best_skill.md`, log, continue loop.
