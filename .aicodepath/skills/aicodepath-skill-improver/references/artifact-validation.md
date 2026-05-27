# Artifact Validation Reference

Loaded at Step 5 (Artifact Scan & Fix Phase) only — not at every skill invocation.

---

## Artifact Type Taxonomy & Validation Commands

| Type | File Pattern | Validation Command | Pass Condition |
|------|-------------|-------------------|----------------|
| Python script | `*.py` | `python3 -m py_compile <file>` | exit 0 |
| JS/Node script | `*.js` | `node --check <file>` | exit 0 |
| Shell script | `*.sh` | `bash -n <file>` | exit 0 |
| Reference doc | `*.md` (non-agent) | exists + non-empty + has loading trigger in SKILL.md body | all true |
| Agent definition | `*.md` with YAML frontmatter | frontmatter has `name`, `description`, `model` fields | all present |
| JSON config | `*.json` | `python3 -m json.tool <file> > /dev/null` | exit 0 |
| YAML template | `*.yaml`, `*.yml` | `python3 -c "import yaml; yaml.safe_load(open('<file>'))"` | exit 0 |
| Other templates | any other extension | exists + non-empty (`test -s <file>`) | exit 0 |

---

## Meta-Files — Exclude from Scan

Never validate these files as artifacts (they are skill-improver state, not skill content):

```
SKILL.md
CLAUDE.md
improvement_log.jsonl
state.json
best_skill.md
__pycache__/
*.pyc
```

---

## Shared Script Detection

Scan the SKILL.md body for path references that resolve outside the skill directory. Match these patterns:

| Pattern | Example | Detection Regex |
|---------|---------|-----------------|
| Relative parent traversal | `../generators/er_diagram.py` | `\.\./` |
| Framework-absolute path | `.aicodepath/generators/` | `\.aicodepath/generators/` |
| Absolute filesystem path | `/home/user/.aicodepath/` | `^/.*\.aicodepath` |
| `pathResolver` call | `pathResolver.getGeneratorsPath()` | `pathResolver\.` |

For each match, resolve the full path and add to the artifact list with `"shared": true`.

---

## Shared Script — Cross-Skill Impact Detection

After identifying a shared script, scan all skill directories for the same path reference:

```bash
grep -rl "<resolved-path>" /path/to/.aicodepath/skills/
```

Collect matching skill directories → populate `shared_skills[]` in the artifact task entry.

**Present impact before applying fix:**
> "This script is also referenced by: [skill-X, skill-Y]. Fix will affect all of them."

**Post-apply impact report:**
> "🔗 Also used by [skill-X, skill-Y] — run skill-improver on those skills to verify they still pass."

---

## Reference Doc Validation Rules

A reference `.md` file is **valid** when:
1. File exists at the declared path
2. File is non-empty (`test -s <file>`)
3. SKILL.md body contains a loading trigger that references this file

**Loading trigger patterns** (any of these counts):
- `Read \`references/<filename>.md\``
- `Read references/<filename>.md`
- `[references/<filename>.md]`
- `load references/<filename>.md`

If a reference file exists but has no loading trigger in SKILL.md → mark as **orphaned** (warn, do not fail).
If SKILL.md references a file that doesn't exist → mark as **missing** (fail).

---

## Agent Definition Validation

A `.md` file with YAML frontmatter (`---` delimiters) is treated as an agent definition.

Required fields:
```yaml
---
name: <agent-name>
description: <description>
model: <model-id>
---
```

Check: `grep -E "^name:|^description:|^model:" <file> | wc -l` → must be ≥ 3.

---

## Fix Templates per Type

Use these as starting points for the proposed fix. Adapt to the specific error.

### Python syntax error
```
Diagnosis: SyntaxError at line N — <error text>
Fix approach: Correct the syntax at the identified line. Common causes:
  - Missing colon after def/class/if/for
  - Mismatched parentheses or brackets
  - Invalid f-string or escape sequence
  - Python 2 syntax in Python 3 file
```

### JS/Node syntax error
```
Diagnosis: SyntaxError — <error text>
Fix approach: Correct the syntax. Common causes:
  - Missing closing brace/bracket
  - Trailing comma in object literal (older Node)
  - require() vs import() mismatch
  - Async/await outside async function
```

### Shell script error
```
Diagnosis: bash -n reported error at line N
Fix approach: Correct shell syntax. Common causes:
  - Unmatched quotes or brackets
  - Missing 'then'/'do'/'fi'/'done'
  - Spaces around = in variable assignment
  - Undefined variable without quotes
```

### Missing reference doc
```
Diagnosis: File referenced in SKILL.md body does not exist at <path>
Fix approach:
  Option A — Create the file with required content sections
  Option B — Remove the loading trigger from SKILL.md if the file is no longer needed
```

### Invalid JSON
```
Diagnosis: JSON parse error — <error text>
Fix approach: Validate and repair JSON structure. Common causes:
  - Trailing comma after last array/object element
  - Unquoted keys
  - Single quotes instead of double quotes
  - Comments (JSON does not support comments)
```

### Invalid YAML
```
Diagnosis: YAML parse error — <error text>
Fix approach: Repair YAML structure. Common causes:
  - Inconsistent indentation (mix of tabs and spaces)
  - Missing space after colon in key: value
  - Unquoted strings with special characters (: { } [ ] , & * # ? | - < > = ! % @ `)
```

---

## Step 5 Execution Flow (Summary)

```
1. Enumerate all files in skill dir (recursive) → exclude meta-files
2. Detect shared scripts (scan SKILL.md body for external path refs)
3. For each artifact → run validation command → collect pass/fail + error output
4. If all pass → set artifact_scan_complete: true, artifact_health: "clean" → skip to Loop
5. For each failure:
   a. Diagnose (LLM reads file + error)
   b. Propose fix (using fix template above as starting point)
   c. For shared scripts: run cross-skill impact detection
   d. Add to state.json artifact_tasks[] with status: "pending"
6. Present task table to user → get approval (A), skip (S), or edit (E) per artifact
7. For each approved fix: apply → re-validate → update status (applied/fix_failed)
8. Emit summary: "✅ N fixed | ⚠ N skipped | 🔗 N shared scripts affected"
9. Set artifact_scan_complete: true, artifact_health: "clean|fixed|has_skipped"
10. Announce: "Artifact phase complete. Starting SKILL.md loop..."
```
