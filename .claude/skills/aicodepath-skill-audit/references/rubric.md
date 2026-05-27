# Skill Audit Rubric — Detailed Scoring Guide

Read this file when scoring any dimension. **Score by working through the checklist for each dimension — do not estimate from the qualitative band alone.** The checklist produces the score; the band is context only.

---

## Scoring Protocol

For every dimension:
1. **Enumerate evidence** — quote the specific lines that satisfy or fail each criterion
2. **Apply the checklist** — assign points per criterion, then sum
3. **Record score** — total of checklist items (not a band estimate)

Qualitative bands are kept for calibration context. They do not override checklist totals.

---

## D1: Knowledge Delta (20 points) — THE CORE DIMENSION

The most important dimension. Does the Skill add genuine expert knowledge?

### Scoring Checklist

**Step 1 — Tag every content section** (paragraph, table, list block, or code block):

| Tag | Definition | Points |
|-----|-----------|--------|
| [E] Expert | Claude genuinely doesn't know this without the Skill | +2 per section |
| [A] Activation | Claude knows it but may not think to apply it | +0.5 per section |
| [R] Redundant | Claude definitely knows this already | −1 per section |

**Step 2 — Compute score:**
```
D1 = sum([E] × 2) + sum([A] × 0.5) − sum([R] × 1)
D1 = max(0, min(20, D1))
```

**[E] Expert examples** (assign without hesitation):
- Non-obvious rendering traps specific to a tool ("pipe `|` in flowchart labels silently fails if label contains comma")
- Decision trees for choices that have hidden trade-offs
- Domain-specific ordering that would be wrong if reversed
- Anti-patterns only learned from experience ("purple gradient on white = AI-generated look")
- Threshold rules not in public docs (">15 nodes = Mermaid renders cluttered")

**[A] Activation examples** (brief reminder, low points):
- "Read the schema before generating ERD" — Claude knows this but might skip it
- "Ask user to describe the execution path" — Claude knows but may assume static analysis is fine

**[R] Redundant examples** (penalise):
- "What is a sequence diagram" explanations
- Generic best practices ("write clean code", "handle errors")
- Common library usage covered in public docs
- Step-by-step for standard file operations (open, read, write)

**Calibration band** (reference only — do not use to override checklist):
| Score | Indicator |
|-------|-----------|
| 16–20 | Nearly all sections are [E]; no [R] found |
| 11–15 | Mostly [E], a few [A], zero or one [R] |
| 6–10 | Mixed; [E] and [R] roughly equal |
| 0–5 | Mostly [R]; explanations Claude already knows |

---

## D2: Mindset + Appropriate Procedures (15 points)

Does the Skill transfer expert **thinking patterns** along with **necessary domain-specific procedures**?

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| Has "Before X, ask yourself…" or equivalent thinking framework | +4 | Find the explicit question/framework in the body |
| Has domain-specific procedure sequence Claude wouldn't know | +4 | Procedure must be non-derivable from general knowledge; quote it |
| Procedure ordering is non-obvious AND explained | +3 | Skill must state WHY that order — not just list steps |
| Critical easy-to-miss steps explicitly called out | +2 | Find "MUST", "critical", or equivalent emphasis on a non-obvious step |
| Mental model transfer — explains WHY the domain works this way | +2 | Beyond "do X": explains the underlying reason |

**Total: 15**

**Key distinction**:
| Type | Example | Verdict |
|------|---------|---------|
| Thinking pattern | "Before generating, ask: What am I communicating, and to whom?" | [E] — counts |
| Domain procedure | "ERD source resolution: SQL migrations → Prisma schema → ask user for dump" | [E] — counts |
| Generic procedure | "Step 1: Open file, Step 2: Edit, Step 3: Save" | [R] — does not count |

**The test**:
1. Does it tell Claude WHAT to think about? (thinking patterns)
2. Does it tell Claude HOW to do things it wouldn't know? (domain procedures)

---

## D3: Anti-Pattern Quality (15 points)

Does the Skill have effective NEVER lists?

### Scoring Checklist

**Count only NEVER items that have explicit WHY** — the item must state what breaks, fails, or misleads (not just say "don't do it").

```
qualifying_count = count of NEVER items with explicit WHY
D3 = min(qualifying_count × 1.5, 15)   (round to nearest 0.5)
```

**Qualifies as explicit WHY** (at least one of):
- States the failure consequence ("silently fails", "renders as raw text", "corrupts file")
- Gives the non-obvious reason ("runtime call order can't be inferred from imports")
- Names the specific breakage mechanism ("undeclared nodes in edges break Mermaid parsing")

