---
name: aicodepath-interconnection-diagram
description: Generate interactive HTML diagram of all AICodePath components — skills, agents, hooks, guidelines with edge discovery.
user-invocable: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Bash
argument-hint: "[--output path] [--title 'Custom Title']"
---

# AICodePath Interconnection Diagram

Generate a single-file, zero-dependency interactive HTML diagram of all AICodePath components and their relationships.

## What This Produces

A standalone `aicodepath-interconnection-diagram.html` file in `aicodepath-docs/memory/interconnection/` that visualizes:

- **Skills** (pills, grouped by AIDLC phase in column layout) — from `.claude/skills/`
- **Agents** (hexagons, grouped by function) — from `.claude/agents/`
- **Hooks** (pentagons, horizontal row) — from `.claude/settings.json`
- **Guidelines** (diamonds, quality enforcement layer) — from `.aicodepath/guidelines/`
- **Rules groups** (rectangles, workflow rules library) — from `.aicodepath/rules/`

With interactive features:
- Click any node → highlight all connected nodes/edges + open detail panel with structured description
- Collapsible side panel (chevron toggle), expandable per-connection descriptions
- Filter by node/edge type, search by name
- Pan/zoom, dark/light theme toggle
- Works offline — no CDN, no npm

---

## Workflow

### Step 1 — Read the Kit Guide

Read `kit/interconnection_diagram_guide.md` for the full specification before scanning.

### Step 2 — Discover Components

Scan these locations to collect nodes:

| Component | Location | Node ID | What to Extract |
|-----------|----------|---------|-----------------|
| Agents | `.claude/agents/*.md` | `name` from frontmatter **with `aicodepath-` prefix stripped** (e.g. `architect` not `aicodepath-architect`) | `description` from frontmatter |
| Skills | `.claude/skills/*/SKILL.md` | directory name | `description` from frontmatter; full body for edge detection |
| Hooks | `.claude/settings.json` → `hooks` array | `matcher` event name (e.g. `PreToolUse-Write`) | script path(s) for Step 3 |
| Guidelines | `.aicodepath/guidelines/*.json` | filename without `.json` (e.g. `coding-standards`) | top-level `description` or `name` field if present |
| Rules groups | `.aicodepath/rules/` subdirectories | subdirectory name (e.g. `construction`, `common`) | file count + representative filenames |

**IMPORTANT — hidden directory:** `.claude/` starts with a dot, so `Glob` will NOT find files inside it. Always use `Bash` with `ls` to discover files in `.claude/`:

```bash
ls .claude/agents/            # list agent files
ls .claude/skills/            # list skill directories
```

After listing paths with Bash, read each file individually with the Read tool. Do NOT use Glob for `.claude/` paths — it silently returns nothing for hidden directories.

**Reading guidelines:** Use `Glob` for `.aicodepath/guidelines/*.json` (not hidden). Read each file and extract `name` or `description` if present; otherwise derive a label from the filename.

**Reading rules groups:** Use `Bash` to list subdirectories:
```bash
ls -d .aicodepath/rules/*/    # list subdirectory groups
```
Each subdirectory becomes one `rule-group` node (e.g. `rules/construction`, `rules/common`). Do not create individual nodes for each of the 70+ rule files — that is too granular.

### Step 3 — Introspect Hook Scripts

For each hook event discovered in Step 2, find its script path from `settings.json` and read the script. Extract real edges from the source code:

```bash
# Script paths are in settings.json hooks array, e.g.:
# { "matcher": "PreToolUse", "hooks": [{ "command": "node /path/to/hook.js" }] }
```

Scan each hook script for these patterns:

| Pattern in script | Edge to create |
|-------------------|----------------|
| `require('../guidelines/')` or path contains `guidelines/` | `hook-event → guideline-id` with type `loads` |
| Reads all files in `guidelinesDir` (e.g. `fs.readdir(guidelinesDir)`) | `hook-event → ALL_GUIDELINES` — add edges to every guideline node |
| Skill name in a file path, e.g. `skills/using-aicodepath/SKILL.md` | `hook-event → skill-id` with type `fires-on` |
| `rules/` path reference | `hook-event → rules/subdir` with type `loads` |
| Agent name in a `require()` or string (e.g. `agent-suggester`, `suggestAgents`) | `hook-event → agent-id` with type `spawns` |

Read **every** hook script listed in `settings.json` in parallel (batch Read calls). Do not skip any script. Focus on `require()` calls, file path strings, and function calls that name skills, agents, or guideline files.

<HARD-GATE>
Do NOT add any edge from a hook until you have read the actual script file and found an explicit reference to the target. If you have not read the file, you cannot claim the edge exists.
</HARD-GATE>

**Mandatory scan checklist — tick each off before building EDGES:**
- [ ] Read EVERY script path found in `settings.json` hooks — no exceptions
- [ ] For each script, check: does it call `fs.readdir(guidelinesDir)` or similar? → add `loads` edge to **every** guideline (not a subset)
- [ ] For each script, check: does it reference a skill path (e.g. `skills/X/SKILL.md`)? → add `fires-on` edge to that skill
- [ ] For each script, check: does it reference `rules/` subdirectory paths? → add `loads` edge to that rule group
- [ ] For each script, check: does it call `suggestAgents()` or reference an agent name in a string/require? → add `spawns` edge

**Special case — bulk guideline loading:** If a hook script reads all files from a guidelines directory (e.g. `fs.readdir`, `glob('*.json')`, or iterates all `.json` files), add a `loads` edge from that hook event to **every single guideline node** — not just the ones you recognize. Count them from the actual directory scan in Step 2.

### Step 4 — Discover Edges from Skills and Agents

<HARD-GATE>
Do NOT add any skill→agent (`spawns`) or skill→skill (`invokes`) edge based on memory, the AIDLC skill chain documentation, or prior knowledge. Every edge must be found in the actual source text of the file being read.
</HARD-GATE>

Read **every** skill body (`.claude/skills/*/SKILL.md`) and **every** agent body (`.claude/agents/*.md`) in batches. For each file read, scan the body text for these patterns:

| Relationship | How to Detect | Edge Type | Evidence required |
|-------------|--------------|-----------|-------------------|
| Skill invokes Agent | Body explicitly names an agent (e.g. "use the `code-reviewer` agent", "spawn `architect`") | `spawns` | Quote the sentence from the file |
| Skill chains to Skill | Body explicitly says "invoke `/aicodepath-X`", "run `/aicodepath-X`", or names a skill in a step instruction | `invokes` | Quote the sentence from the file |
| Skill references rule group | Body references a `rules/` subdirectory path or a known rule file name | `loads` | Quote the path reference from the file |
| Agent uses guideline | Agent body explicitly names a guideline category | `loads` | Quote the mention from the file |

**Only add an edge if the source text unambiguously names the target.** Do not infer from context or phase proximity.

**Edge evidence log** — maintain an internal list as you scan, before writing EDGES:
```
skill/agent file → target → edge type → quoted evidence
e.g. "aicodepath-tdd/SKILL.md → test-engineer → spawns → 'invoke the test-engineer agent to write the failing test'"
```
Only edges with a quote in the evidence log are valid. Discard any edge you cannot quote.

**Mandatory file-read verification — complete this before writing any EDGES:**

```
Files found via `ls .claude/skills/`:          ___ skill directories
Files actually read this session (SKILL.md):   ___
Files found via `ls .claude/agents/`:          ___ agent files
Files actually read this session (agents):     ___
Hook scripts found in settings.json:           ___
Hook scripts actually read this session:       ___
```

<HARD-GATE>
If "found" and "actually read" counts do not match for ANY row above — STOP.
Read the remaining unread files before writing a single edge.
Proceeding with mismatched counts produces a silently incomplete diagram.
There is no valid reason to skip this check.
</HARD-GATE>

### Step 5 — Assign Phase Groups and Agent Groups

**Skills → PHASES array** — assign each skill to one phase column:

