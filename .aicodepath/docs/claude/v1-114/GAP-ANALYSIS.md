# v1-114 → AICodePath Gap Analysis

**Created**: 2026-04-18
**Basis**: `.aicodepath/docs/claude/v1-114/` reference pack (Claude Code v2.1.113 + Opus 4.7)
**Scope**: Identify framework assets, workflow, configuration, and processes in `aicodepath-tool` that need updates or creation to align with the v2.1.108–v2.1.113 series and Opus 4.7.
**Method**: File-level source inspection of the current framework. Each finding cites line numbers.

> **Status: ANALYSIS ONLY.** No framework changes have been made yet. Review this report,
> decide which items to action, and the next task will implement the approved set.

---

## Summary

| Tier | Count | Meaning |
|------|-------|---------|
| 🔴 **HIGH** | 3 | User-facing gap + low-risk trivial fix. Do first. |
| 🟡 **MEDIUM** | 3 | Consistency / doc drift. Works today but drifts further as 4.7 adoption grows. |
| 🟢 **LOW** | 4 | Nice-to-have or discovery items. Schedule later. |
| ✅ **ALIGNED** | 5 | Already correct — record so we don't re-audit. |

**Total: 10 gaps, 5 verified alignments.**

---

## 🔴 HIGH-PRIORITY GAPS

### G1. Default `effortLevel` in settings template is stale for Opus 4.7

**Evidence**: `.aicodepath/templates/claude-settings.json.template:8`

```json
"effortLevel": "high",
```

**v1-114 finding**: Claude Code v2.1.111 added `xhigh` effort level, and `xhigh` is the new
**default** on Opus 4.7. Existing users without a manually set effort level were
auto-upgraded to `xhigh` when 4.7 shipped. `high` sits **two notches below** `max` now —
below the new default.

**Impact**: Every downstream project installed after this template ships gets the pre-4.7
default effort, which is objectively less reasoning depth than Claude would give them by
default without the setting.

**Proposed fix**: Change `"effortLevel": "high"` → `"effortLevel": "xhigh"`.

**Tradeoff**: `xhigh` uses more tokens than `high`. Per v1-114 Opus 4.7 recipe table:
- Planning: `xhigh` (plan quality compounds)
- Execution: `high`
- Verification: `xhigh`

The AIDLC pipeline spends most time in planning + verification, so `xhigh` is the better
default. Users working in execution-heavy sessions can `/effort high` to drop down.

---

### G2. `effort-scorer.js` only knows 3 effort levels (missing `xhigh`, `max`)

**Evidence**: `.aicodepath/lib/effort-scorer.js`

- Line 21 (docstring): `"effortLevel": "low" | "medium" | "high"` — stale, missing two levels.
- Lines 47–51 (`EFFORT_LEVELS`): only `low / medium / high` defined.
- Lines 122–124: score mapping caps at `high` (score ≥ 3 = high).
- Line 170 (user-facing guidance): tells users to set `"effortLevel": "high"` regardless of how
  complex the task scores.

**v1-114 finding**: Five effort levels exist (`low`, `medium`, `high`, `xhigh`, `max`).
`xhigh` is the per-task default for coding/agentic work. `max` is for correctness-critical
evals and final-pass review.

**Impact**: The effort scorer hard-caps its recommendation at `high` even for explicit
`[high-effort]` markers (+3 score). Users who opt in to the marker think they're getting
maximum reasoning, but are actually getting one tier below default.

**Proposed fix**:

```javascript
EFFORT_LEVELS = {
  low:    { symbol: '○', label: 'Low',    min: 0, max: 0 },
  medium: { symbol: '◐', label: 'Medium', min: 1, max: 2 },
  high:   { symbol: '●', label: 'High',   min: 3, max: 4 },
  xhigh:  { symbol: '◉', label: 'X-High', min: 5, max: 6 },
  max:    { symbol: '✦', label: 'Max',    min: 7, max: Infinity },
};
```

Redistribute scoring so:
- Score 0 → `low`
- Score 1–2 → `medium`
- Score 3–4 → `high`
- Score 5–6 → `xhigh` (default for [high-effort] marker + another factor)
- Score ≥7 → `max` (used only when `hasFailureHistory` + `explicit marker` + multiple factors stack)

