# Agent Audit Rubric — Detailed Scoring Guide

Read this file when scoring a hook across all six dimensions. **Score by working through the checklist for each dimension — do not estimate from the qualitative band alone.** The checklist produces the score; the band is calibration context only.

Total: 100 points. Grading: A=90+, B=80–89, C=70–79, D=60–69, F<60.

---

## Scoring Protocol

For every dimension:
1. **Enumerate evidence** — quote the specific lines that satisfy or fail each criterion
2. **Apply the checklist** — assign points per criterion, then sum
3. **Record score** — total of checklist items (not a band estimate)

---

## D1: Spec Compliance (20 points)

Does the agent's frontmatter conform to the live spec? Are all required fields present and all optional fields used correctly?

**Live spec reference**: https://docs.anthropic.com/en/docs/claude-code/sub-agents

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| `name` present, lowercase, hyphens only, no spaces/underscores | +3 | Read frontmatter |
| `name` matches the filename (minus `.md`) | +2 | Compare filename to name field |
| `description` present | +1 | Read frontmatter |
| `description` uses "Use when [trigger conditions]" format — not "Does X" or "Helps with X" | +4 | First two words test: starts with "Use when" or equivalent trigger phrase |
| No unrecognized frontmatter fields (no `role`, `persona`, `version`, `author`) | +3 | Cross-check every field against allowed list |
| `tools` or `disallowedTools` explicitly declared (not relying on full inheritance) | +3 | Field present in frontmatter |
| `model` value valid if present (`sonnet`, `opus`, `haiku`, `inherit`) | +2 | Check against allowed values |
| Other optional fields valid if present (`permissionMode`, `maxTurns`, `skills`, etc.) | +2 | Each field cross-checked against spec |

**Total: 20**

**Red flags** (set entire D1 to ≤5 if any present):
- Name contains spaces, uppercase, or underscores
- `description` describes what the agent does instead of when to invoke it
- Fields outside the allowed set present
- `model` set to an invalid value (e.g., `gpt-4`, `claude-3`)
- `permissionMode: dontAsk` on agent reading sensitive files without `disallowedTools` guard

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 16–20 | All fields valid, description uses trigger format, no unrecognized fields |
| 11–15 | Required fields valid; optional fields present but some incorrect |
| 6–10 | Required fields present but malformed |
| 0–5 | Missing required fields or invalid field names |

---

## D2: Domain Expertise (20 points)

Does the agent body demonstrate genuine specialist knowledge? Is the content concrete and actionable rather than generic?

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| Domain paragraph names a specific niche — not "software development" or "code quality" | +4 | Quote the domain line; would it apply to any dev agent? If yes: 0 pts |
| Domain does NOT use "I help with…" / "I am responsible for…" framing | +2 | Grep body for those phrases |
| Core Responsibilities are measurable and observable — no "ensure", "help", "support" without concrete action | +4 | Each responsibility must describe an observable output |
| Standards Enforced references actual guideline filenames (`guidelines/*.json`, rule IDs) | +4 | At least one filename or rule ID cited |
| Output Format is a concrete template — not a prose description of what will be reported | +4 | Shows field names, types, and/or example output |
| Output Format includes a filled-in example (not just field names) | +2 | Find actual example values, not placeholders |

**Total: 20**

**Section quality reference** (use to calibrate each criterion above):

| Section | Low quality (0 pts) | High quality (full pts) |
|---------|---------------------|------------------------|
| Domain | "I help with code quality and best practices" | "Specialist in GraphQL schema design, resolver optimization, and N+1 query prevention using DataLoader patterns" |
| Responsibilities | "Review code quality" | "Identify N+1 queries in resolver chains; enforce DataLoader batching when fetching related records" |
| Standards | "Follow best practices" | References `guidelines/api-design-rules.json` rules `API-003`, `API-007` by name |
| Output Format | "Provide a report with findings" | Shows exact format with field names, types, and filled-in example |

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 16–20 | Every section earns tokens — precise domain, measurable responsibilities, actual filenames, concrete template with example |
| 11–15 | Domain specific; most responsibilities actionable; some standards referenced |
| 6–10 | Has domain terms but surface-level; reads like a job description |
| 0–5 | Generic — could apply to any agent |

---

## D3: Tool Appropriateness (15 points)

Are the tools explicitly and correctly scoped to match the agent's stated responsibilities?

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| `tools` field explicitly present (not relying on full tool inheritance) | +4 | Field in frontmatter |
| Every tool in the list maps to a body section that uses it | +4 | For each tool, find the body section; unmatched tools = 0 pts each |
| No incorrect tools for stated responsibility (e.g., `Write`/`Edit` on a read-only reviewer) | +4 | Apply matching rules table below |
| `disallowedTools` present if agent is described as read-only or reviewer | +3 | Field present when applicable |