| Phase ID | num | Typical skills |
|----------|-----|----------------|
| `PRE-FLIGHT` | `01` | preflight, diagnostics, init, help, using-aicodepath |
| `INCEPTION` | `02` | requirements, brainstorm, classify-component, write-plan, c4-architecture, diagrams, mental-model |
| `CONSTRUCTION` | `03` | tdd, implement, gicl-start, validate-guidelines, review, test, debug, confidence-check, solid-principles, analyze, coding-standards |
| `EXECUTION` | `04` | orchestrate, orchestration-mode, work, swarm, subagent-dev, composite-worker, efficiency-mode, worktree |
| `VERIFICATION` | `05` | verify, acceptance, vapt |
| `SESSION` | `06` | checkpoint, pause, resume, rewind, learn, knowledge, status |
| `AUTHORING` | `07` | agent-creator, agent-audit, hook-creator, hook-audit, skill-creator, skill-audit, skill-improver, skill-testing, command-creator |
| `LEARNING` | `08` | preferences, codebase-pattern-finder, visual-memory, research-mode |
| `DEVTOOLS` | `09` | git, git-monorepo-config, naming-analyzer, reducing-entropy, release, dependency-updater, statusline, prompt-engg, interconnection-diagram, readme-crafter |
| `DOMAIN` | `10` | android, pm, web-quality, webapp-testing, frontend-design-review, gcp-monorepo-deploy, mcp-builder, model-training, and any domain-specific skills |

Each phase has a color `{ dark: '#hex', light: '#hex' }`. Use visually distinct colors across phases.

**Agents → AGENT_GROUPS array** — assign each agent to a functional group:

| Group ID | Agents (all 106) |
|----------|-----------------|
| `ARCHITECTURE` | architect, backend-architect, api-designer, database-architect, frontend-architect, mobile-architect, cloud-architect |
| `QUALITY` | code-reviewer, test-engineer, qa, plan-critic, plan-analyst, refactoring-expert, code-simplifier, accessibility-tester |
| `SEC+OPS` | security-engineer, compliance-auditor, devops-architect, sre-engineer, performance-engineer, ci-fixer, cost-optimizer, chaos-engineer, incident-responder |
| `ML+AI` | data-scientist, ml-engineer, data-engineer, nlp-engineer, rl-engineer, ai-engineer, llm-architect |
| `DESIGN` | ui-designer, ux-designer, communication-coach, technical-writer, writing-auditor |
| `LANGUAGES` | typescript-expert, python-expert, golang-expert, rust-expert, java-expert, kotlin-expert, csharp-expert, cpp-expert, php-expert, swift-expert, elixir-expert, dotnet-core-expert, dotnet-framework-expert, javascript-expert, powershell-expert |
| `FRAMEWORKS` | react-expert, vue-expert, angular-expert, nextjs-expert, django-expert, fastapi-expert, laravel-expert, rails-expert, spring-boot-expert, symfony-expert, expo-rn-expert, flutter-expert, wordpress-master |
| `CLOUD+INFRA` | kubernetes-expert, terraform-expert, azure-infra-expert, deployment-engineer, network-engineer, platform-engineer, windows-infra-expert, m365-admin, it-ops-orchestrator |
| `DOMAIN` | fintech-engineer, iot-engineer, embedded-systems, blockchain-developer, game-developer, quant-analyst, payment-integration, postgres-expert, sql-expert, slack-expert, cli-developer, tooling-engineer, build-engineer, seo-specialist, legacy-modernizer, error-detective |
| `BUSINESS` | market-researcher, competitive-analyst, trend-analyst, data-researcher, business-analyst, customer-success-manager, legal-advisor, scrum-master, content-marketer, sales-engineer, risk-manager, license-engineer, search-specialist, idea-validator |
| `INTERNAL` | swarm-lead, error-recovery, codebase-pattern-finder |

**Hooks → HOOK_IDS array** — ordered list of hook event names (e.g. `SessionStart`, `UserPromptSubmit`, `PreToolUse-Write`, `PostToolUse-Write`, etc.)

**CHAIN** — `Set` of skill IDs that form the core AIDLC skill chain (invoked sequentially by `using-aicodepath`): `using-aicodepath`, `aicodepath-knowledge`, `aicodepath-brainstorm`, `aicodepath-write-plan`, `aicodepath-confidence-check`, `aicodepath-tdd`, `aicodepath-gicl-start`, `aicodepath-verify`, `aicodepath-checkpoint`, `aicodepath-learn`.

**Guidelines → GUIDELINES array** — one entry per `.aicodepath/guidelines/*.json` file:

```javascript
{ id: 'coding-standards', label: 'Coding Standards', desc: 'one-line summary' }
```

**Rule groups → RULE_GROUPS array** — one entry per subdirectory in `.aicodepath/rules/`:

| Rule Group ID | Subdirectory | Typical content |
|---------------|-------------|-----------------|
| `rules/construction` | `.aicodepath/rules/construction/` | docker, database, nosql, message-queue design patterns |
| `rules/common` | `.aicodepath/rules/common/` | cross-cutting rules applied in multiple phases |
| `rules/inception` | `.aicodepath/rules/inception/` | requirements, RE, workspace detection rules |
| `rules/core` | `.aicodepath/rules/core/` | core AIDLC workflow rules (inception.md, etc.) |
| `rules/operations` | `.aicodepath/rules/operations/` | deployment, monitoring rules |

### Step 6 — Build the Data Objects

Replace `/* INTERCONNECTION_DATA */` in `kit/interconnection-skeleton.html` with these eight constants:

```javascript
const NODE_DESCS = {
  // id → structured description object (or plain string fallback)
  // Use this for ALL node types: skills, agents, hooks, guidelines, rule groups
  'skill-id': {
    summary:   'What this component does — 1-2 sentences extracted from the SKILL.md description.',
    context:   'Key context: when it fires, which hook triggers it, what phase it belongs to.',
    whenToUse: 'Specific conditions under which you would invoke this skill or agent.',
    phase:     'CONSTRUCTION'   // AIDLC phase label shown as a badge in the panel
  },
  'coding-standards': {
    summary:   'JSON rule file defining naming conventions, import ordering, and code structure.',
    context:   'Loaded by guideline-validator on every Write/Edit operation.',
    whenToUse: 'Referenced automatically — not invoked directly.',
    phase:     'QUALITY ENFORCEMENT'
  },
  'rules/construction': {
    summary:   '28 design pattern rules for construction phase (docker, database, nosql, queues).',
    context:   'Loaded by hooks and referenced by construction-phase skills.',
    whenToUse: 'Consulted when designing infrastructure, databases, or messaging.',
    phase:     'CONSTRUCTION'
  },
  // Plain string is also accepted as fallback (rendered as summary only):
  'SessionStart': 'Fires when a new Claude session begins. Injects the using-aicodepath skill.',
};

const EDGES = [
  // { from, to, type }
  // type: 'invokes' | 'spawns' | 'fires-on' | 'loads'
  { from: 'using-aicodepath',    to: 'aicodepath-knowledge',  type: 'invokes'  },
  { from: 'PreToolUse-Write',    to: 'coding-standards',      type: 'loads'    },
  { from: 'PreToolUse-Write',    to: 'security-rules',        type: 'loads'    },
  { from: 'SessionStart',        to: 'using-aicodepath',      type: 'fires-on' },
  // ... all edges discovered in Steps 3 and 4
];

const PHASES = [
  // { id, num, color: { dark, light }, skills: ['skill-id', ...] }
  { id: 'PRE-FLIGHT', num: '01', color: { dark: '#4a9eff', light: '#005fd0' }, skills: ['using-aicodepath', 'aicodepath-preflight', ...] },
  // 10 phases total, 5 per row
];

const AGENT_GROUPS = [
  // { id, color: { dark, light }, agents: ['agent-id', ...] }
  { id: 'ARCHITECTURE', color: { dark: '#c084fc', light: '#7e22ce' }, agents: ['architect', 'backend-architect', ...] },
  // ...
];

const HOOK_IDS = [
  // ordered list of hook event IDs (pentagons across top row)
  'SessionStart', 'UserPromptSubmit', 'PreToolUse-Write', 'PostToolUse-Write', /* ... */
];

const CHAIN = new Set([
  'using-aicodepath', 'aicodepath-knowledge', 'aicodepath-brainstorm',
  'aicodepath-write-plan', 'aicodepath-confidence-check', 'aicodepath-tdd',
  'aicodepath-gicl-start', 'aicodepath-verify', 'aicodepath-checkpoint', 'aicodepath-learn',
]);

const GUIDELINES = [
  // One entry per .aicodepath/guidelines/*.json file
  // { id, label, desc }
  { id: 'coding-standards',        label: 'Coding Standards',        desc: 'Naming, imports, structure' },
  { id: 'security-rules',          label: 'Security Rules',          desc: 'OWASP, auth, injection prevention' },
  { id: 'testing-standards',       label: 'Testing Standards',       desc: 'Coverage, mocking, test structure' },
  // ... one entry per file found in .aicodepath/guidelines/
];

const RULE_GROUPS = [
  // One entry per subdirectory in .aicodepath/rules/
  // { id, label, count, desc }
  { id: 'rules/construction', label: 'Construction Rules', count: 28, desc: 'Docker, DB, NoSQL, queues, storage design patterns' },
  { id: 'rules/common',       label: 'Common Rules',       count: 23, desc: 'Cross-cutting rules applied across phases' },
  { id: 'rules/inception',    label: 'Inception Rules',    count: 8,  desc: 'Requirements, RE, workspace detection' },
  { id: 'rules/core',         label: 'Core Rules',         count: 8,  desc: 'Core AIDLC workflow rules' },
  { id: 'rules/operations',   label: 'Operations Rules',   count: 2,  desc: 'Deployment and monitoring rules' },
];
```

