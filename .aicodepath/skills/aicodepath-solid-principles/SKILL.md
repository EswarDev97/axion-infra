---
name: aicodepath-solid-principles
description: Analyze code for SOLID violations — severity-ranked findings and language-specific remediation.
user-invocable: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
argument-hint: "[file or directory to analyze, or describe what to review]"
---

# SOLID Principles Analysis

Detect design principle violations, classify severity, and provide concrete remediation guidance.

## When This Skill Applies

- User asks about SOLID, SRP, OCP, LSP, ISP, or DIP
- User asks "why is this hard to test?" or "why can't I extend this?"
- Code review surfaces God classes, fat interfaces, or concrete dependencies
- User asks to review class/module design before or after implementation
- `aicodepath-validate-guidelines` flags architecture violations — this skill provides the deeper diagnosis

<HARD-GATE>
If the user asks a CONCEPTUAL question ("explain SOLID", "what is SRP", "help me understand OCP") without providing code:
DO NOT write a tutorial. Instead say: "I analyze actual code for SOLID violations. Share a file path or paste code and I'll run a full diagnosis with a health score." Then stop.
Reason: Tutorials waste tokens and don't find violations. This skill's value is in analyzing specific code.
</HARD-GATE>

## Invocation Modes

| Mode | When | How |
|------|------|-----|
| **Interactive** (default) | User asks about SOLID or mentions a specific file/class | Run all 5 analysis steps on the target, output violation report |
| `--auto-scan` | Called by `construction-skill-suggester` hook or `reducing-entropy` skill | Scan working directory silently; output report only if Critical/High violations found |
| `--fix-plan` | After `--auto-scan` finds Critical/High violations | Generate a prioritised refactoring plan; feed into `aicodepath-brainstorm` → `aicodepath-write-plan` |
| **Review perspective** | Called from `aicodepath-review` as its 5th perspective | Run Steps 1-5 on all changed files; add SOLID section to the review report |
| **Entropy scan** | Called from `aicodepath-reducing-entropy` Step 3 | Focus on SRP (file size) and DIP (concrete coupling); append findings to entropy report |

## Before You Analyze — Thinking Framework

Answer these five questions before scanning (each maps to one step):

1. **"What are all the reasons this class could change?"** — If you list more than one without pausing, SRP is likely violated. More than two = certain violation.
2. **"What happens when a new variant of this behavior is needed?"** — If the answer is "modify existing code", OCP is violated. If "add a new class/function", it's clean.
3. **"Could I replace this subclass with the parent class without callers noticing?"** — If no, LSP is broken. The parent's contract is being violated somewhere.
4. **"Which callers use which methods of this interface?"** — If different callers use non-overlapping subsets, the interface should be split.
5. **"Can I swap this dependency for a test double without touching business logic?"** — If no, DIP is violated. You'd know immediately: the test suite requires a running DB, a live SMTP server, or an active Stripe sandbox.

Run the analysis steps in order — **SRP first** because violations compound: God classes are breeding grounds for type switches (OCP), stub implementations (ISP), and concrete coupling (DIP). In practice, fixing a God class resolves 50–70% of downstream findings. Starting with DIP instead causes you to split dependencies that a later SRP refactor would eliminate entirely.

## Analysis Workflow
### Step 1 — SRP Scan (God Classes)

```bash
# Files over 300 lines (high SRP risk)
find . -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.java" | \
  xargs wc -l 2>/dev/null | sort -rn | head -20

# Type-switch patterns (OCP risk)
grep -rn "switch.*type\|if.*instanceof\|if.*typeof" --include="*.ts" --include="*.js"
```

Read flagged files. Look for classes with multiple unrelated responsibilities: I/O + business logic + persistence in one place. Class names containing "Manager", "Handler", "Processor", "Util" that do more than one conceptual thing are high-probability violations.

**If you find a class > 500 lines, MANDATORY: Read `references/violation-patterns.md` (~356 lines) for deep multi-responsibility detection patterns before proceeding. Do NOT load it for files under 500 lines or in `--auto-scan` mode — it adds cost without benefit for routine checks.**

