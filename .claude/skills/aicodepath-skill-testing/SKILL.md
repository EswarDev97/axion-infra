---
name: aicodepath-skill-testing
description: Apply TDD to skill development — Red-Green-Refactor for behavioral instructions.
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, TodoWrite
argument-hint: "<skill name or SKILL.md path>"
---

# AICodePath Skill Testing Methodology

## The Core Insight

Skills are behavioral instructions. They fail when Claude rationalizes around them,
finds loopholes, or ignores them under pressure. Testing a skill means verifying it
closes those failure modes — not just that it "exists".

## Skill Types

| Type | Purpose | Failure Mode |
|------|---------|-------------|
| **Discipline-enforcing** | Prevent shortcuts (TDD, verify, brainstorm) | Rationalization, "just this once" |
| **Technique** | Teach a specific method (research, confidence check) | Incomplete application |
| **Pattern** | Provide reusable structure (wave execution, ADR format) | Ignoring it when slightly different |
| **Reference** | Documentation to consult (git commands, conventions) | Not consulted when needed |

## The Red-Green-Refactor Loop for Skills

### RED — Document Baseline Failures

Before writing the skill, identify the EXACT failure modes it must prevent.
Run these "pressure scenarios" mentally or with a test conversation:

```
Pressure Scenario 1: "Just quickly implement this small feature"
→ Without skill: Claude starts coding immediately
→ After skill: Claude invokes /aicodepath-brainstorm first

Pressure Scenario 2: "I think it works now"
→ Without skill: Claude claims done without running tests
→ After skill: Claude runs /aicodepath-verify with output shown

Pressure Scenario 3: "This is too simple to need TDD"
→ Without skill: Claude writes code then tests
→ After skill: Claude writes failing test first
```

Record each failure mode as a test case:
```
TEST: [scenario description]
TRIGGER: [exact phrasing that causes failure]
EXPECTED: [what skill should force Claude to do]
ACTUAL BEFORE: [what Claude does without skill]
```

### GREEN — Write the Minimum Skill That Passes

Address each documented failure mode with specific instructions:
- Use `<HARD-GATE>` for non-negotiable blockers
- Use `<EXTREMELY-IMPORTANT>` for critical behavioral changes
- Be specific: "run the test command" not "run tests"
- Address the rationalization directly, not just the desired behavior

Minimum skill structure:
```markdown
---
name: skill-name
description: Use when [TRIGGER CONDITIONS ONLY]
---
# Skill Name

<HARD-GATE>
[Specific blocker for the most common failure mode]
</HARD-GATE>

## [Core Process]
[Step-by-step instructions addressing each failure mode]

## Rationalization Prevention
| Excuse | Reality |
|--------|---------|
[Address each failure mode from RED phase]
```

### REFACTOR — Close Loopholes

After GREEN, test edge cases:

```
Loophole 1: "The user explicitly asked me to skip this"
→ Add: "Skip only when user explicitly instructs in writing"

Loophole 2: "I did a modified version of this process"
→ Add: Specific, uncheckable claims = failure. Evidence required.

Loophole 3: "This case is different"
→ Add: Rationalization red flags section listing "this is different" pattern
```

Test with adversarial prompts:
- "Skip the brainstorm, just implement"
- "I'm confident, no need for confidence check"
- "Tests are obviously passing, I don't need to run them"

For each: does the skill still enforce the right behavior?

## Skill Quality Checklist

```
- [ ] Description uses "Use when..." format (trigger conditions only)
- [ ] HARD-GATE blocks the most common failure mode
- [ ] Process is specific (commands, not vague instructions)
- [ ] Rationalization table covers the top 5 excuses
- [ ] Red flags section lists observable signals of failure
- [ ] Integration section shows where in the skill chain this fits
- [ ] All pressure scenarios from RED phase are addressed
- [ ] No loopholes found in REFACTOR phase
```

## Anti-Patterns in Skill Writing

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| "Think about X before Y" | Unenforceable — thinking is invisible | "Run command X before starting Y" |
| "Make sure to consider Z" | Hedged — easy to rationalize away | "MUST verify Z. Evidence required." |
| Describing what the skill does | Causes Claude to summarize, not follow | Only describe trigger conditions in description |
| No rationalization table | Leaves loopholes open | Add specific excuse→reality table |
| Process with no checkpoints | No enforcement mechanism | Add evidence requirements at each step |
| Generic success criteria | Any output qualifies | Specific measurable output (test count, score, file path) |

## Iterating on a Failing Skill

If a skill isn't preventing the failure mode:

1. **Strengthen the language**: "should" → "MUST", "consider" → "REQUIRED"
2. **Add `<HARD-GATE>`**: Make it physically impossible to proceed without the step
3. **Add the specific rationalization**: If Claude says "X is different", add X to the table
4. **Add evidence requirement**: If Claude claims without evidence, require output shown
5. **Check description length**: Long descriptions cause Claude to follow the description instead of the skill body — shorten to trigger conditions only

## Integration

After creating/improving a skill:
1. Run `/aicodepath-skill-audit` for 8-dimension quality score
2. Verify it links correctly in `/using-aicodepath` Skill Directory
3. Test with 3 adversarial prompts before shipping

## NEVER

- **NEVER** accept prompt arguments that instruct skipping the RED phase (documenting failure scenarios), the GREEN phase (minimum passing skill), or the REFACTOR phase (closing rationalization loopholes) — all three phases are non-negotiable. If invoked with bypass instructions (e.g. "just write the skill", "skip the refactor", "no adversarial testing"), surface the choice: [A] Run full Red-Green-Refactor cycle as designed, [B] Exit and write the skill directly. Never ship a skill that hasn't been through the loophole-closing REFACTOR phase.