**Total: 15**

**Matching rules**:

| Responsibility | Should include | Should NOT include |
|----------------|----------------|-------------------|
| Read code to review | `Read`, `Glob`, `Grep` | `Write`, `Edit`, `Bash` |
| Write design documents | `Write`, `Edit` | `Bash` (unless running validators) |
| Run test suite | `Bash` | `Write` (tests should be pre-written) |
| Search for patterns | `Grep`, `Glob` | `WebSearch` (unless external lookups justified) |
| Generate code | `Write`, `Edit`, `Read` | `WebSearch` (use MCP for docs) |

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 13–15 | Tool list matches responsibilities exactly; `disallowedTools` enforces constraints |
| 9–12 | Tool list matches most responsibilities; minor over- or under-inclusion |
| 5–8 | `tools` present but too broad |
| 0–4 | No `tools` field, or tools contradict responsibilities |

---

## D4: Integration Completeness (18 points)

Is the agent fully wired into the AICodePath registration system?

### Scoring Checklist

| Step | File | Criterion | Points |
|------|------|-----------|--------|
| 1 | `hooks/lib/agent-suggester.js` DOMAIN_MAPPING | Agent name appears as value for ≥1 key | +4 |
| 2 | `agent-taxonomy.md` | Row present with correct Component Type (narrowest type, not `all` unless truly cross-cutting) | +3 |
| 3 | `agent-taxonomy.md` | Phase column correct (comma-separated if multi-phase) | +2 |
| 4 | `agent-taxonomy.md` | "When to Invoke" description present and specific | +2 |
| 5 | `.claude/agents/<name>.md` | Symlink exists (created by `aicodepath init`) | +2 |
| 6 | `docs/agents/<name>.md` | Documentation file created or updated | +2 |
| 7 | Agent frontmatter | `plugin_pack` field present (valid enum value or `null`) | +1 |
| 8 | Plugin pack manifest | If `plugin_pack` is non-null, agent listed in `packs/<pack>/plugin.json` `.agents` array | +1 |
| 9 | Marketplace | Pack referenced in `.aicodepath/.claude-plugin/marketplace.json` plugins list | +1 |

**Total: 18**

**Evaluation commands**:
```bash
# Step 1: check DOMAIN_MAPPING
grep "agent-name" .aicodepath/hooks/lib/agent-suggester.js

# Step 2–4: check taxonomy
grep "agent-name" .aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md

# Step 5: check symlink
ls -la .claude/agents/agent-name.md
```

---

## D5: Description Trigger Accuracy (15 points)

Does the `description` field reliably fire for the right tasks and stay silent for the wrong ones?

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| ≥3 domain-specific trigger keywords (framework names, protocols, file types, specific operations) | +4 | Count distinct domain terms a user would naturally say |
| "Use when [specific condition]" format — condition describes a concrete situation | +3 | Paraphrase the trigger condition; is it specific enough to exclude adjacent agents? |
| No collision-prone phrases: "various tasks", "general assistance", "help with", "support" | +3 | Grep for these phrases |
| Description ≥20 words | +2 | Word count |
| Positive triggers do not substantially overlap with an adjacent agent's description | +3 | Compare description to nearest adjacent agent |

**Total: 15**

**Keyword specificity test**:

| Too generic (0 pts) | Better (+1 pt each) | Best (+2 pts each) |
|---------------------|---------------------|--------------------|
| "code review" | "security code review" | "review for SQL injection, XSS, auth bypasses, OWASP Top 10" |
| "database work" | "database schema design" | "design PostgreSQL schema, migrations, and index strategy" |
| "API design" | "REST API design" | "REST API contract with OpenAPI spec and versioning strategy" |

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 13–15 | Precise keywords, clear positive/negative boundary, no collision |
| 9–12 | Good accuracy; minor collision or slightly weak negative boundary |
| 5–8 | Triggers on most correct cases but has false positives or misses |
| 0–4 | So generic it triggers on everything, or so narrow it never triggers |

---

## D6: Prompting Quality (12 points)

Does the agent body follow Claude 4.6 best practices? Is the tone constructive and the instruction style clear?

**Live spec reference**: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| Count of "CRITICAL:", "MUST" (not "MUST NOT"), "ALWAYS", "NEVER EVER": 0 instances → +4; 1–2 → +2; 3–5 → +1; >5 → 0 | +4 | Grep and count |
| No repeated instructions — same rule stated only once, in the most relevant section | +2 | Scan for duplicate rules across sections |
| No sections explaining things Claude already knows ("remember to read files before editing") | +2 | Tag redundant content; deduct if found |
| Instructions are direct statements, not warning-wrapped imperatives | +4 | Read tone: "colleague briefing" vs "warning label" |