**For TypeScript, JavaScript, Java, Python, Go, or PHP targets: Read `references/language-patterns.md` (~65 lines) for language-specific violation signals and Value Object patterns. Do NOT load it for quick scans or when the language context is obvious.**

### Step 2 — OCP Check (Hardcoded Variation)

Look for `switch`/`if-else` chains that branch on type or category. Each branch that requires modifying existing code when a new type is added is an OCP violation. Strategy pattern or polymorphism is the usual fix.

### Step 3 — LSP Check (Inheritance Hierarchies)

Grep for subclasses that override methods to throw, no-op, or mutate sibling state. The Rectangle/Square anti-pattern is the canonical example — a subclass that breaks the contract the base type advertises.

### Step 4 — ISP Check (Fat Interfaces)

Find interfaces with more than 5-7 methods. Find classes that implement an interface but leave methods empty or throwing. Both are ISP signals.

### Step 5 — DIP Check (Concrete Dependencies)

```bash
# Direct instantiation of concrete classes in high-level modules
grep -rn "new [A-Z][a-zA-Z]*(" --include="*.ts" --include="*.java"
```

High-level orchestration code (`Service`, `Controller`, `UseCase`) should depend on interfaces, not concrete implementations like `MySQLDatabase` or `SMTPMailer`.

**If generating a `--fix-plan` or the user asks for before/after code, MANDATORY: Read `references/refactoring-examples.md` (~343 lines) for full real-world refactor patterns. Do NOT load it for standard violation reports — the examples are expensive to load and unnecessary unless showing concrete rewrites.**

---

## NEVER

**NEVER** explain SOLID without code — redirect: "Share a file path, I'll run a full diagnosis with a health score."
**NEVER** skip the Health Score table — callers (`aicodepath-review`, `--fix-plan`) depend on the grade for routing.
**NEVER** invoke `aicodepath-refactoring-expert` for Grade B — warranted only for Grade C/D (Critical/High violations).
**NEVER** output in `--auto-scan` for Low violations only — silence = pass to hook chain; output = noise that erodes trust.
**NEVER** output `--fix-plan` inline — save to `aicodepath-docs/plan/YYYY-MM-DD-solid-refactor-plan.md` only.
**NEVER** flag `new ConcreteClass()` in test files as DIP — test code legitimately instantiates concretes.
**NEVER** apply the >300 line SRP threshold to generated files, migrations, or SQL schemas — different size semantics.
**NEVER** treat inheritance depth alone as LSP violation — LSP breaks only when observable behavior changes.
**NEVER** split flat DTOs or data-only value objects for SRP — SRP governs responsibilities, not data fields.
**NEVER** scan file-by-file in `--auto-scan` — module/package level only; per-file deep analysis = alert fatigue.

---

## Troubleshooting — When Analysis Is Ambiguous

| Symptom | Root Cause | Fix / Fallback |
|---------|------------|----------------|
| Test suite requires live DB, SMTP, or Stripe | DIP — business logic holds concrete deps | Extract interface, inject test double in constructor |
| Adding one variant touched 5+ existing files (git log) | OCP — hardcoded type branching | Strategy pattern; each variant = new class, zero modifications |
| Unit test crashes with RuntimeException from subclass | LSP — subclass breaks parent's behavioral contract | Remove inheritance; use composition or redesign hierarchy |
| Class implements interface but several methods throw NotImplemented | ISP — fat interface forced on implementors | Split into role interfaces; each implementor picks only what it needs |
| `grep -rn "new [A-Z]" src/services/` returns 20+ hits | DIP — concrete instantiation throughout high-level code | Introduce DI container or constructor injection pattern |
| `find` times out on large monorepo | Repo too large for full scan | Run per-module: `find ./src/services -name "*.ts" \| xargs wc -l` |
| DIP grep floods output with test file hits | Test files legitimately instantiate concretes | Exclude: `grep -rn "new [A-Z]" --include="*.ts" --exclude="*.spec.*" --exclude="*.test.*"` |

---

## SOLID Health Score

