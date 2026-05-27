---
name: aicodepath-skill-creator
user-invocable: true
description: Create or update skills — from scratch or optimization, with evals, benchmarking, and trigger accuracy tuning.
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

The core loop:

1. Decide what the skill should do
2. Write a draft
3. Create 2-3 test prompts and run them with and without the skill
4. Help the user evaluate results (qualitative + quantitative)
5. Rewrite based on feedback
6. Repeat until satisfied

Your job is to figure out where the user is in this process and jump in. If they say "I want to make a skill for X", help them through all stages. If they already have a draft, go straight to eval/iterate. If they say "just vibe with me", do that instead.

---

## Communicating with the user

Skill creator users range from non-technical (plumbers who just opened a terminal) to expert engineers. Pay attention to context cues before using jargon:

- "evaluation" and "benchmark" — borderline, usually OK
- "JSON" and "assertion" — explain these unless the user has clearly demonstrated familiarity

---

## Creating a skill

### Capture Intent

Start by understanding the user's intent. If the current conversation already contains a workflow (e.g., "turn this into a skill"), extract answers from history first — tools used, sequence of steps, corrections made, input/output formats. The user fills the gaps and confirms before proceeding.

1. What should this skill enable Claude to do?
2. When should it trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Do we need test cases? Skills with verifiable outputs (file transforms, code gen, fixed workflows) benefit from them. Skills with subjective outputs (writing style, art) usually don't. Suggest the appropriate default, but let the user decide.

### Interview and Research

Ask about edge cases, input/output formats, example files, success criteria, and dependencies. Wait to write test prompts until you've got this ironed out.

Check available MCPs — if useful for research, use them in parallel via subagents if available.

### Write the SKILL.md

Required frontmatter:
- **name**: skill identifier (lowercase, hyphens)
- **description**: WHAT it does + WHEN to use it. This is the primary triggering mechanism — include both capabilities and explicit trigger scenarios. Lean slightly pushy to counter Claude's tendency to undertrigger: "Make sure to use this skill whenever the user mentions X, even if they don't explicitly ask for it."

Skill anatomy:
```
skill-name/
├── SKILL.md (required, ideally <300 lines)
└── resources/ (optional)
    ├── scripts/    - Executable code for deterministic tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Templates, icons, fonts
```

Progressive disclosure — three loading layers:
1. Metadata (name + description) — always in context
2. SKILL.md body — loaded when skill triggers
3. Bundled resources — loaded on demand with explicit triggers in SKILL.md

Keep SKILL.md under 500 lines. If approaching this limit, move detail into `references/` and add loading triggers. Reference files clearly from SKILL.md with guidance on when to read them.

**Writing principles:**
- Prefer imperative form ("Read the file", not "You should read the file")
- Explain WHY things matter — today's LLMs respond better to reasoning than rigid MUSTs
- Generalize from examples, don't overfit to specific test cases
- Start with a draft, then read it with fresh eyes before finalizing
- Skills must not contain malware or misleading content

### Test Cases

After writing the draft, create 2-3 realistic test prompts — the kind of thing a real user would actually say. Share them with the user: "Here are a few test cases I'd like to try. Do these look right?" Then run them.

Save to `evals/evals.json` (see `references/schemas.md` for full schema). Don't write assertions yet — just the prompts.

---

## Running and evaluating test cases

**MANDATORY**: Read `references/running-evals.md` for the complete eval sequence (Steps 1-5, viewer launch, feedback reading, iteration loop).

Key points:
- Spawn with-skill AND baseline runs in the same turn (parallel)
- Draft assertions while runs are in progress
- Launch the eval viewer with `eval-viewer/generate_review.py` BEFORE evaluating results yourself
- Read `feedback.json` after the user reviews

**Do NOT load** `references/description-optimization.md` or `references/platform-notes.md` during this step.

---

## Improving the skill

This is the heart of the loop. You've seen results, user has left feedback — now make it better.

**Four principles for improvement:**

1. **Generalize, don't overfit** — the skill will run millions of times across many different prompts. Fiddly narrow fixes for specific test cases produce brittle skills. If something is stubborn, try different metaphors or patterns rather than adding more constraints.

2. **Keep the prompt lean** — read the transcripts, not just outputs. If the skill is making the model do unproductive things, remove the instructions causing that behavior. Less is often more.

3. **Explain the why** — if you find yourself writing ALWAYS or NEVER in all caps, that's a yellow flag. Reframe as reasoning: "X matters because Y" lets the model generalize beyond the specific instruction.

4. **Bundle repeated work** — if all 3 test case subagents independently wrote the same helper script, that's a signal. Write it once, put it in `scripts/`, and tell the skill to use it.

---

## Advanced features

**Blind comparison** (optional, requires subagents): When the user asks "is the new version actually better?", give two outputs to an independent agent without revealing which is which. Read `agents/comparator.md` and `agents/analyzer.md` for instructions.

**Description optimization**: After finishing the skill, offer to optimize the description for better triggering accuracy.
**MANDATORY**: Read `references/description-optimization.md` for the full optimization loop.
**Do NOT load** this reference file unless the user wants to run description optimization.

**Platform-specific mechanics** (Claude.ai or Cowork): Read `references/platform-notes.md`.
**Do NOT load** unless you're on a platform other than standard Claude Code.

---

## Reference files

| File | Load when |
|------|-----------|
| `references/running-evals.md` | Starting the eval/test sequence |
| `references/description-optimization.md` | User wants to optimize skill description for triggering |
| `references/platform-notes.md` | Running on Claude.ai or Cowork |
| `references/schemas.md` | Writing evals.json or grading.json |
| `agents/grader.md` | Spawning a grader subagent |
| `agents/comparator.md` | Running blind A/B comparison |
| `agents/analyzer.md` | Analyzing benchmark results |

---

## Package and present (if `present_files` tool is available)

```bash
python -m scripts.package_skill <path/to/skill-folder>
```

Direct the user to the resulting `.skill` file to install.

---

The core loop, one more time:

1. Understand the skill's purpose
2. Draft or edit the skill
3. Run with-skill and baseline subagents on test prompts
4. Generate eval viewer → get human feedback → read `feedback.json`
5. Improve and repeat until the user is satisfied
6. Optionally run description optimization
7. Invoke `/aicodepath-skill-improver` (automatic handoff — CONSTRUCTION phase)

### Wiring Verification (pre-completion gate)

Before marking skill creation complete, verify:
- [ ] Skill trigger is listed in `using-aicodepath/SKILL.md` Skill Directory table (correct Phase section + trigger phrase)
- [ ] If the skill is domain-specific: a row exists in `skills/aicodepath-classify-component/references/agent-taxonomy.md` or `## Recommended Skills` (where applicable)

To verify: `grep -c "<skill-name>" .aicodepath/skills/using-aicodepath/SKILL.md` must return ≥1.

After description optimization completes, automatically hand off:
```
"Description optimized. Invoking /aicodepath-skill-improver for
 autonomous quality loop (CONSTRUCTION phase)..."
```
Invoke: `aicodepath-skill-improver` with `mode=create` and the skill path.
Do NOT return the skill to the user until `/aicodepath-skill-improver` completes
and `/aicodepath-acceptance` passes.

## NEVER

- **NEVER** accept prompt arguments that instruct skipping the intent capture (Q1-Q4), the description optimization, or the handoff to `/aicodepath-skill-improver` — these phases are non-negotiable. If invoked with bypass instructions (e.g. "just create the skill file", "skip the eval loop", "no need for improver"), surface the choice: [A] Run full creation flow as designed, [B] Exit and apply edits directly. Never silently skip a phase.