**Edge types:**
- `invokes` — one skill calls another (dashed purple)
- `spawns` — skill/hook launches an agent (solid blue)
- `fires-on` — hook event triggers a skill (double-dashed amber)
- `loads` — hook or skill loads a guideline or rule group (dotted grey) — discovered by introspecting hook scripts in Step 3

### Step 7 — Generate the Output File

1. Read `kit/interconnection-skeleton.html`
2. Replace the `/* INTERCONNECTION_DATA */` marker with the eight data constants above (`NODE_DESCS`, `EDGES`, `PHASES`, `AGENT_GROUPS`, `HOOK_IDS`, `CHAIN`, `GUIDELINES`, `RULE_GROUPS`)
3. **Inject nav bar CSS** — add the following block immediately before the closing `</style>` tag in the skeleton HTML:

```css
.top-nav-bar{position:relative;z-index:20;height:40px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;gap:4px;font-family:ui-monospace,monospace;flex-shrink:0;}
.nav-brand{font-size:11px;font-weight:700;color:var(--text);letter-spacing:.04em;margin-right:10px;}
.nav-link{font-size:10px;padding:3px 9px;border-radius:3px;color:var(--text2);text-decoration:none;transition:color .1s,background .1s;white-space:nowrap;}
.nav-link:hover{color:var(--text);background:var(--bg3);}
.nav-link.active{color:var(--accent);background:var(--bg3);font-weight:700;}
.nav-sep{width:1px;height:16px;background:var(--border);margin:0 2px;}
.nav-theme-btn{margin-left:auto;font-size:10px;padding:3px 9px;border-radius:3px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer;font-family:inherit;}
.nav-theme-btn:hover{background:var(--bg3);color:var(--text);}
```

4. **Inject nav bar HTML** — replace the literal string `<body>\n<header>` with the following (use Python `str.replace` with `\n` as actual newline):

```html
<body>
<nav class="top-nav-bar">
  <span class="nav-brand">⬡ AICodePath</span>
  <div class="nav-sep"></div>
  <a class="nav-link active" href="aicodepath-interconnection-diagram.html">⬡ Framework Map</a>
  <a class="nav-link" href="aicodepath-phase-flow.html">▶ Phase Flow</a>
  <a class="nav-link" href="aicodepath-gicl-topology.html">⟳ GICL</a>
  <a class="nav-link" href="aicodepath-settings-audit.html">⚙ Settings</a>
  <a class="nav-link" href="aicodepath-skill-chain-feature.html">⛓ Skill Chain</a>
  <a class="nav-link" href="aicodepath-db-schema.html">🗄 DB Schema</a>
  <a class="nav-link" href="aicodepath-agent-heatmap.html">◈ Agent Map</a>
  <button class="nav-theme-btn" onclick="document.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');localStorage.setItem('ix-theme',document.documentElement.getAttribute('data-theme'))">Light/Dark</button>
</nav>
<header>
```

5. Write the result to `aicodepath-docs/memory/interconnection/aicodepath-interconnection-diagram.html`

**Output path**: `aicodepath-docs/memory/interconnection/aicodepath-interconnection-diagram.html`

Override with `--output path/to/file.html` if specified.

### Step 8 — Report

After writing the file, report:
- Output path
- Node count by type (N skills, N agents, N hooks, N guidelines, N rule groups)
- Edge count by type (invokes / spawns / fires-on / loads)
- **Edge evidence summary** — for each edge, one line: `from → to (type) — source: filename`
- Files read for edge discovery: list every hook script and skill file that was actually read (not assumed)
- How to open: `open aicodepath-docs/memory/interconnection/aicodepath-interconnection-diagram.html` (macOS) or `xdg-open` (Linux)

---

## Sub-Diagrams (Step 9 — Generate 6 Companion Views)

After generating the main interconnection diagram, also generate these 6 companion HTML files in `aicodepath-docs/memory/interconnection/` (same directory as the main diagram).

**CRITICAL:** D1–D5 are **bespoke HTML** — they do NOT use `kit/interconnection-skeleton.html`. Each uses a visualization type appropriate to its data. Only D6 (Agent Heatmap) still uses the skeleton. See reference implementation at `/tmp/gen_bespoke.py` and `/tmp/gen_d4_option_a.py`.

### Common requirements for all 7 files

**Design system (CSS variables):**
```css
:root {
  --bg: #0d1117; --bg2: #161b22; --bg3: #21262d; --bg4: #2d333b;
  --border: #30363d; --text: #e6edf3; --text2: #8b949e; --text3: #484f58;
  --accent: #58a6ff;
}
body.light { --bg: #f6f8fa; --bg2: #eaeef2; --bg3: #d0d7de;
  --text: #1f2328; --text2: #57606a; --text3: #8c959f; --accent: #0969da; }
```

**Nav bar** (sticky top, 40px, links between all 7 files, active page highlighted):
```html
<nav class="top-nav">
  <span class="nav-brand">AICodePath</span>
  <a class="nav-link nav-active" href="aicodepath-phase-flow.html">▶ Phase Flow</a>
  <a class="nav-link" href="aicodepath-interconnection-diagram.html">⬡ Framework Map</a>
  <!-- ... all 7 links -->
  <button class="theme-btn" onclick="document.body.classList.toggle('light')">Light</button>
</nav>
```

**Metadata footer** (fixed bottom-right, always visible):
```html
<div class="meta-footer">AICodePath v2.10.0 · Generated {YYYY-MM-DD}</div>
```
```css
.meta-footer { position:fixed; bottom:8px; right:12px; font-size:10px;
  color:var(--text3); font-family:monospace; pointer-events:none; z-index:200; }
```

**SVG pan/zoom** (for any SVG-based diagram — use viewBox manipulation, not CSS transform):
```javascript
let vb = {x:0, y:0, w:CANVAS_W, h:CANVAS_H};
function setVB() { svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`); }
svg.addEventListener('wheel', e => {
  e.preventDefault();
  const s = e.deltaY > 0 ? 1.12 : 0.89;
  const r = svg.getBoundingClientRect();
  const px = vb.x + (e.clientX-r.left)/r.width*vb.w;
  const py = vb.y + (e.clientY-r.top)/r.height*vb.h;
  vb.w*=s; vb.h*=s;
  vb.x = px-(e.clientX-r.left)/r.width*vb.w;
  vb.y = py-(e.clientY-r.top)/r.height*vb.h; setVB();
}, {passive:false});
// Also wire mousedown/mousemove/mouseup for panning, dblclick to reset
```

---

### D1 — Phase Flow (`aicodepath-phase-flow.html`)

**Visualization**: CSS pipeline card grid — **no SVG, no skeleton.**

**Layout**: Two rows of 5 `<div>` cards in a flex row, with a narrow arrow row between them. Curved SVG bezier arrows rendered as inline `<svg>` elements between cards.

**Each card contains**:
- Colored top border (`border-top: 3px solid var(--pc)`)
- Phase number badge (e.g. `01`), emoji icon, phase name, one-line description
- Up to 3 skill name chips, `+N more` overflow chip if >3 skills

**Data to embed** (10 phases × skills):

| Phase | Num | Icon | Color | Key Skills |
|-------|-----|------|-------|-----------|
| PRE-FLIGHT | 01 | 🔍 | `#4a9eff` | preflight, diagnostics, init, help |
| INCEPTION | 02 | 💡 | `#22c55e` | brainstorm, requirements, write-plan, c4-arch |
| CONSTRUCTION | 03 | 🔨 | `#f59e0b` | tdd, implement, gicl-start, validate-guidelines |
| EXECUTION | 04 | ⚡ | `#ef4444` | orchestrate, work, swarm, subagent-dev |
| VERIFICATION | 05 | ✅ | `#a78bfa` | verify, acceptance, vapt, review |
| SESSION | 06 | 💾 | `#06b6d4` | checkpoint, learn, resume, status |
| AUTHORING | 07 | ✍️ | `#f97316` | agent-creator, hook-creator, skill-creator, skill-audit |
| LEARNING | 08 | 🧠 | `#84cc16` | preferences, codebase-finder, visual-memory, research |
| DEVTOOLS | 09 | 🛠 | `#e879f9` | git, release, naming, reducing-entropy |
| DOMAIN | 10 | 🌐 | `#fb7185` | android, pm, web-quality, mcp-builder |