| Dimension | Weight | Score (0–10) |
|-----------|--------|--------------|
| SRP compliance (file size + responsibility count) | 25% | |
| OCP compliance (no hardcoded type branches) | 20% | |
| LSP compliance (safe inheritance contracts) | 20% | |
| ISP compliance (interface size + stub methods) | 15% | |
| DIP compliance (abstraction at boundaries) | 20% | |

**Scoring guide**: 10 = no violations; 7-9 = minor deviations only; 4-6 = High violations; 0-3 = Critical violations. Use judgment — a score of 6 on DIP in a legacy module with active migration work differs from a 6 in new code.

**Composite score = weighted average × 10** (0-100 scale, advisory — use as a communication tool, not a gate)

| Score | Grade | Action |
|-------|-------|--------|
| 85–100 | A — Healthy | No action required |
| 70–84 | B — Acceptable | Schedule Medium items this sprint |
| 50–69 | C — Needs work | Add to technical debt backlog; flag Critical items |
| < 50 | D — At risk | Block merge or schedule immediate refactor sprint |

Append the health score table to every Output Format report under `### Summary`.

---

## Freedom Calibration Note

**Constraint level: medium (criteria + judgment, not scripts)** — This is a review/judgment task; wrong output doesn't corrupt files or cause data loss.
- **HARD-GATEs**: 1 max — only the tutoring redirect qualifies. "Should probably" guidance belongs as NEVER items, not blockers.
- **Thresholds context-dependent, not absolute**: a 320-line focused domain model differs from 320 lines mixing HTTP parsing + business logic + DB queries. The threshold surfaces candidates — judgment determines violations.
- **Health score grades guide, don't block**: Grade C recommends scheduling a refactor; it doesn't force one. Teams may accept Grade C debt for valid reasons.
- **Counter-example**: adding "MUST run all 5 steps for a 50-line utility class" = freedom mismatch — enforcing rigid process on a judgment task.

## Output Format

```markdown
## SOLID Analysis — [file or module]
### Critical Violations
#### [File:Line] [Principle] — [label]
- **Issue**: violation  **Impact**: why it matters  **Fix**: direction  **Pattern**: technique
### High Severity / Medium / Low (same structure)
### Summary — X Critical, Y High, Z Medium, W Low | Recommended next step: [...] | [HEALTH SCORE TABLE]
```

---

## Reference Files

| File | Size | Load when | Do NOT load when |
|---|---|---|---|
| `references/violation-patterns.md` | ~356 lines | Class > 500 lines found in Step 1 | Files under 500 lines; `--auto-scan` mode; routine reports |
| `references/refactoring-examples.md` | ~343 lines | Generating a `--fix-plan`; user asks for before/after code | Standard violation reports; health score output only |
| `references/language-patterns.md` | ~65 lines | Language-specific analysis (TS/JS/Java/Python/Go/PHP); Value Object guidance needed | Quick scans; language context obvious |

---

## After Analysis

| Score | Next Step |
|-------|-----------|
| A (85-100) | No action. Announce "SOLID Health: A — no violations found." |
| B (70-84) | List Medium items. Suggest scheduling in current sprint. No escalation. |
| C (50-69) | Use `--fix-plan` to generate prioritised refactoring plan. Feed into `/aicodepath-brainstorm`. |
| D (< 50) | Use `--fix-plan`. Output: "⚠️ SOLID Health D — immediate refactoring recommended before new features." Suggest `/aicodepath-write-plan`. |

When invoked with `--fix-plan`: group violations by principle (Critical first), produce one atomic refactoring task per Critical/High violation (file path, specific change, effort S/M/L), save to `aicodepath-docs/plan/YYYY-MM-DD-solid-refactor-plan.md`, announce: "Refactor plan saved. Invoke `/aicodepath-write-plan` to convert to implementation tasks."

## Integration Points

- **Critical/High violations**: Recommend `aicodepath-refactoring-expert` agent for the restructuring work
- **Guideline enforcement**: Pair findings with `aicodepath-validate-guidelines` to catch regressions automatically
- **Redesign pipeline**: findings → `aicodepath-brainstorm` → `aicodepath-write-plan` → `aicodepath-tdd`
