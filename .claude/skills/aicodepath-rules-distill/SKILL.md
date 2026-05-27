---
name: aicodepath-rules-distill
description: Codify recurring patterns into enforceable JSON guideline rules with mandatory false-positive testing.
user-invocable: true
allowed-tools: [Read, Write, Edit, Grep, Glob]
argument-hint: "distill from <source> | codify <pattern>"
---

# Rules Distill — Pattern to Guideline Automation

Detect recurring code patterns from GICL feedback, knowledge.md, code review history, and learned preferences, then codify them into enforceable JSON guideline rules or markdown workflow rules.

---

## Pattern Sources

### 1. GICL Feedback (highest signal)

Patterns that repeatedly cause GICL score reductions:

```bash
# Find recurring guideline violations across GICL sessions
grep -rn 'violation\|warning\|error' aicodepath-docs/knowledge.md
```

If the same violation appears in 3+ sessions, it's a candidate for a new rule.

### 2. Knowledge.md Lessons

Lessons recorded in `aicodepath-docs/knowledge.md` that describe recurring patterns:

```markdown
## Lesson: Always use parameterized queries
Discovered in session 2026-03-15. Raw SQL concatenation found in 3 services.
```

### 3. Code Review Patterns

Patterns flagged in `/aicodepath-review` that aren't covered by existing guidelines:

- Same feedback given across multiple reviews
- Patterns that reviewers consistently flag but no automated rule catches

### 4. Learned Preferences

High-confidence rules from `/aicodepath-learn` that have been approved and stable across 10+ sessions. These graduate from preferences to guidelines.

---

## Output Types

### JSON Guideline Rule

For patterns that can be detected automatically via regex or AST:

```json
{
  "id": "no-raw-sql-concat",
  "description": "Prevent SQL injection via string concatenation",
  "pattern": "\\+\\s*['\"]\\s*(SELECT|INSERT|UPDATE|DELETE)",
  "inverse": true,
  "severity": "error",
  "file_patterns": ["*service*", "*repository*", "*handler*"],
  "message": "Use parameterized queries instead of SQL string concatenation",
  "component_types": ["database", "service"],
  "phase": ["code"],
  "design_check": "Does the design use parameterized queries for all database operations?"
}
```

**Destination**: `.aicodepath/guidelines/<category>-rules.json` under the appropriate category.

### Markdown Workflow Rule

For patterns that require contextual judgment (not regex-detectable):

```markdown
# Rule: Always Verify External API Response Schema

## When
Before using any field from an external API response.

## Why
External APIs can change without notice. Unvalidated responses cause
runtime errors that are hard to trace.

## How
1. Define expected schema (TypeScript interface or JSON schema)
2. Validate response against schema before accessing fields
3. Handle validation failures with specific error messages
```

**Destination**: `.aicodepath/rules/common/` or `.aicodepath/rules/construction/`.

---

## Process: Distill a Pattern into a Rule

### Step 1: Identify the candidate pattern

```
What keeps going wrong?
→ "We keep using console.log instead of the logger"
→ "SQL queries keep using string concatenation"
→ "Services keep importing from controllers"
```

### Step 2: Gather evidence (minimum 3 occurrences)

```bash
# Search for the pattern in the codebase
grep -rn 'console\.log' src/ --include="*.ts" | wc -l

# Search for it in GICL history
grep -i 'console.log\|structured logging' aicodepath-docs/knowledge.md
```

**Minimum evidence threshold**: 3 independent occurrences across different files or sessions. A single occurrence is a correction, not a pattern.

### Step 3: Draft the rule

Choose format:
- **Regex-detectable** → JSON guideline rule
- **Contextual judgment** → Markdown workflow rule

Write the rule following the schema of existing rules in the same file.

### Step 4: Test for false positives (MANDATORY)

<HARD-GATE>
Do NOT commit any new rule without testing for false positives first.
</HARD-GATE>

```bash
# For JSON guideline rules — run the validator against the codebase
node .aicodepath/__tests__/guideline-validator-false-positives.test.js

# For pattern rules — grep the codebase and review each match
grep -rn '<your-pattern>' . --include="*.ts" --include="*.js" | head -20
# Review: Are ALL matches genuine violations? Or do some match legitimate code?
```

**False positive rate**: Must be < 10%. If ≥ 10% of matches are legitimate code, the pattern is too broad — narrow it with `file_patterns`, `context`, or a more specific regex.

### Step 5: Add the rule to the appropriate file

- JSON rules → edit the `.aicodepath/guidelines/<category>-rules.json` file
- MD rules → create new file in `.aicodepath/rules/common/` or `.aicodepath/rules/construction/`

### Step 6: Verify the rule fires correctly

```bash
# Create a test file with intentionally violating code
echo 'const x = "SELECT * FROM users WHERE id = " + userId;' > /tmp/test-violation.js

# Run guideline validator against it
# Verify the rule catches it
```

### Step 7: Document and commit

Never auto-commit rules. Present to the user for review:

```markdown
## New Rule Proposal

**Rule**: no-raw-sql-concat
**Type**: JSON guideline (error severity)
**Evidence**: Found in 5 files across 3 sessions
**False positive rate**: 0/15 matches (0%)
**Recommendation**: Add to `database-operations-rules.json`
```

---

## Graduation Path

```
Observation (3+ occurrences)
    → Candidate rule
        → False-positive tested
            → Proposed to user
                → Approved → Added to guidelines/rules
                    → Monitored for 10+ sessions
                        → Promoted to error severity (if stable)
```

---

## NEVER

<HARD-GATE>
- **NEVER** create a rule from a single occurrence — a single correction is noise, not a pattern. Require 3+ independent occurrences before proposing a rule.
- **NEVER** commit a rule without testing for false positives — an untested rule can block legitimate code and erode trust in the guideline system. Run `guideline-validator-false-positives.test.js` first.
- **NEVER** auto-commit rules to the guideline files — always present proposals to the user for review. Rules affect every developer and every future session.
- **NEVER** create a rule that matches legitimate code patterns more than 10% of the time — a high false-positive rate trains developers to ignore all warnings, undermining the entire guideline system.
- **NEVER** duplicate an existing rule — before creating a new rule, search existing guideline files for similar patterns. Duplicates cause conflicting severity levels and confusing error messages.
</HARD-GATE>

---

## See Also

- `/aicodepath-validate-guidelines` — Run the validation suite
- `/aicodepath-learn` — Source of learned preference candidates
- `.aicodepath/guidelines/` — Existing guideline JSON files
- `.aicodepath/rules/` — Existing workflow rules
- `.aicodepath/__tests__/guideline-validator-false-positives.test.js` — False positive test suite