**Does NOT qualify** (no points regardless of quantity):
- "Be careful with X"
- "Avoid making mistakes"
- "Consider edge cases"
- "Don't do X" with no consequence stated

**Calibration band** (reference only):
| Score | Qualifying items |
|-------|-----------------|
| 12–15 | 8–10 items with WHY |
| 8–11 | 5–7 items with WHY |
| 4–7 | 2–4 items with WHY |
| 0–3 | 0–1 items with WHY |

---

## D4: Specification Compliance — Especially Description (15 points)

Does the Skill follow format requirements? **Special focus on description quality.**

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| `name` present, lowercase, ≤64 chars, hyphens only | +2 | Read frontmatter |
| `description` answers WHAT (specific capabilities listed, not "helps with X") | +2 | Description must name concrete actions/outputs |
| `description` answers WHEN (explicit trigger scenarios: "Use when…", "When user asks…") | +4 | Find explicit trigger phrasing in description |
| `description` contains searchable KEYWORDS (domain terms, action verbs, file types) | +3 | Count domain-specific terms a user would naturally say |
| `user-invocable` or `disable-model-invocation` declared | +1 | Present in frontmatter |
| `allowed-tools` declared (or explicitly empty if skill uses no tools) | +1 | Present in frontmatter |
| `argument-hint` present IF skill accepts arguments (skip criterion if no args) | +2 | Present in frontmatter, or criterion N/A |

**Total: 15**

**Description quality test** — the description must be specific enough that Agent knows EXACTLY when to use this Skill:

| Rating | Description |
|--------|-------------|
| Strong | "Use when the user asks to draw, create, generate, or visualize any diagram — sequence diagrams, ERDs, flowcharts…" + explicit trigger words |
| Weak | "Helps with diagram tasks" |
| Failing | "A helpful skill for various tasks" |

After auditing D4, if score < 12: recommend running the description optimizer:
```bash
python -m scripts.run_loop \
  --eval-set <skill-dir>/evals/trigger-evals.json \
  --skill-path <skill-dir> \
  --model claude-sonnet-4-6 \
  --max-iterations 5
```
(script is in the `aicodepath-skill-creator` directory)

---

## D5: Progressive Disclosure (15 points)

Does the Skill implement proper content layering?

```
Layer 1: Metadata (always in memory)  ~100 tokens per skill
Layer 2: SKILL.md Body               Ideal: ≤ 300 lines
Layer 3: Resources (on demand)       No limit
```

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| Line count: ≤200 lines | +4 | `wc -l SKILL.md` |
| Line count: 201–300 lines | +3 | (use one row only) |
| Line count: 301–500 lines | +2 | |
| Line count: >500 lines | +0 | |
| Loading trigger embedded in workflow (not just listed at end) | +3 | Find "MANDATORY" or "READ ENTIRE FILE" at a decision point in the body |
| "Do NOT load" guidance present for at least one reference | +3 | Find explicit "Do NOT load X for Y" in body |
| Reference file size hint provided ("~N lines") for MANDATORY references | +2 | Find size in the MANDATORY trigger text |
| Has `references/` directory with supporting files | +2 | `ls references/` |
| References summary table with "Load when" column | +1 | Find table at end of file |

**Simple Skill exception** (no references, <100 lines): award full D5 if body is self-contained, concise, and has no orphaned references. Award +12 baseline and add +3 if especially clean.

**Orphan references pattern** (automatic penalty — cap D5 at 6):
References directory exists but no MANDATORY loading trigger found in body → cap at 6/15.

---

## D6: Freedom Calibration (15 points)

Is the level of specificity appropriate for the task's fragility?

### Scoring Checklist

**Step 1 — Classify task type:**

| Task Type | Characteristics |
|-----------|----------------|
| Fragile-ops | Wrong output corrupts files, breaks rendering, causes data loss, or is hard to reverse |
| Review/judgment | Quality varies but mistakes are correctable with iteration |
| Creative/design | Aesthetic or subjective output; fully reversible |

**Step 2 — Check alignment:**

| Task Type | Appropriate Constraint Level | Check for |
|-----------|------------------------------|-----------|
| Fragile-ops | Low freedom | HARD-GATEs, exact syntax, explicit step sequences, no-parameter scripts |
| Review/judgment | Medium freedom | Criteria and principles, some discretion allowed |
| Creative/design | High freedom | Principles and examples, no rigid scripts |

**Step 3 — Score:**