Update `buildEffortGuidance()` to suggest `xhigh` for the new default tier and include
`/effort` slash-command instruction (the interactive slider that shipped in v2.1.111).

---

### G3. `agent-authoring.md` lists `temperature` as a Claude Code agent field

**Evidence**: `.aicodepath/docs/developer/agent-authoring.md:35`

> `temperature` — sampling temperature (default: 1)

**v1-114 finding**: On Opus 4.7, the API rejects `temperature`, `top_p`, `top_k` with
**HTTP 400**. Sampling params were removed entirely. Claude Code agent frontmatter that sets
`temperature` will pass it through to the API call and fail.

**Impact**: Any agent we author with a `temperature:` field in its YAML frontmatter will
break when spawned on Opus 4.7. None of our current 106 agents set this field (confirmed via
spot checks), but documentation recommends it. Authors following the guide may introduce
breakage.

**Proposed fix**: Strike `temperature` from the documented frontmatter schema and add a note:

> **Removed on Opus 4.7**: Do not set `temperature`, `top_p`, or `top_k`. Opus 4.7 rejects
> these with HTTP 400. Reasoning depth is now controlled by effort level (`low`/`medium`/
> `high`/`xhigh`/`max`) rather than sampling parameters.

**Secondary check**: `.aicodepath/rules/construction/ai-implementation.md:176,182` contains
code examples setting `temperature: 0.7` / `0.5`. These examples are user-guidance for
building third-party AI apps (not AICodePath itself calling Claude), but we should add an
Opus 4.7 callout because users may copy the examples against Anthropic's API.

---

## 🟡 MEDIUM-PRIORITY GAPS

### G4. Six skills still declare `TodoWrite` in `allowed-tools` (native Task tools replaced it)

**Evidence**: 6 skills mix or exclusively use `TodoWrite` while the broader codebase has
already migrated to native `TaskCreate/TaskGet/TaskUpdate/TaskList`:

| Skill | Lines | What it references |
|-------|-------|-------------------|
| `aicodepath-efficiency-mode` | 5, 46–51, 83, 154 | `TodoWrite` in frontmatter + prose + "working memory" pattern |
| `aicodepath-specify` | 6 | `TodoWrite` in frontmatter |
| `aicodepath-agent-creator` | 5 | `TodoWrite` in frontmatter |
| `aicodepath-implement` | 5, 54 | Both `TodoWrite` and `Task` in frontmatter; uses TodoWrite in text |
| `aicodepath-gap-analysis` | 6 | `TodoWrite` in frontmatter |
| `aicodepath-orchestration-mode` | 5, 62, 94–98 | `TodoWrite` in frontmatter + "save decisions" pattern |

**v1-114 finding**: Native Task tools (`TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList`)
replaced `TodoWrite`. They persist in `~/.claude/tasks/`, support `addBlockedBy`
dependencies, and are shared across sessions via `CLAUDE_CODE_TASK_LIST_ID`. `TodoWrite`
still works but is legacy; `CLAUDE_CODE_ENABLE_TASKS=false` is required to keep using it.

**Impact**: The framework ends up with two task systems running side by side. Users get
confused about which to use. Our own skills can't use `addBlockedBy` from the `TodoWrite`
path, losing the DAG dependency primitive that `aicodepath-swarm` and builder-validator
patterns depend on.

**Proposed fix**: Three options, pick one:

1. **(Recommended)** Replace `TodoWrite` with `TaskCreate` / `TaskUpdate` / `TaskList` in the
   6 skills' `allowed-tools` lists and update the prose examples to use Task tools. Low risk,
   aligns with our swarm/orchestrate infra.
2. Dual-list both (`TodoWrite, TaskCreate, TaskUpdate, TaskList`) — keeps backward compat for
   users who set `CLAUDE_CODE_ENABLE_TASKS=false`. Slightly more verbose.
3. Leave as-is until Anthropic removes `TodoWrite`. Risk: users copying our skill examples
   will produce mixed-mode code.

---

### G5. Settings template missing v2.1.108–113 new settings