**Interaction**: Click card → show detail panel below grid (phase name, description, full skill list).

**Data source**: Phase table above (no file scanning needed — phases are stable AIDLC constants).

---

### D2 — GICL Topology (`aicodepath-gicl-topology.html`)

**Visualization**: SVG state machine with manually positioned DAG nodes + right-side panels. **No skeleton.**

**Canvas**: 900×640 SVG. Node positions are hardcoded for a clean DAG flow (top→bottom):

| Node | x | y | Label | Color |
|------|---|---|-------|-------|
| session-start | 450 | 50 | Start Session | `#4a9eff` |
| detect-complex | 450 | 130 | Detect Complexity | `#4a9eff` |
| lite-mode | 250 | 220 | Lite Mode | `#22c55e` |
| full-gicl | 650 | 220 | Full GICL | `#22c55e` |
| run-iteration | 650 | 310 | Run Iteration | `#f59e0b` |
| collect-scores | 450 | 390 | Collect Scores | `#f59e0b` |
| evaluate-gate | 650 | 470 | Evaluate Gate | `#ef4444` |
| suggest-agents | 320 | 555 | Suggest Agents | `#a78bfa` |
| session-complete | 540 | 555 | ✓ Complete | `#22c55e` |
| force-stop | 760 | 555 | Force Stop | `#ef4444` |
| stale-session | 100 | 130 | Stale → Close | `#8b949e` |

**Edges** (bezier quadratic curves, colored by destination type, with SVG `<marker>` arrowheads):
- session-start → detect-complex, stale-session
- detect-complex → lite-mode ("simple"), full-gicl ("complex")
- full-gicl → run-iteration → collect-scores → evaluate-gate
- evaluate-gate → run-iteration ("loop"), suggest-agents, session-complete ("score≥90"), force-stop ("max iter")

**Right panel** (240px fixed-width sidebar):
1. **Score Weights** — 5 horizontal CSS progress bars:
   - Tests 35% (`#22c55e`), Duplication 20% (`#f59e0b`), Guidelines 20% (`#4a9eff`), Architecture 15% (`#a78bfa`), Authenticity 10% (`#ef4444`)
2. **Stop Conditions** — 4 colored dot + label rows:
   - score ≥ 90 (green), max iterations (red), regression > 10 pts (amber), stalled 3 iters (grey)
3. **Node detail panel** — populated on click: shows node name + description

**Data sources**: Weights and stop conditions from `.aicodepath/lib/gicl-score-calculator.js` (read and verify before hardcoding). Node descriptions from reading `.aicodepath/hooks/gicl-iteration-hook.js`.

**Zoom/pan**: Full SVG viewBox-based zoom/pan (scroll, drag, double-click reset).

---

### D3 — Settings Audit (`aicodepath-settings-audit.html`)

**Visualization**: Two-column connector layout with live SVG bezier lines + center detail card. **No skeleton.**

**Layout**:
- Left column (220px): 13 hook event chips, stacked vertically
- Center: `position:relative` div containing:
  - Detail card (HTML, shown on selection — appears in **upper-center** of the panel, beneath the SVG)
  - `<svg>` overlay (`position:absolute inset:0`, `pointer-events:none`) — draws bezier curves on top
- Right column (260px): 27 scripts grouped into 7 categories

**Interaction**: Click any event chip or script →
1. Draw bezier curves from event to all its scripts
2. Show detail card in center panel with structured info about the selected item
3. Click same item again → clear curves and hide card
4. Click different item → switch to new selection

Use `getBoundingClientRect()` to compute bezier endpoints at runtime. The SVG is `position:absolute` so it always renders on top of the detail card.

---

**Center Detail Card — CSS:**

```css
.detail-card {
  display: none;
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: min(420px, 80%);
  background: var(--bg2);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 16px 18px;
  z-index: 1; /* below SVG (z-index:2) */
  box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  pointer-events: none; /* let clicks pass through to chips */
}
.detail-card.visible { display: block; }
.dc-type {
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .12em; color: var(--text3); margin-bottom: 6px;
}
.dc-name {
  font-size: 15px; font-weight: 700; color: var(--text);
  font-family: monospace; margin-bottom: 8px;
}
.dc-badge {
  display: inline-block; font-size: 9px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .1em;
  padding: 2px 7px; border-radius: 3px; margin-bottom: 10px;
  color: #fff;
}
.dc-row {
  display: flex; gap: 6px; align-items: baseline;
  margin-bottom: 5px; font-size: 11px;
}
.dc-label { color: var(--text3); width: 90px; flex-shrink: 0; }
.dc-value { color: var(--text2); flex: 1; }
.dc-count {
  font-size: 11px; font-weight: 700;
  color: var(--text); font-family: monospace;
}
```

**Center Detail Card — JS:**

Embed two lookup objects alongside the existing `scriptToEvt` / `DATA`:

