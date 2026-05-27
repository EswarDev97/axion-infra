# Agent Mutation Strategies

Dimension-specific rewrite strategies for the hill-climbing improve mode.
Loaded before each mutation step. Not loaded at every invocation.

---

## Mutation Strategy: TARGETED (not full rewrite)

Identify the 1–2 lowest-scoring dimensions from the audit.
Rewrite ONLY those sections — preserve everything scoring well.

Full rewrites risk regressing dimensions that were already passing.

---

## Dimension-Specific Strategies

### Weak D1 — Spec Compliance (max 20)

**Goal**: All required fields present and valid; all used optional fields correct; description in CSO trigger format.

Actions:
- Parse frontmatter manually — verify `name` and `description` are present
- Check `name`: lowercase, hyphens only, no spaces or underscores, matches filename
- Rewrite `description` to start with "Use when [conditions]" — not "Reviews code for..."
- Audit every optional field against the live spec field list
- Remove any unrecognized fields (e.g., `role`, `persona`, `expertise`, `version`)
- Verify `model` is one of: `sonnet`, `opus`, `haiku`, `inherit`
- Verify `permissionMode` is one of: `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`

Red flags to fix: name with uppercase or underscores, description that describes capabilities, any field not in the spec schema.

Validation check: Re-parse frontmatter after mutation — zero unrecognized fields, both required fields present and non-empty.

---

### Weak D2 — Domain Expertise (max 20)

**Goal**: Body demonstrates specialist knowledge — specific niche, actionable responsibilities, concrete standards, structured output.

Actions:
- Rewrite Domain paragraph: replace generic "software development" framing with the exact protocols, frameworks, or standards the agent is expert in
- For each Core Responsibility: add a measurable criterion ("Identify N+1 queries in resolver chains" > "Review code quality")
- Rewrite Standards Enforced: replace generic categories with actual `guidelines/<filename>.json` references; add rule IDs where known
- Rewrite Output Format: replace prose descriptions with a structured template showing exact field names and example values
- Test: swap the Domain paragraph into a different agent — if it still makes sense, it is too generic

Red flags to fix: "I help with...", "ensure best practices", "follow guidelines", no guideline filenames, output format described in prose.

Validation check: Domain paragraph contains at least one named protocol/framework/tool. Standards Enforced section contains at least one `guidelines/*.json` filename.

---

### Weak D3 — Tool Appropriateness (max 15)

**Goal**: `tools` list explicitly present and matched to responsibilities; `disallowedTools` used for read-only agents.

Actions:
- Add `tools:` field if missing — never leave it absent (inherits all tools including destructive ones)
- For each bullet in Core Responsibilities, identify which tool it uses — build the tools list from that analysis
- For review-only agents (no writing, no shell): add `disallowedTools: [Write, Edit, Bash]`
- Remove `Bash` if body has no shell command examples
- Remove `WebSearch` if body has no external lookup instructions
- Add `Write` only if body explicitly creates files; add `Edit` only if body explicitly modifies existing files

Matching reference:
- Read-only reviewers → `[Read, Glob, Grep]` + `disallowedTools: [Write, Edit, Bash]`
- Design/document writers → `[Read, Write, Edit, Glob, Grep]`
- Test runners → `[Read, Glob, Grep, Bash]`
- Code generators → `[Read, Write, Edit, Glob, Grep]`

Red flags to fix: No `tools` field at all; `Bash` on a reviewer; `Write` on a read-only auditor.

Validation check: For each tool in `tools`, find at least one body section that uses it. For each body section that uses a tool, verify that tool is in `tools`.

---

### Weak D4 — Integration Completeness (max 15)

**Goal**: Agent registered in DOMAIN_MAPPING, taxonomy, symlinked, and documented.

Actions:
- Open `.aicodepath/hooks/lib/agent-suggester.js` — add at least 2 DOMAIN_MAPPING entries pointing to this agent (using name without `aicodepath-` prefix)
- If agent maps to a new broad violation category, add to VIOLATION_TYPE_MAPPING as well
- Open `.aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md` — add at least one row with the correct Component Type, Phase, and a concise When to Invoke description
- Run `node .aicodepath/bin/aicodepath.js init` to regenerate symlinks
- Create or update `.aicodepath/docs/agents/<name>.md` with usage guide

Red flags to fix: Agent name not found in DOMAIN_MAPPING values, no taxonomy row, symlink absent.