**Evidence**: `.aicodepath/templates/claude-settings.json.template` does not expose (or even
document) several settings and env vars added in the recent releases:

| Setting / env var | Shipped | What it does | Proposed default |
|-------------------|---------|--------------|------------------|
| `sandbox.network.deniedDomains` | v2.1.113 | Block specific domains even when `allowedDomains` wildcard permits | Empty array, with doc comment |
| `ENABLE_PROMPT_CACHING_1H` | v2.1.108 | 1-hour prompt cache TTL (was 5-min) | `"1"` (subscription users get longer cache) |
| `FORCE_PROMPT_CACHING_5M` | v2.1.108 | Force 5-minute TTL | — (leave unset) |
| `autoScrollEnabled` | v2.1.110 | Disable conversation auto-scroll in fullscreen | — (leave at default) |
| `OTEL_LOG_RAW_API_BODIES` | v2.1.111 | Emit full API bodies as OTel log events | — (disabled; doc only) |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | v2.1.111 | PowerShell tool on Win / opt-in Linux+mac | Doc only — depends on user |
| `--tui fullscreen` / `tui` setting | v2.1.110 | Flicker-free rendering | Doc only — user preference |
| `/less-permission-prompts` skill | v2.1.111 | Native transcript → allowlist proposer | Doc mention in permission workflow |

**Impact**: Medium. None of these break anything today; the template just doesn't take
advantage of features shipped in the last 10 days. Adding comments in the template improves
discoverability.

**Proposed fix**: Add a new `.aicodepath/docs/claude/v1-114/template-additions.md` that lists
each setting with rationale, then update the template with commented-out examples for the
discretionary ones and a live value for `ENABLE_PROMPT_CACHING_1H: "1"`.

---

### G6. `COMPLEXITY_BUDGETS` in pricing-calculator may need +35% on Opus 4.7

**Evidence**: `.aicodepath/lib/pricing-calculator.js:170–176`

```javascript
const COMPLEXITY_BUDGETS = {
  trivial:      { outputTokens:   200, ... },
  simple:       { outputTokens:  1000, ... },
  moderate:     { outputTokens:  2500, ... },
  complex:      { outputTokens:  6000, ... },
  very_complex: { outputTokens: 15000, ... },
};
```

**v1-114 finding**: Opus 4.7 has a **new tokenizer**. The same input/output content encodes
into **1.0–1.35× more tokens** than 4.6, depending on content type. List pricing is
unchanged at $5/$25 per million, but effective cost per request can rise.

**Impact**: The budgets above are soft advisory numbers used by `checkBudget()` (line 239)
to tell users "on track / approaching / over budget." On Opus 4.7, legitimate work will
appear to go over these budgets at 100% of the old threshold even when it's actually
on-track — creating spurious "over budget, checkpoint now" messages.

**Proposed fix** — two options:

1. **Model-aware budgets**: Parameterize `COMPLEXITY_BUDGETS` by model family. Opus 4.7 gets
   1.35× multiplier, Sonnet/older-Opus stays unchanged. Requires threading `modelId` into
   `checkBudget()`.
2. **Flat +35% bump**: Simplest. Increase all budgets by 35%:
   - trivial 200 → 270
   - simple 1000 → 1350
   - moderate 2500 → 3375
   - complex 6000 → 8100
   - very_complex 15000 → 20250

Option 2 wastes budget headroom on Sonnet sessions but is one-line safe. Option 1 is more
correct but slightly more invasive. **Recommend benchmarking** a few real sessions on 4.7
via `v1/messages/count_tokens` (per v1-114 migration guide) before picking the exact ratio.

---

## 🟢 LOW-PRIORITY GAPS

### G7. `aicodepath-review` could offer optional `--native` path to `/ultrareview`

**Evidence**: `.aicodepath/skills/aicodepath-review/SKILL.md:1–60`

Our review runs 4–5 perspectives (code quality, security, performance, accessibility +
SOLID) via the `aicodepath-code-reviewer` agent, producing A–D grades and APPROVE /
REQUEST_CHANGES decisions. Runs locally against unstaged/staged changes.