```javascript
// Per-event details (keyed by event name)
const EVENT_DETAILS = {
  'SessionStart':        { phase: 'SESSION',      outputs: 'additionalContext, continue, suppressOutput', desc: 'Fires once at session start. Injects skill context into the conversation.' },
  'UserPromptSubmit':    { phase: 'PRE-FLIGHT',   outputs: 'additionalContext, decision/reason',          desc: 'Fires for every user message. Used for pre-flight checks and context injection.' },
  'PermissionRequest':   { phase: 'PRE-FLIGHT',   outputs: 'decision/reason',                             desc: 'Fires when Claude requests permission to use a tool. Can allow or block.' },
  'PreToolUse-Write':    { phase: 'CONSTRUCTION', outputs: 'additionalContext, decision/reason',          desc: 'Fires before Write or Edit tool calls. Runs validation, guards, and schema injection.' },
  'PreToolUse-Bash':     { phase: 'CONSTRUCTION', outputs: 'decision/reason',                             desc: 'Fires before Bash tool calls. Runs safety guardrails and commit validators.' },
  'PostToolUse-Write':   { phase: 'CONSTRUCTION', outputs: 'additionalContext, systemMessage',            desc: 'Fires after successful Write/Edit. Runs GICL scoring, security scan, skill suggestions.' },
  'PostToolUse-Bash':    { phase: 'CONSTRUCTION', outputs: 'additionalContext, systemMessage',            desc: 'Fires after successful Bash. Triggers post-commit learning and CI feedback.' },
  'PostToolUseFailure':  { phase: 'CONSTRUCTION', outputs: 'systemMessage',                              desc: 'Fires when any tool call fails. Used for reflexion-based recovery suggestions.' },
  'Stop':                { phase: 'SESSION',      outputs: 'stopReason, systemMessage',                  desc: 'Fires when Claude finishes a response. Runs final checks and status updates.' },
  'PreCompact':          { phase: 'SESSION',      outputs: 'additionalContext',                           desc: 'Fires before context window compaction. Saves state so context survives compression.' },
  'SessionEnd':          { phase: 'SESSION',      outputs: 'systemMessage',                               desc: 'Fires when the session ends. Persists session state for the next session.' },
  'Notification':        { phase: 'SESSION',      outputs: 'systemMessage',                               desc: 'Fires on system notifications (task completion, alerts). Forwards to dashboard.' },
  'WorktreeRemove':      { phase: 'SESSION',      outputs: 'systemMessage',                               desc: 'Fires when a git worktree is removed. Cleans up worktree lifecycle state.' },
};

// Per-script details (keyed by script ID, i.e. filename without .js)
const SCRIPT_DETAILS = {
  'session-start-hook':          { group: 'Session Lifecycle',   output: 'additionalContext', desc: 'Reads using-aicodepath/SKILL.md and injects it as context on every session start.' },
  'visual-memory-loader':        { group: 'Session Lifecycle',   output: 'additionalContext', desc: 'Loads relevant visual memory diagrams (ER, class, phase flow) into session context.' },
  'session-auto-cleanup':        { group: 'Session Lifecycle',   output: 'systemMessage',     desc: 'Closes stale GICL sessions and removes expired worktree records at session start.' },
  'session-end-hook':            { group: 'Session Lifecycle',   output: 'systemMessage',     desc: 'Persists session phase and GICL state to DB when a session ends.' },
  'pre-compact-hook':            { group: 'Session Lifecycle',   output: 'additionalContext', desc: 'Saves current context summary before compaction so state survives compression.' },
  'pre-flight-check':            { group: 'Pre-flight',          output: 'systemMessage',     desc: 'Verifies hooks, MCP servers, DB, and environment are correctly configured.' },
  'permission-request-hook':     { group: 'Pre-flight',          output: 'decision/reason',   desc: 'Validates tool permission requests against allow/block policy lists.' },
  'schema-context-hook':         { group: 'Write Guards',        output: 'additionalContext', desc: 'Injects DB schema context before Write/Edit on migration or schema files.' },
  'guideline-validator':         { group: 'Write Guards',        output: 'decision/reason',   desc: 'Validates code against 15+ JSON guideline rule files. Blocks on rule violations.' },
  'duplication-checker':         { group: 'Write Guards',        output: 'decision/reason',   desc: 'Detects significant code duplication before a file is written. Warns or blocks.' },
  'safety-guardrails':           { group: 'Write Guards',        output: 'decision/reason',   desc: 'Blocks dangerous patterns: credential access, destructive shell ops, force-push to main.' },
  'pre-commit-validator':        { group: 'Bash Guards',         output: 'decision/reason',   desc: 'Validates git commit operations — checks staged files, message format, and hook bypass attempts.' },
  'ci-status-checker':           { group: 'Bash Guards',         output: 'systemMessage',     desc: 'Checks CI pipeline status before Bash runs. Warns if the pipeline is currently failing.' },
  'auto-artifact-creator':       { group: 'Post-Write Quality',  output: 'systemMessage',     desc: 'Auto-generates diagrams and docs artifacts after significant code changes.' },
  'gicl-iteration-hook':         { group: 'Post-Write Quality',  output: 'additionalContext', desc: 'Runs GICL quality scoring (tests 35%, guidelines 20%, arch 15%, dup 20%, auth 10%) after Write/Edit.' },
  'post-tool-security-scan':     { group: 'Post-Write Quality',  output: 'systemMessage',     desc: 'Scans written code for OWASP Top 10 and AICodePath security rule violations.' },
  'test-tampering-detector':     { group: 'Post-Write Quality',  output: 'decision/reason',   desc: 'Detects if tests were weakened, skipped, or deleted — enforces TDD integrity.' },
  'plans-watcher':               { group: 'Post-Write Quality',  output: 'systemMessage',     desc: 'Monitors adr-log.md and tasks.md for changes; alerts when plan is modified.' },
  'tdd-order-check':             { group: 'Post-Write Quality',  output: 'systemMessage',     desc: 'Enforces test-before-implementation order — warns if implementation precedes failing tests.' },
  'auto-test-runner':            { group: 'Post-Write Quality',  output: 'systemMessage',     desc: 'Automatically runs the test suite after code files are written. Reports pass/fail.' },
  'construction-skill-suggester':{ group: 'Post-Write Quality',  output: 'additionalContext', desc: 'Suggests relevant construction-phase skills based on the pattern of code being written.' },
  'document-skill-suggester':    { group: 'Post-Write Quality',  output: 'additionalContext', desc: 'Suggests documentation skills (readme-crafter, c4-architecture) after significant writes.' },
  'post-commit-hook':            { group: 'Post-Bash Actions',   output: 'systemMessage',     desc: 'Fires aicodepath-learn after a git commit to extract and persist session lessons.' },
  'post-tool-failure-hook':      { group: 'Failure Handlers',    output: 'systemMessage',     desc: 'Handles tool failures with reflexion-based recovery suggestions from past sessions.' },
  'response-stop-hook':          { group: 'Failure Handlers',    output: 'systemMessage',     desc: 'Runs final checks when Claude finishes a response (verify gate, checkpoint reminder).' },
  'notification-hook':           { group: 'Failure Handlers',    output: 'systemMessage',     desc: 'Forwards system notifications to the dashboard WebSocket and logs them to DB.' },
  'worktree-lifecycle':          { group: 'Failure Handlers',    output: 'systemMessage',     desc: 'Cleans up worktree DB records and branch state when a git worktree is removed.' },
};
```

**Show/hide logic** — call `showDetail(type, id, color)` from `selectEvent()`:

```javascript
function showDetail(type, id, color) {
  const card = document.getElementById('detail-card');
  const isEvent = type === 'event';
  const data = isEvent ? EVENT_DETAILS[id] : SCRIPT_DETAILS[id];
  if (!data) { card.classList.remove('visible'); return; }

  document.getElementById('dc-type').textContent  = isEvent ? 'Hook Event' : 'Hook Script';
  document.getElementById('dc-name').textContent  = id;
  const badge = document.getElementById('dc-badge');
  badge.textContent = isEvent ? data.phase : data.group;
  badge.style.background = color;

  if (isEvent) {
    document.getElementById('dc-row1-label').textContent = 'Fires when';
    document.getElementById('dc-row1-value').textContent = data.desc;
    document.getElementById('dc-row2-label').textContent = 'Valid outputs';
    document.getElementById('dc-row2-value').textContent = data.outputs;
    document.getElementById('dc-row3-label').textContent = 'Scripts wired';
    const count = (DATA.eventToScripts[id] || []).length;
    document.getElementById('dc-row3-value').innerHTML = `<span class="dc-count">${count}</span>`;
  } else {
    document.getElementById('dc-row1-label').textContent = 'Purpose';
    document.getElementById('dc-row1-value').textContent = data.desc;
    document.getElementById('dc-row2-label').textContent = 'Output type';
    document.getElementById('dc-row2-value').textContent = data.output;
    document.getElementById('dc-row3-label').textContent = 'Triggered by';
    document.getElementById('dc-row3-value').textContent = scriptToEvt[id] || '—';
  }
  card.classList.add('visible');
}

function clearHighlights() {
  // ... existing clear logic ...
  document.getElementById('detail-card').classList.remove('visible');
}
```

**HTML markup** — place inside `.audit-center` before the `<svg>`:

```html
<div class="audit-center">
  <div class="detail-card" id="detail-card">
    <div class="dc-type" id="dc-type"></div>
    <div class="dc-name" id="dc-name"></div>
    <div class="dc-badge" id="dc-badge"></div>
    <div class="dc-row"><span class="dc-label" id="dc-row1-label"></span><span class="dc-value" id="dc-row1-value"></span></div>
    <div class="dc-row"><span class="dc-label" id="dc-row2-label"></span><span class="dc-value" id="dc-row2-value"></span></div>
    <div class="dc-row"><span class="dc-label" id="dc-row3-label"></span><span class="dc-value" id="dc-row3-value"></span></div>
  </div>
  <svg id="audit-svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2"></svg>
</div>
```

Give the SVG `z-index:2` and the detail card `z-index:1` so curves always draw over the card.

When `selectEvent()` is called from an event chip click, pass `type='event'`. When called from a script item click (via `getEvtForScript`), also call `showDetail('script', scriptId, color)` **before** calling `selectEvent()` so the card shows script info while the curves still highlight the event→scripts connections.

---

**Hook events** (13, with color and description):

| Event | Color | When |
|-------|-------|------|
| SessionStart | `#4a9eff` | Session begins |
| UserPromptSubmit | `#22c55e` | Each user message |
| PermissionRequest | `#84cc16` | Tool permission request |
| PreToolUse-Write | `#f59e0b` | Before Write/Edit |
| PreToolUse-Bash | `#f97316` | Before Bash |
| PostToolUse-Write | `#a78bfa` | After Write/Edit |
| PostToolUse-Bash | `#06b6d4` | After Bash |
| PostToolUseFailure | `#ef4444` | Tool fails |
| Stop | `#fb7185` | Response complete |
| PreCompact | `#8b5cf6` | Context compaction |
| SessionEnd | `#14b8a6` | Session ends |
| Notification | `#f59e0b` | System notification |
| WorktreeRemove | `#8b949e` | Worktree removed |