Validation check:
```bash
grep 'your-agent-name' .aicodepath/hooks/lib/agent-suggester.js | grep -v '^//'
grep 'your-agent-name' .aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md
ls .claude/agents/ | grep your-agent-name
```

---

### Weak D5 — Description Trigger Accuracy (max 15)

**Goal**: Description fires precisely for the right tasks and avoids false positives on adjacent domains.

Actions:
- List 5 tasks the agent should handle — verify each is captured by at least one keyword in the description
- List 3 tasks a different (adjacent) agent handles — verify the description does NOT match those
- Add at least 3 domain-specific keywords (protocol names, file types, frameworks, problem names)
- Remove generic phrases: "various tasks", "general assistance", "help with", "support"
- Test the boundary: would `aicodepath-code-reviewer` fire for the same trigger? If yes, make description more specific
- Minimum length: 25 words to carry sufficient signal

Red flags to fix: Description under 20 words, no domain-specific keywords, overlap with description of the nearest adjacent agent.

Validation check: Read the description aloud as "I should invoke this agent when...". If it sounds ambiguous, rewrite. If it sounds overly broad (fires on most tasks), narrow the trigger.

---

### Weak D6 — Prompting Quality (max 15)

**Goal**: Body reads like a senior colleague briefing — direct, specific, no alarm language, no redundancy.

Actions:
- Search body for: "CRITICAL", "MUST", "ALWAYS", "NEVER EVER", "essential", "imperative"
- For each found: replace with a direct statement ("Check [X]" instead of "CRITICAL: You MUST always check [X]")
- Identify any paragraph that restates a rule already stated elsewhere — delete the duplicate
- Replace "consider X" with "do X" or "when Y, do X" — avoid hedging on non-optional instructions
- Replace "please" and "remember to" — state the action directly
- Check for role-play framing ("pretend you are...") — remove and state the behavior directly
- After rewrite: read each section — if it sounds like a warning label, rewrite as a briefing

Red flags to fix: More than 3 instances of emphasis words per section; same instruction in 2+ sections; conditional instructions where the condition always applies.

Validation check: Count "CRITICAL" + "MUST" + "ALWAYS" occurrences — target 0–2 total across the entire body. No instruction appears more than once.

---

## Mutation Output Validation

Always validate the mutated agent file before writing to disk:

```
1. Parse frontmatter block (between --- markers)
   Required: name, description
   If either missing → FAIL → retry with error context

2. Verify name format
   Must match: ^[a-z][a-z0-9-]+$  (lowercase, hyphens, no spaces)
   If not matching → FAIL → fix name

3. Check tools field
   If missing → WARN: "tools field absent — agent inherits all tools"
   Log warning and add tools field if body uses specific tools

4. Check body section presence (all 5 required):
   - Domain section
   - Core Responsibilities section
   - Standards Enforced section
   - How to Work With section
   - Output Format section
   If any missing → FAIL → add missing section

5. Check description format
   If starts with "Reviews", "Performs", "Handles", "A specialist" → WARN
   Log: "Description may describe agent rather than trigger conditions"

6. Check for unrecognized frontmatter fields
   Valid fields: name, description, model, memory, tools, disallowedTools,
                 permissionMode, maxTurns, skills, mcpServers, background, isolation
   Any other field → FAIL → remove unrecognized field
```

Retry format:
```
"Previous mutation produced invalid output:
 [specific violation: e.g., 'tools field missing — agent will inherit all tools']
 Regenerate the mutation fixing this issue while preserving all improvements made."
```

If second attempt also fails → revert to previous version, log failure, continue loop.

---

## TARGETED Mutation Reference

When audit scores are mixed, use this table to identify the minimum change set:

| Weakest dimension | What to rewrite | What to preserve |
|-------------------|-----------------|------------------|
| D1 only | Frontmatter block | Entire body |
| D2 only | Domain + Core Responsibilities + Standards Enforced | Frontmatter, How to Work With, Output Format |
| D3 only | `tools` + `disallowedTools` frontmatter fields | All body sections |
| D4 only | External files (agent-suggester.js, taxonomy.md) — not the agent itself | Agent file unchanged |
| D5 only | `description` field only | All body sections, all other frontmatter |
| D6 only | Body text (tone + redundancy) | Frontmatter, section structure, content facts |
| D1 + D5 | Frontmatter block | Entire body |
| D2 + D6 | Body text only | Frontmatter |
| D3 + D6 | `tools`/`disallowedTools` + body tone | Description, other frontmatter, section structure |