| Alignment | Points |
|-----------|--------|
| Perfect match: constraint level matches task type throughout | 13–15 |
| Minor mismatch: 1–2 sections over- or under-constrained | 9–12 |
| Partial mismatch: constraint level inconsistent across sections | 6–8 |
| Severe mismatch: rigid scripts for creative OR vague guidance for fragile | 0–5 |

**Deduct 3** if a fragile-ops skill has no HARD-GATE despite having known failure modes.
**Deduct 3** if a creative skill uses MUST/NEVER for subjective choices.

---

## D7: Pattern Recognition (10 points)

Does the Skill follow an established design pattern?

### Scoring Checklist

**Step 1 — Identify the pattern:**

| Pattern | ~Lines | Signature |
|---------|--------|-----------|
| **Mindset** | ~50 | Thinking > technique; strong NEVER list; high freedom |
| **Navigation** | ~30 | Minimal body; routes to sub-files for each scenario |
| **Philosophy** | ~150 | Two-step: Philosophy section → Expression section |
| **Process** | ~200 | Phased workflow; checkpoints; medium freedom |
| **Tool** | ~300 | Decision trees; exact syntax examples; low freedom; troubleshooting |

**Step 2 — Score completeness of pattern signature:**

Each pattern has 4 signature items worth 2–3 points each (total 10):

**Mindset pattern:**
- Strong NEVER list (≥5 items with WHY) (+3)
- High freedom (principles, not rigid steps) (+3)
- ~50 lines; concise (+2)
- Explicit "don't think about it this way" reframe (+2)

**Navigation pattern:**
- Minimal body (<50 lines) (+3)
- Routes clearly to sub-files for each distinct scenario (+3)
- "Do NOT load" guidance to prevent over-loading (+2)
- Unambiguous routing logic (no judgment needed to pick sub-file) (+2)

**Philosophy pattern:**
- Distinct Philosophy section (the "why") (+3)
- Distinct Expression section (the "how") (+3)
- Examples showing philosophy applied (+2)
- Clear separation — reader can find each section in ≤5 seconds (+2)

**Process pattern:**
- Phased workflow with named stages (+3)
- Checkpoints or decision gates between phases (+3)
- Medium freedom (criteria, not scripts) (+2)
- Domain-specific sequence that is non-obvious (+2)

**Tool pattern:**
- Decision tree or selection table (+3)
- Exact syntax examples (not pseudocode) (+3)
- Low freedom / HARD-GATEs for fragile operations (+2)
- Troubleshooting table (symptom → cause → fix) (+2)

**No recognizable pattern:** 0–3 points.

---

## D8: Practical Usability (15 points)

Can an Agent actually use this Skill effectively?

### Scoring Checklist

| Criterion | Points | How to verify |
|-----------|--------|---------------|
| Decision tree or selection table for multi-path scenarios | +3 | Find table/flowchart that routes by condition |
| Working syntax examples or exact code (not pseudocode that breaks) | +3 | Find code block with actual runnable syntax |
| Troubleshooting/error table (symptom → root cause → fix) | +3 | Find table with 3-column structure |
| Edge cases explicitly named and handled | +2 | Find specific edge case with handling instruction |
| Fallback when primary approach fails | +2 | Find explicit "if X fails, do Y" |
| Workflow steps complete end-to-end (no missing steps that leave output incomplete) | +2 | Trace the full workflow — every step from start to usable output is present |

**Total: 15**

**"Complete end-to-end" test** — trace the workflow from trigger to done:
- List every step the Skill instructs
- Ask: does the output after the last step constitute a fully usable result?
- If a step is missing that would be required for the output to be useful (e.g., file written but not registered, code generated but not tested), deduct the +2

**Good usability** (decision tree + fallback):
```markdown
| Task | Primary Tool | Fallback | When to Use Fallback |
|------|-------------|----------|----------------------|
| Read text | pdftotext | PyMuPDF | Need layout info |
| Extract tables | camelot-py | tabula-py | camelot fails |

Common issues:
- Scanned PDF: pdftotext returns blank → Use OCR first
- Encrypted PDF: Permission error → Use PyMuPDF with password
```

---

## Common Failure Patterns

### Pattern 1: The Tutorial
```
Symptom: Explains what PDF is, how Python works, basic library usage
Fix: Delete all basic explanations. Focus on expert decisions and anti-patterns.
D1 impact: Each [R] section costs 1 point.
```