**Script groups** (7 groups, derive from reading `.claude/settings.json` — use script filename without `.js` as ID):

| Group | Color | Scripts |
|-------|-------|---------|
| Session Lifecycle | `#4a9eff` | session-start-hook, visual-memory-loader, session-auto-cleanup, session-end-hook, pre-compact-hook |
| Pre-flight | `#22c55e` | pre-flight-check, permission-request-hook |
| Write Guards | `#f59e0b` | schema-context-hook, guideline-validator, duplication-checker, safety-guardrails |
| Bash Guards | `#ef4444` | pre-commit-validator, ci-status-checker |
| Post-Write Quality | `#a78bfa` | auto-artifact-creator, gicl-iteration-hook, post-tool-security-scan, test-tampering-detector, plans-watcher, tdd-order-check, auto-test-runner, construction-skill-suggester, document-skill-suggester |
| Post-Bash Actions | `#06b6d4` | post-commit-hook |
| Failure Handlers | `#fb7185` | post-tool-failure-hook, response-stop-hook, notification-hook, worktree-lifecycle |

**Event→script mapping**: Read from `.claude/settings.json` `hooks` object — each hook event's `command` field gives the script path; derive the script ID from the filename.

**No SVG zoom** — layout is CSS, not SVG.

---

### D4 — Skill Chain per Feature (`aicodepath-skill-chain-feature.html`)

**Visualization**: **Option A — Three-Zone SVG Flow** — full-canvas SVG with three horizontal zones separated by thin lines. Click any node to BFS-highlight its connections. Full viewBox-based zoom/pan.

**Canvas**: 1340×570 SVG

**Zone 1 — Feature Pentagons** (top, y≈82):
Five feature type pentagons (radius 34) spread across the canvas:

| Feature | Color | cx |
|---------|-------|----|
| API Endpoint | `#4a9eff` | 115 |
| Database Feature | `#f59e0b` | 330 |
| Frontend Component | `#22c55e` | 580 |
| Security Feature | `#ef4444` | 830 |
| ML Model | `#a78bfa` | 1075 |

Pentagon shape: 5 points at -90°, -18°, 54°, 126°, 198° from center. Fill-opacity 0.14, stroke-width 1.8.

**Zone 2 — Core Chain Pills** (middle, y≈240):
Eight pill-shaped steps (118×34, rx=17) connected left-to-right with sequence arrows (`marker-end`):

`brainstorm(75) → write-plan(220) → confidence-check(365) → tdd(510) → gicl-start(660) → validate-guidelines(810) → verify(960) → checkpoint(1110)`

Below the pills (y≈313), domain-specific skill pills (100×22, rx=11) anchored to their chain step:
- `diagrams` (x=220) for Database Feature
- `model-training` (x=660) for ML Model
- `fe-design` (x=810) for Frontend Component
- `vapt` (x=960) for Security Feature

**Zone 3 — Agent Hexagons** (bottom, y≈455):
Twelve flat-top hexagons (radius 27) grouped by function:

| Group | Color | Agents |
|-------|-------|--------|
| ARCH | `#4a9eff` | api-designer(80), backend-arch(175), db-architect(270), fe-architect(365) |
| QUALITY | `#22c55e` | code-reviewer(490), test-engineer(583) |
| SEC+OPS | `#ef4444` | security-eng(710), compliance(803) |
| DESIGN | `#a78bfa` | ui-designer(930), ux-designer(1020) |
| ML+DATA | `#a78bfa` | data-sci(1150), ml-engineer(1240) |

Group backgrounds: semi-transparent `rect` with colored border (`fill-opacity:0.05, stroke-opacity:0.2`).

**Edges** (SVG paths, drawn below nodes):
- **Feature → Step** (`e-feat-step ef-{feat} es-{step}`): bezier from pentagon bottom → pill top; `opacity:0.07` by default; colored by feature; arrowhead marker
- **Feature → Agent** (`e-feat-agent ef-{feat} ea-{agent}`): bezier dashed; `opacity:0.05` default
- **Step → Step**: straight `<line>` always visible at `stroke:#444c56`

**Feature → Agent mapping**:
- api: api-designer, backend-architect, security-engineer, code-reviewer
- db: database-architect, backend-architect, code-reviewer
- frontend: frontend-architect, ui-designer, ux-designer, code-reviewer
- security: security-engineer, compliance-auditor, code-reviewer
- ml: data-scientist, ml-engineer, code-reviewer

**Click interaction (BFS)**:
- **Click feature**: highlight pentagon + all 8 step pills (colored stroke/fill) + spawned agents; dim other feature edges; brighten this feature's `ef-{id}` edges; dim domain skills not belonging to this feature
- **Click step**: highlight pill (accent color); show all `es-{id}` feature→step edges
- **Click agent**: highlight hexagon + invoking feature pentagons; brighten `ef-{feat}.ea-{agent}` edges; show info panel
- **Click again**: deselect (toggle)
- **Click SVG background**: clear all highlights

**Info panel**: Fixed bottom-left overlay, shows node name + description. `display:none` by default, `display:block` when `.show` class added.

**Zoom/pan**: Standard viewBox pattern (scroll to zoom centered on cursor, drag to pan, `+`/`−`/`⊡` buttons).

**SVG filter**: `<filter id="sc-glow">` with `feGaussianBlur stdDeviation="3.5"` applied to highlighted nodes.

**Data source**: Feature types and agent assignments are stable constants (defined in the skill). No file scanning required.

---

### D5 — DB Schema Map (`aicodepath-db-schema.html`)

**Visualization**: Interactive force-directed graph explorer — navigable knowledge graph where nodes are tables, edges are FK relationships, with focus mode and runtime JS simulation. **No skeleton.**

**Layout approach**: Two-phase layout.
- **Phase 1 (Python)**: `force_layout()` computes deterministic node positions offline (300 iterations, `random.seed(42)`). Physics: pairwise Coulomb repulsion (`REPUL=15000`), FK spring attraction (`SP_K=0.26`, `SP_REST=135`), domain cluster pull (`CLU_K=0.042`), velocity damping (`DAMP=0.75`). Positions are serialised into the SVG as static `cx`/`cy` attributes.
- **Phase 2 (JS)**: `runFocusSim()` re-runs 180-step force simulation at runtime when focus mode is active, updating positions via `requestAnimationFrame` every 8 steps.

**Canvas**: SVG 1400×820. Domain cluster centres:

| Domain | Centre (x, y) | Color |
|--------|---------------|-------|
| GICL | (238, 205) | `#4a9eff` |
| ARTIFACTS | (700, 205) | `#22c55e` |
| KNOWLEDGE | (1162, 205) | `#f59e0b` |
| SESSIONS | (238, 615) | `#a78bfa` |
| AGENTS | (700, 615) | `#ef4444` |
| METRICS | (1162, 615) | `#06b6d4` |

**Domain classification** (`classify_domain(tname)`):

| Domain | Table name patterns |
|--------|---------------------|
| GICL | `gicl_` |
| ARTIFACTS | `artifacts`, `links`, `code_`, `visual_`, `diagram_`, `search_` |
| KNOWLEDGE | `knowledge_`, `adr_`, `lessons_` |
| SESSIONS | `session`, `checkpoint`, `units`, `orchestration`, `swarm`, `sprint` |
| AGENTS | `agent`, `task_`, `hooks_` |
| METRICS | `metrics`, `token_`, `cost_`, `pricing`, `reflexion`, `feature_` |
| OTHER | everything else |

**Nodes**: SVG `<circle>` elements. Radius = `min(42, 28 + max(0, n_cols - 5) // 3)`. Colored by domain. Label below circle in 10px monospace. States: default / selected (stroke-width 3) / dimmed (opacity 0.2) / neighbour (stroke-width 2, opacity 0.9).

**FK edges**: Quadratic bezier (`M x1,y1 Q mx,my x2,y2`) with perpendicular offset for readability. Per-domain colored `<marker>` arrowheads in `<defs>`. States: default (opacity 0.35) / highlighted (opacity 0.9, stroke-width 2.5) / dimmed (opacity 0.05).