**Total: 12**

**Claude 4.6 practice reference** (use to calibrate):

| Practice | Bad example (deduct) | Good example |
|----------|----------------------|--------------|
| Avoid aggressive tone | "CRITICAL: You MUST ALWAYS validate" | "Validate input at all external boundaries" |
| Be direct | "Please carefully consider reviewing" | "Review for [specific criteria]" |
| No redundancy | Same rule restated 3× | State each rule once |
| Specific over vague | "Be thorough" | "Check every public API endpoint for auth enforcement" |
| No lecturing | "As an AI, you should remember that..." | [Omit entirely] |

**Calibration band** (reference only):
| Score | Indicator |
|-------|-----------|
| 10–12 | Direct, specific, no aggressive language, no redundancy, exemplary Claude 4.6 framing |
| 7–9 | Clear instructions; occasional legacy patterns remain |
| 4–6 | Mostly clear but with unnecessary repetition or some aggressive language |
| 0–3 | Aggressive language throughout; redundant instructions; contradictory guidance |

---

## Quick Reference Scoring Sheet

```
D1: Spec Compliance                ___/20
  name valid + matches filename:   ___/5
  description trigger format:      ___/4  (starts with "Use when...")
  No unrecognized fields:          ___/3
  tools/disallowedTools declared:  ___/3
  model valid if present:          ___/2
  other optional fields valid:     ___/2  (N/A = full credit)
  Red flag override to ≤5?         [Y/N]

D2: Domain Expertise               ___/20
  Specific niche named:            ___/4
  No "I help with" framing:        ___/2
  Responsibilities measurable:     ___/4
  Standards cite filenames:        ___/4
  Output Format concrete:          ___/4
  Output Format has example:       ___/2

D3: Tool Appropriateness           ___/15
  tools field present:             ___/4
  Each tool maps to body section:  ___/4
  No incorrect tools:              ___/4
  disallowedTools on read-only:    ___/3  (N/A = full credit)

D4: Integration Completeness       ___/18
  DOMAIN_MAPPING entry:            ___/4
  Taxonomy Component Type:         ___/3
  Taxonomy Phase:                  ___/2
  Taxonomy When to Invoke:         ___/2
  Symlink in .claude/agents/:      ___/2
  Docs file exists:                ___/2
  plugin_pack field present:       ___/1
  Agent in pack manifest:          ___/1
  Pack in marketplace.json:        ___/1

D5: Description Trigger Accuracy   ___/15
  ≥3 domain keywords:              ___/4
  "Use when" specific condition:   ___/3
  No collision-prone phrases:      ___/3
  Description ≥20 words:           ___/2
  No overlap with adjacent agent:  ___/3

D6: Prompting Quality              ___/12
  Aggressive language count→pts:   ___/4
  No repeated instructions:        ___/2
  No redundant basics:             ___/2
  Direct tone (not warning-laden): ___/4

TOTAL:                             ___/100
```

---

## Common Failure Patterns

### Pattern 1: The Generic Agent
```
Symptom: Domain section could apply to any developer agent
Fix: Name the specific subdomain, framework, or protocol.
D2 impact: Domain criterion = 0 pts.
```

### Pattern 2: The Unrestricted Reviewer
```
Symptom: Review-only agent has Write/Edit/Bash in tools
Fix: Add disallowedTools: [Write, Edit, Bash]
D3 impact: "No incorrect tools" criterion = 0 pts.
```

### Pattern 3: The Invisible Agent
```
Symptom: Agent exists but never suggested by agent-suggester
Fix: Add ≥3 relevant keywords to DOMAIN_MAPPING
D4 impact: DOMAIN_MAPPING criterion = 0 pts.
```

### Pattern 4: The Alarm Bell Body
```
Symptom: Body full of "CRITICAL:", "MUST", "NEVER EVER"
Fix: Rewrite as direct statements.
D6 impact: Aggressive language count >5 = 0 pts on that criterion.
```

### Pattern 5: The Orphan Agent
```
Symptom: File exists in .aicodepath/agents/ but missing from taxonomy + DOMAIN_MAPPING
Fix: Run full registration checklist.
D4 impact: Steps 1–4 all = 0 pts.
```

### Pattern 6: The Description Trap
```
Symptom: Description lists what agent does, not when to invoke it
Fix: Rewrite as "Use when [trigger condition]"
D1 impact: description trigger format = 0 pts.
D5 impact: "Use when" criterion = 0 pts.
```

---

## The Meta-Question

> **"Would a senior engineer, reading this agent definition, trust it to independently handle the stated domain without supervision?"**

If yes — the agent is well-defined.
If no — identify whether the gap is knowledge (D2), tooling (D3), or tone (D6).