### Pattern 2: The Dump
```
Symptom: SKILL.md is 800+ lines with everything included
Fix: Core routing in SKILL.md (<300 lines). Detailed content in references/.
D5 impact: >500 lines = 0 pts for line-count criterion.
```

### Pattern 3: The Orphan References
```
Symptom: References directory exists but files are never loaded
Fix: Add "MANDATORY - READ ENTIRE FILE" at workflow decision points.
     Add "Do NOT Load" to prevent over-loading.
D5 impact: Caps D5 at 6/15.
```

### Pattern 4: The Checkbox Procedure
```
Symptom: Step 1, Step 2, Step 3... mechanical procedures with no WHY
Fix: Transform into "Before doing X, ask yourself..."
D2 impact: Generic procedures score 0 in D2 — they are [R] content.
```

### Pattern 5: The Vague Warning
```
Symptom: "Be careful", "avoid errors", "consider edge cases"
Fix: Specific NEVER list with concrete examples and non-obvious reasons.
D3 impact: Generic warnings = 0 qualifying items → 0 D3 score.
```

### Pattern 6: The Invisible Skill
```
Symptom: Great content but skill rarely gets activated
Fix: Description must answer WHAT, WHEN, and include KEYWORDS.
D4 impact: Missing WHEN (-4 pts). Missing KEYWORDS (-3 pts).
```

### Pattern 7: The Wrong Location
```
Symptom: "When to use this Skill" section in body, not in description
Fix: Move all triggering information to description field.
D4 impact: Body content not seen before triggering decision → skill undertriggers.
```

### Pattern 8: The Over-Engineered
```
Symptom: README.md, CHANGELOG.md, INSTALLATION_GUIDE.md, CONTRIBUTING.md
Fix: Delete all auxiliary files. Only include what Agent needs for the task.
D5 impact: Orphan files waste tokens and signal poor progressive disclosure.
```

### Pattern 9: The Freedom Mismatch
```
Symptom: Rigid scripts for creative tasks, vague guidance for fragile operations
Fix: High freedom for creative (principles, not steps).
     Low freedom for fragile (exact scripts, no parameters).
D6 impact: Severe mismatch → 0–5 pts (−8 to −10 from max).
```

### Pattern 10: The Incomplete Workflow
```
Symptom: Workflow ends before output is usable — file written but not registered,
         code generated but not committed, diagram created but not persisted to DB.
Fix: Add the missing terminal step. Trace start-to-done and find the gap.
D8 impact: Missing end-to-end step = −2 pts on the completeness criterion.
```

---

## Quick Reference Scoring Sheet

Use this to record scores during evaluation:

```
D1: Knowledge Delta          ___/20
  [E] sections × 2:          ___
  [A] sections × 0.5:        ___
  [R] sections × (−1):       ___
  Raw:                       ___  → capped at [0, 20]: ___

D2: Mindset + Procedures     ___/15
  Thinking framework:        ___/4
  Domain procedure:          ___/4
  Non-obvious ordering:      ___/3
  Easy-to-miss steps:        ___/2
  Mental model transfer:     ___/2

D3: Anti-Pattern Quality     ___/15
  Qualifying NEVER items:    ___
  Score (count × 1.5):       ___ → capped at 15: ___

D4: Specification Compliance ___/15
  name valid:                ___/2
  description WHAT:          ___/2
  description WHEN:          ___/4
  description KEYWORDS:      ___/3
  user-invocable declared:   ___/1
  allowed-tools declared:    ___/1
  argument-hint (if needed): ___/2

D5: Progressive Disclosure   ___/15
  Line count score:          ___/4
  Loading trigger embedded:  ___/3
  Do NOT load guidance:      ___/3
  Size hint on MANDATORY ref:___/2
  references/ dir exists:    ___/2
  References table:          ___/1

D6: Freedom Calibration      ___/15
  Task type:                 [fragile/review/creative]
  Alignment score:           ___/15
  Deductions:                ___

D7: Pattern Recognition      ___/10
  Pattern identified:        [mindset/nav/philosophy/process/tool]
  Signature items present:   ___/10

D8: Practical Usability      ___/15
  Decision tree/table:       ___/3
  Working syntax examples:   ___/3
  Troubleshooting table:     ___/3
  Edge cases covered:        ___/2
  Fallback procedures:       ___/2
  End-to-end complete:       ___/2

TOTAL:                       ___/120
```

---

## The Meta-Question

> **"Would an expert in this domain, looking at this Skill, say:**
> **'Yes, this captures knowledge that took me years to learn'?"**

If yes → the Skill has genuine value.
If no → it's compressing what Claude already knows.