**FK extraction** (three layers, all from SQL source files):
1. **Table-level constraints**: `FOREIGN KEY (col) REFERENCES other(col)` regex
2. **Inline references**: column definition `REFERENCES other(col)` regex
3. **Heuristic `_id` suffix**: `foo_id` → tries `foo`, `foos`, `foes`, `f…ies` as candidate tables

**Data source**: Parse `.aicodepath/db/schema.sql` + all `.aicodepath/db/migrations/*.sql` for `CREATE TABLE` blocks. Extract table names, column names/types, and FK relationships using the three-layer approach above.

**Right panel** (288px, fixed right): Visible when a node is selected.
- Table name header with domain badge
- Column list: `◆ PK` badge for primary keys, `→ FK` badge for FK columns
- **FK Out** section: outbound FK links (clickable → select target node)
- **Referenced By** section: inbound FK links (clickable → select source node)

**JS interactions**:
- **Pan/zoom**: `wheel` event adjusts SVG `viewBox`; `mousedown` drag on background pans
- `selectNode(id)`: dims non-neighbours, highlights FK edges to/from node, renders right panel
- `renderPanel(id)`: populates column list, FK out, and referenced-by sections
- `enterFocusMode()`: hides non-neighbourhood nodes/edges, runs `runFocusSim()` on 1-hop subgraph
- `runFocusSim()`: 180-step JS force simulation (rAF loop, update every 8 steps)
- `animateTo(id, tx, ty, dur)`: ease-out cubic interpolation for smooth position transitions
- `exitFocusMode()`: restores all nodes, animates back to `origPos` (Python-computed positions)
- `searchNodes()`: matches input text, pans to first match, selects it

**Toolbar**: Search box, `⊙ Focus` button (enabled when a node is selected), `⊡ Reset` button.

---

### D6 — Agent Heatmap (`aicodepath-agent-heatmap.html`)

**Visualization**: Bespoke **matrix heatmap** — agents as rows (grouped by function), component types as columns, colored cells where the agent applies. **No skeleton.**

**Data source**: Read `.aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md` for the component-type → agent mappings.

**Layout**: Full-page table with sticky column headers and row group headers.

```
┌─────────────────┬──────┬─────┬──────┬──────────┬──────┬─────┬────────┬────────┬───────────────┬────┬────────┬─────┐
│ Agent           │ DB   │ API │ Svc  │ Security │ Test │ Dev │ Front  │ Mobile │ Observability │ AI │ FinOps │ All │
├─────────────────┼──────┼─────┼──────┼──────────┼──────┼─────┼────────┼────────┼───────────────┼────┼────────┼─────┤
│ ── ARCHITECTURE ──────────────────────────────────────────────────────────────────────────────────────────────── │
│ api-designer    │      │  ●  │      │          │      │     │        │        │               │    │        │     │
│ architect       │      │     │      │          │      │     │        │        │               │    │        │  ●  │
│ ...             │      │     │      │          │      │     │        │        │               │    │        │     │
├─────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ── QUALITY ────────────────────────────────────────────────────────────────────────────────────────────────────── │
│ ...             │      │     │      │          │      │     │        │        │               │    │        │     │
└─────────────────┴──────┴─────┴──────┴──────────┴──────┴─────┴────────┴────────┴───────────────┴────┴────────┴─────┘
```

**Component type columns** (12):

| ID | Label | Color |
|----|-------|-------|
| `database` | DB | `#4a9eff` |
| `api` | API | `#22c55e` |
| `service` | Service | `#f59e0b` |
| `security` | Security | `#ef4444` |
| `test` | Test | `#a78bfa` |
| `devops` | DevOps | `#06b6d4` |
| `frontend` | Frontend | `#f97316` |
| `mobile` | Mobile | `#84cc16` |
| `observability` | Observ. | `#e879f9` |
| `ai` | AI/ML | `#fb7185` |
| `finops` | FinOps | `#fbbf24` |
| `all` | All | `#94a3b8` |

**Agent row groups** (6, matching main diagram):

| Group | Color |
|-------|-------|
| ARCHITECTURE | `#c084fc` |
| QUALITY | `#4ade80` |
| SEC+OPS | `#f87171` |
| ML+DATA | `#a78bfa` |
| DESIGN | `#fbbf24` |
| FRAMEWORK | `#60a5fa` |

**Cell rendering**: For each `(agent, component-type)` pair present in the taxonomy, render a filled circle `●` with the component type's color at 85% opacity. Empty cells render nothing. On hover, show a tooltip with the agent description.

**Visual design requirements**:
- Dark/light theme using CSS variables (same design system as other pages)
- Sticky top header row (column labels) + sticky left column (agent names)
- Group header rows spanning full width with group color accent (left border 3px, background at 8% opacity)
- Each agent row: left-border colored by group, agent name in `font-family: monospace`
- Cell `●` is 14px, centered, with `filter: drop-shadow(0 0 4px currentColor)` on hover
- Stats bar above table: "28 agents · 12 component types · N mappings total"
- Click any column header → highlight that column (all cells in column get ring), click again to deselect
- Click any agent row → highlight that row, show detail card bottom-right with agent description
- Detail card: agent name badge (group color), description text, list of component types it covers
- Keyboard: `Esc` clears selection; `Tab` cycles through agents