**v1-114 finding**: Native `/ultrareview` (v2.1.111) spawns 4 parallel specialist agents
(security, logic, performance, style) in the cloud using parallel multi-agent analysis and
critique. Pro/Max users get **3 free runs per month**. Diffstat UI in the launch dialog.
Supports `/ultrareview <PR#>` for GitHub PR reviews.

**Impact**: Overlap is ~80%. Our skill is free and runs locally; theirs is cloud-parallelised
and gets tighter per-agent specialisation. Neither fully subsumes the other.

**Proposed fix** (optional): Add `--native` flag to `aicodepath-review`:

```bash
/aicodepath-review code --native        # delegates to /ultrareview
/aicodepath-review code --depth strict  # existing local 5-perspective
```

When `--native` is passed, invoke `/ultrareview` via the Skill tool and pass through the
user's target (branch diff, staged changes, or PR number). Fall back to local review on
non-Pro/Max plans.

Low priority because the local review already works. This is a convenience for users who
have the Pro/Max free-run budget.

---

### G8. Document `auto` permission mode interaction with `auto-mode-detector.js`

**Evidence**: `.aicodepath/lib/auto-mode-detector.js` exists (file list confirms). Our
framework has an internal "auto mode" concept detached from Claude Code's native `auto`
permission mode.

**v1-114 finding**: Claude Code v2.1.111 removed the `--enable-auto-mode` requirement.
`auto` is now a first-class permission mode alongside `default / acceptEdits / plan /
dontAsk / bypassPermissions`. It runs every tool call through a classifier (Sonnet 4.6) that
drops broad allow rules like `Bash(*)`, `Bash(python*)`, `Bash(node*)`, and any `Agent`
rule on entry.

**Impact**: Potential naming collision / user confusion. If a user reads our docs for
"auto mode" and then uses Claude Code's native `auto`, the behaviors are different — ours is
a workflow-router concept; theirs is permission classification.

**Proposed fix**:
- Rename our internal concept in docs only (file name unchanged for stability) to
  "AIDLC auto-workflow-router" so users can distinguish.
- Add a doc section in `settings-reference.md` reference explaining how our `--auto` flag
  differs from Claude Code's `auto` permission mode.
- Check our settings template doesn't conflict with the native `auto` mode (confirmed: no
  `"defaultMode": "auto"` is set).

---

### G9. Channels plugin integration (Telegram/Discord/iMessage) — discovery

**Evidence**: `.aicodepath/hooks/desktop-notify-hook.js` exists for native desktop
notifications. Nothing currently integrates with Claude Code Channels.

**v1-114 finding**: Channels shipped in v2.1.80+. Plugin-based MCP servers connect Claude
Code to Telegram / Discord / iMessage. Allows async messaging into a running session. Pro /
Max auth only.

**Impact**: None today. Opportunity: AICodePath could ship a Channels pack that sends:
- GICL score hitting ≥90 ("Task ready for commit")
- Build/test failures
- Long-running swarm team completion
- CI pipeline events
…to a user's configured channel. Extends `desktop-notify-hook.js` beyond the current
local-terminal boundary.

**Proposed fix**: Do nothing this cycle. File under "ecosystem expansion" for a future
release. Note in roadmap.

---

### G10. Document native `/less-permission-prompts` in the routing layer

**Evidence**: The skill `fewer-permission-prompts` already appears in the SessionStart
available-skills list as a Claude-Code-native skill (v2.1.111). We do **not** have or need a
`aicodepath-*` equivalent.

**v1-114 finding**: `/less-permission-prompts` scans your transcript and proposes a
prioritized allowlist for `.claude/settings.json` — pure transcript mining, no logic we could
add.

**Impact**: None — the native skill works out of the box. **However**, our
`using-aicodepath` routing doc doesn't tell users about it, so users may ask Claude to
manually configure permissions instead of invoking this purpose-built skill.

**Proposed fix**: Add a one-liner to `using-aicodepath/SKILL.md` trigger table:

> User asks "reduce permission prompts" / "stop asking for approval" →
> `/less-permission-prompts` (native, v2.1.111+)

---

## ✅ ALREADY ALIGNED (no action needed)

