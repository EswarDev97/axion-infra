---
name: aicodepath-help
description: Contextual help for AICodePath — diagnose hooks not firing, identify the right skill, or interpret guideline violations.
version: 1.1.0
user-invocable: true
allowed-tools: Read, Glob
argument-hint: "[hooks|guidelines|skills|workflow|topic]"
---

# AICodePath Help

Contextual guidance for getting unstuck. The key insight: different problems need different diagnostics — pick the section that matches your situation.

---

## I don't know which skill to use

Consult the skill directory in `using-aicodepath`:

| Goal | Skill |
|------|-------|
| Design before coding | `/aicodepath-brainstorm` |
| Write implementation plan | `/aicodepath-write-plan` |
| Implement with TDD | `/aicodepath-tdd` |
| Quality loop until score ≥90 | `/aicodepath-gicl-start` |
| Verify before claiming done | `/aicodepath-verify` |
| Debug an error | `/aicodepath-debug` |
| Check project state | `/aicodepath-status` |
| Save progress | `/aicodepath-checkpoint` |
| Resume after a break | `/aicodepath-resume` |
| Fix hooks/skills not loading | `/aicodepath-diagnostics` |

---

## A hook is silently skipping or not firing

**Step 1**: Check where hooks are registered — the active config is `.claude/settings.json`, NOT `hooks.json` at the root (legacy, unused).

```bash
cat .claude/settings.json | grep hooks
```

**Step 2**: Check paths are absolute, not relative. A relative path like `./hooks/my-hook.js` will silently fail — it must be `/absolute/path/to/hooks/my-hook.js`.

**Step 3**: Check the hook's exit code. Exit 0 = pass (silent), exit 1 = warn, exit 2 = block. A hook that always exits 0 produces no output.

**Step 4**: If still missing, run `/aicodepath-diagnostics` for a full health check.

---

## A guideline is producing false positives

The most common causes:

| False positive type | Cause | Fix |
|--------------------|-------|-----|
| Rule fires on test files | `file_patterns` missing `!**/__tests__/**` exclusion | Add negation pattern to the rule |
| Rule fires on generated files | No exclusion for `generated/`, `dist/`, `migrations/` | Add path exclusions |
| Pattern too broad | Regex matches unintended code | Narrow the pattern with negative lookbehind |
| `file_pattern` vs `file_patterns` conflict | Rule has both singular and plural fields | Remove singular `file_pattern`, keep `file_patterns` array |

To test a specific rule in isolation:

```bash
node .aicodepath/__tests__/guideline-validator-false-positives.test.js
```

---

## A skill isn't triggering automatically

Skills trigger from their `description` field — Claude reads only that when deciding whether to invoke. If a skill never triggers:

1. Check the description contains specific trigger keywords (not just vague "helps with X")
2. Verify the skill has `user-invocable: true` in frontmatter
3. Confirm the skill is symlinked in `.claude/skills/` — run `ls .claude/skills/` to check
4. If symlink is missing, run `node .aicodepath/bin/aicodepath.js init` to regenerate

---

## The GICL score looks wrong

| Score anomaly | Likely cause |
|--------------|-------------|
| Score is 100 with no tests | Tests component unmeasured — defaults to 100. Run the test suite first. |
| Score dropped >10pts suddenly | Code regression or duplication introduced. Check the duplication component first. |
| Authenticity score is 0 | Guideline validator returned no results. Check DB connection. |
| Score plateaued at same value | Lowest-scoring component is the bottleneck — check which component is lowest with `--detailed` |

---

## NEVER

- **NEVER** check `hooks.json` at project root for active hook config — it's legacy. Active config is `.claude/settings.json`.
- **NEVER** use vague help requests ("why doesn't this work?") — name the specific symptom (hook not firing, skill not triggering, score wrong) to get targeted guidance.
- **NEVER** bypass a guideline violation with `// aicodepath-ignore` without first checking if it's a false positive caused by a pattern issue — fixing the rule benefits everyone.

---

## See Also

- `/aicodepath-diagnostics` — Full system health check
- `/aicodepath-validate-guidelines` — Run guideline validation manually
- `/aicodepath-status` — Check current phase and blockers
- `using-aicodepath` — Complete skill directory and workflow reference