**Full HTML structure**:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AICodePath — Agent Map</title>
<style>
/* design system variables */
:root { --bg:#0d1117; --bg2:#161b22; --bg3:#21262d; --bg4:#2d333b;
  --border:#30363d; --text:#e6edf3; --text2:#8b949e; --text3:#484f58; --accent:#58a6ff; }
body.light { --bg:#f6f8fa; --bg2:#eaeef2; --bg3:#d0d7de;
  --text:#1f2328; --text2:#57606a; --text3:#8c959f; --accent:#0969da; }

/* nav bar (same CSS as all pages) */
.top-nav-bar { ... }

body { margin:0; font-family:ui-monospace,'SF Mono','Fira Code',monospace;
  background:var(--bg); color:var(--text); display:flex; flex-direction:column; height:100vh; overflow:hidden; }

/* stats bar */
.stats-bar { height:36px; background:var(--bg2); border-bottom:1px solid var(--border);
  display:flex; align-items:center; padding:0 20px; gap:20px; font-size:11px; color:var(--text2); flex-shrink:0; }
.stats-bar .sv { color:var(--text); font-weight:700; }

/* scroll area */
.table-wrap { flex:1; overflow:auto; padding:20px; }

/* matrix table */
table { border-collapse:collapse; min-width:900px; }

/* sticky header */
thead th { position:sticky; top:0; z-index:10; background:var(--bg2);
  border-bottom:2px solid var(--border); padding:10px 8px; font-size:10px;
  font-weight:700; text-align:center; letter-spacing:.06em; cursor:pointer;
  transition:background .12s; white-space:nowrap; }
thead th:first-child { text-align:left; min-width:160px; position:sticky; left:0; z-index:20; }
thead th:hover { background:var(--bg3); }
thead th.col-active { background:var(--bg3); outline:1px solid var(--accent); }

/* group header row */
tr.group-hdr td { padding:8px 12px; font-size:9px; font-weight:700; letter-spacing:.1em;
  text-transform:uppercase; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }

/* data rows */
tr.agent-row td { padding:6px 8px; border-bottom:1px solid var(--border); font-size:11px;
  transition:background .1s; }
tr.agent-row:hover td { background:var(--bg3); }
tr.agent-row.row-active td { background:var(--bg3); }

/* sticky agent name cell */
td.agent-name { position:sticky; left:0; background:var(--bg2); font-weight:500;
  border-right:1px solid var(--border); padding:6px 12px; cursor:pointer;
  transition:color .1s; z-index:5; }
tr.agent-row:hover td.agent-name, tr.agent-row.row-active td.agent-name { background:var(--bg3); }

/* cell dot */
.dot { display:inline-block; width:14px; height:14px; border-radius:50%;
  cursor:default; transition:filter .15s, transform .15s; }
.dot:hover { filter:drop-shadow(0 0 5px currentColor); transform:scale(1.25); }

/* detail card */
#detail-card { position:fixed; bottom:20px; right:20px; width:300px;
  background:var(--bg2); border:1px solid var(--border); border-radius:8px;
  padding:16px; display:none; z-index:100; box-shadow:0 8px 32px rgba(0,0,0,.5); }
#detail-card.visible { display:block; }
.dc-group-badge { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em;
  padding:2px 8px; border-radius:3px; margin-bottom:10px; display:inline-block; color:#fff; }
.dc-agent-name { font-size:14px; font-weight:700; margin-bottom:8px; font-family:monospace; }
.dc-desc { font-size:11px; color:var(--text2); line-height:1.6; margin-bottom:10px; }
.dc-types { font-size:10px; color:var(--text3); }
.dc-types span { display:inline-block; padding:1px 6px; border-radius:3px; margin:2px;
  border:1px solid var(--border); }

/* metadata footer */
.meta-footer { position:fixed; bottom:8px; right:12px; font-size:10px;
  color:var(--text3); font-family:monospace; pointer-events:none; z-index:200; }
</style>
</head>
<body>
<!-- nav bar (with active = "◈ Agent Map") -->
<!-- stats bar -->
<div class="table-wrap">
<table>
  <thead>
    <tr>
      <th>Agent</th>
      <!-- one <th> per component type, colored label -->
    </tr>
  </thead>
  <tbody>
    <!-- for each group: group header row, then agent rows -->
  </tbody>
</table>
</div>
<div id="detail-card">...</div>
<div class="meta-footer">AICodePath v2.10.0 · Generated YYYY-MM-DD</div>
</body>
</html>
```

**JS behaviour**:
- On column header click: toggle `.col-active` on `<th>` and add `outline: 1px solid <col-color>` to every cell in that column
- On agent row click: toggle `.row-active`, populate and show `#detail-card` with agent name, group badge, description, and list of covered component types
- `document.addEventListener('keydown', e => { if(e.key==='Esc'||e.key==='Escape') clearAll(); })`
- `clearAll()` removes all `.col-active` / `.row-active` classes and hides detail card

---

## Incremental Updates

When the user asks to "update" or "regenerate" the diagram:
1. Re-run Steps 2-7 (re-scan all components, re-introspect hook scripts, re-discover edges, re-generate main diagram)
2. Regenerate D1–D5 as bespoke HTML using the patterns above (re-read source data files); use `/tmp/gen_bespoke.py` and `/tmp/gen_d4_option_a.py` as reference implementations
3. Regenerate D6 as a bespoke matrix heatmap (re-read agent-taxonomy.md)
4. Update the metadata footer date in all 7 files to today's date
5. Overwrite all existing output files in `aicodepath-docs/memory/interconnection/`
6. Report what changed (new nodes, edges, or scripts since last run)

---

## Efficiency Notes

- Use `Bash ls` (not Glob) to list files in `.claude/` — Glob silently fails on hidden directories
- After listing with Bash, read files in batches of 10+ using parallel Read calls where possible
- Read hook scripts in parallel — they are small JS files; read all 22 in one batch
- For guidelines, read all JSON files in parallel with a single batch Read — only extract `name`/`description`, not full rule content
- Edges are evidence-based — only add an edge if the source text explicitly names the target; do NOT infer
- Rule groups are grouped nodes — do not read individual rule files, only count them with `ls .aicodepath/rules/<subdir>/ | wc -l`
- The `loads` edge type can be high-cardinality (one hook loads all 16 guidelines) — emit all of them; the filter toggle lets users hide them

---

## Step 9 — Generate Bespoke Sub-Diagrams

After writing the main interconnection diagram (Step 7), run the bespoke script to produce D1–D6:

```bash
python3 .aicodepath/skills/aicodepath-interconnection-diagram/kit/gen_bespoke.py
```

The script gathers data **dynamically at runtime** — no hardcoded lists:

| Diagram | Dynamic data source |
|---------|-------------------|
| D1 Phase Flow | PHASES array extracted from the just-generated main diagram HTML |
| D2 GICL Topology | Static — GICL state machine is framework logic that rarely changes |
| D3 Settings Audit | `.claude/settings.json` — hook events → script mappings |
| D4 Skill Chain | `.aicodepath/agents/*.md` — agent names, groups, descriptions |
| D5 DB Schema | `.aicodepath/db/schema.sql` + all `db/migrations/*.sql` — tables + columns |
| D6 Agent Heatmap | `.aicodepath/skills/aicodepath-classify-component/references/agent-taxonomy.md` — component-type → agent matrix |

**When to re-run gen_bespoke.py:**
- After adding a new hook to `hooks.json` (D3 will pick it up from settings.json)
- After adding a new agent (D4, D6 scan `agents/*.md`)
- After adding a DB migration (D5 parses the new `.sql` file)
- After regenerating the main diagram when skills change (D1 re-extracts PHASES from the HTML)

**Ordering matters for D1:** Run the main diagram generation (Steps 1–8) first, then run gen_bespoke.py. D1 reads the PHASES constant from the freshly written main diagram HTML to get the full skill→phase mapping with current skill counts.

---

## Reference Files

| File | Purpose |
|------|---------|
| `kit/interconnection_diagram_guide.md` | Background spec — read in Step 1 |
| `kit/interconnection-skeleton.html` | HTML/JS skeleton — inject data constants at `/* INTERCONNECTION_DATA */` in Step 6 |
| `kit/gen_bespoke.py` | Bespoke sub-diagram generator — run after Step 7 to produce D1–D6 |

---

## NEVER

- **NEVER** hardcode or assume any edge — every edge must be derived from reading an actual source file (hook script or skill/agent body). If the file has not been read in this session, the edge cannot exist.
- **NEVER** limit `loads` edges from a hook that calls `fs.readdir(guidelinesDir)` or iterates all guideline files — that produces edges to **all** guidelines, not a curated subset of 4 or 5. Count from the actual `ls .aicodepath/guidelines/` result.
- **NEVER** assume the AIDLC skill chain edges (`knowledge → brainstorm → write-plan → ...`) without verifying them in `using-aicodepath/SKILL.md` — the chain evolves and the file is authoritative.
- **NEVER** add a `spawns` edge to an agent based on the agent's domain alone — only add it when a skill file explicitly names the agent in an instruction step.
- **NEVER** skip a hook script because it seems minor — every script in `settings.json` must be read and checked for references before EDGES is finalized.
- **NEVER** use the skeleton for D1–D6 sub-diagrams — they all require bespoke visualization types. The skeleton's horizontal band layout is only appropriate for the main interconnection diagram.
- **NEVER** use a CSS grid swimlane for D4 — it must use the Three-Zone SVG Flow (Option A) with pentagons, pills, and hexagons connected by BFS-highlightable edges.
- **NEVER** use the skeleton for D6 (Agent Heatmap) — it must be a bespoke matrix heatmap (sticky table, group headers, colored cell dots, detail card). The skeleton produces the wrong layout for a component-type × agent matrix.
- **NEVER** modify `kit/interconnection-skeleton.html` — it is the engine for the main diagram only. Only inject the eight data constants at `/* INTERCONNECTION_DATA */`.
- **NEVER** use full `aicodepath-<name>` IDs for agents in `AGENT_GROUPS`, `NODE_DESCS`, or `EDGES` — always strip the `aicodepath-` prefix and use short IDs (e.g. `architect`, `security-engineer`). The skeleton's hexagon renderer splits labels at the first hyphen; full IDs produce a redundant `aicodepath-` first line that overlaps neighbouring nodes.
- **NEVER** use the skeleton's `const CHAIN` for sub-diagrams — bespoke HTML files do not use it. If for any reason you must use the skeleton for a sub-diagram, always include `const CHAIN = new Set([]);` or it will crash.
- **NEVER** create individual nodes for each rule file — there are 70+ of them. Always group by subdirectory into `RULE_GROUPS` entries.
- **NEVER** read full guideline JSON rule arrays — only extract the top-level `name` or `description` field.
- **NEVER** output any diagram to the project root, `.aicodepath/`, or directly to `aicodepath-docs/memory/` — always write to `aicodepath-docs/memory/interconnection/` (the subdirectory).
- **NEVER** use Glob for `.claude/` paths — Glob silently returns nothing for hidden directories. Use `Bash ls` to list, then batch Read.
- **NEVER** include external CDN dependencies — all files must work fully offline.
- **NEVER** use CSS `transform` for SVG zoom — always use `viewBox` attribute manipulation so zoom centers on the cursor correctly.
- **NEVER** omit the metadata footer or nav bar from any generated file — they are required on all 7 outputs.