### N1. Pricing for Opus 4.7 already classifies correctly

**Evidence**: `.aicodepath/lib/pricing-calculator.js:17–25, 61–69`

`MODEL_TIERS.opus_new` has `input: 5.0, output: 25.0` (matches Opus 4.5+ list pricing). The
version extractor (`extractVersion`) correctly parses `claude-opus-4-7-*` as `{major: 4,
minor: 7}`, which satisfies the `minor >= 5` condition on line 66 and routes to `opus_new`.
No change needed.

### N2. `aicodepath-swarm` already uses Agent Teams with fallback

**Evidence**: `.aicodepath/skills/aicodepath-swarm/SKILL.md:14–21`

```
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
# If Agent Teams is not available, the skill falls back to `/aicodepath-orchestrate`.
```

The skill checks the feature flag at line 37, falls back gracefully, and uses
`addBlockedBy` (line 50–52) for DAG dependencies — exactly the native primitive documented
in v1-114. No overlap/rewrite needed.

### N3. Settings template has no broad allow rules that auto-mode would drop

**Evidence**: `.aicodepath/templates/claude-settings.json.template` — grep for
`Bash(*)`, `Bash(python*)`, `Bash(node*)`, or `Agent` returned zero matches.

Auto mode's "drop broad allow rules on entry" behavior does not penalize this template.
Narrow rules (if any added later in `permissions.allow`) should carry through.

### N4. `PermissionRequest` hook already registered

**Evidence**: `.aicodepath/templates/claude-settings.json.template:64–74`

`permission-request-hook.js` is wired into the `PermissionRequest` lifecycle event. The
v2.1.110 fix ensures `updatedInput` returned from this hook is now re-checked against deny
rules — our hook does not return `updatedInput` (only `decision` + `reason`), so this fix
doesn't change our behavior. Compatible.

### N5. Agent Teams enabled by default in template

**Evidence**: `.aicodepath/templates/claude-settings.json.template:18–20`

```json
"env": {
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
}
```

Every downstream init gets Agent Teams enabled. No action needed.

---

## Proposed Action Plan (sorted by dependency)

If all items are approved, recommended sequence:

1. **G1 → G2 → G3** (high-priority, atomic, single-PR bundle).
   - G1: template one-line change.
   - G2: `effort-scorer.js` extension + unit tests.
   - G3: `agent-authoring.md` + `ai-implementation.md` doc updates.

2. **G5** (settings template comments) — can go in the same PR as G1 or follow.

3. **G4** (TodoWrite → Task tools migration across 6 skills) — larger, tests each skill;
   best as a dedicated PR.

4. **G6** (pricing budgets recalibration) — needs a quick `count_tokens` benchmark before
   picking the ratio. Run benchmark → update → unit tests.

5. **G7, G8, G10** (docs + optional review routing) — bundle as a documentation PR.

6. **G9** (Channels) — roadmap item; defer.

---

## Things Deliberately Not in Scope

- Cross-platform `CLAUDE_CODE_USE_POWERSHELL_TOOL` adoption — only relevant if framework
  adds PowerShell-first hooks, which it doesn't.
- Task budgets beta header (`task-budgets-2026-03-13`) — feature is API-side and not
  consumed by our framework code. If a downstream app wants it, they add the header; the
  framework shouldn't hardcode beta headers.
- Full migration to `thinking={"type": "adaptive"}` config — Claude Code handles this
  transparently when the user is on Opus 4.7. AICodePath does not construct raw API calls.
- Fast mode pricing commentary — fast mode is Opus **4.6** only; Opus 4.7 supersedes it via
  `/effort` slider.

---

## Questions for User Before Implementation

1. On **G1**, approve flipping the default from `high` to `xhigh`? (Cost impact: adaptive
   thinking runs longer; real cost depends on workload.)
2. On **G4**, which option — full migration (1), dual-listing (2), or defer (3)?
3. On **G6**, do you want the benchmark-first approach or a flat +35% bump?
4. On **G7**, ship the `--native /ultrareview` routing or leave user to invoke natively?
5. Any items from "ALIGNED" you want me to re-verify with deeper inspection?
