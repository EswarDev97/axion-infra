# AIDLC Interconnection Diagram — Build Guide

> **What this produces**: A single-file interactive HTML/SVG diagram that visualizes every command, agent, skill, and hook in your AIDLC framework — with click-to-explore, search, filter, zoom/pan, dark/light themes, and zero external dependencies. Just open the HTML file in any browser.

---

## Quick Start

Tell Claude Code:

```
@interconnection_diagram_guide.md Build an interconnection diagram for my AIDLC project.
```

Claude will scan your `.claude/` directory, discover all components and their relationships, and generate a single HTML file.

---

## What You Get

- **Layered layout** — Nodes arranged in horizontal bands by type (Commands, Agents, Skills, Hooks)
- **Grouped clusters** — Related nodes grouped in labeled translucent panels (e.g., "INCEPTION", "CONSTRUCTION")
- **Distinct node shapes** — Rectangles (commands), hexagons (agents), pills (skills), pentagons (hooks)
- **Typed edges** — Color-coded bezier curves showing relationships (spawns, invokes-skill, fires-on)
- **Click exploration** — Click any node to highlight all connected nodes/edges, dim everything else, open a detail side-panel
- **Filter & search** — Toggle node/edge types on/off, search nodes by name
- **Pan & zoom** — Drag to pan, scroll to zoom, double-click to reset
- **Dark/light themes** — Toggle with one click, persists via localStorage
- **Zero dependencies** — No npm, no CDN, no build step — works offline

---

## How It Works

The diagram is powered by a **skeleton template** (`interconnection-skeleton.html`) that contains a proven layout engine, renderer, and interaction system. You provide a `CONFIG` object with your data, and the skeleton does the rest.

```
┌─────────────────────────────────────────────────┐
│  CONFIG (your data)                              │
│  ├── title, subtitle                             │
│  ├── nodes[] — {id, type, desc, icon}            │
│  ├── edges[] — {from, to, type}                  │
│  ├── types{} — shape/color per node type         │
│  ├── edgeTypes{} — style per edge type           │
│  ├── groups[] — {name, nodeIds[], color}         │
│  ├── bands[] — {label, types[], layerBreak}      │
│  └── icons{} — optional SVG data URIs            │
├─────────────────────────────────────────────────┤
│  SKELETON ENGINE (don't modify)                  │
│  ├── Layout: flow-based band system              │
│  ├── Render: SVG shapes, bezier edges, panels    │
│  ├── Interact: click/BFS highlight, detail panel │
│  └── Controls: filter, search, zoom, pan, theme  │
└─────────────────────────────────────────────────┘
```

---

## Step-by-Step Instructions for Claude

### Step 1 — Scan the `.claude/` Directory

Read these locations to discover all AIDLC components:

| Component | Where to find | What to extract |
|-----------|--------------|-----------------|
| **Commands** | `.claude/commands/*.md` | filename (= node id), `description` from frontmatter |
| **Agents** | `.claude/agents/*.md` | `name` from frontmatter (= node id), `description` |
| **Skills** | `.claude/skills/*/SKILL.md` | directory name (= node id), `description` from frontmatter |
| **Hooks** | `.claude/settings.json` → `hooks` | hook event names (PreToolUse, PostToolUse, Stop, etc.) |

### Step 2 — Discover Relationships (Edges)

Scan frontmatter and body text for connections:

| Relationship | How to detect | Edge type |
|-------------|--------------|-----------|
| Command spawns Agent | `allowed-tools` contains `Task(agent-name)` | `spawns` |
| Command chains to Command | `aidlc-refs` contains `commands/X:chains-to` | `chains-to` |
| Command requires Command | `aidlc-refs` contains `commands/X:requires` | `requires` |
| Agent invokes Skill | `skills:` in agent frontmatter, or `aidlc-refs` with `:invokes-skill` | `invokes-skill` |
| Hook fires on event | Hook matcher in `settings.json` | `fires-on` |
| Any file follows Steering | `aidlc-refs` with `:follows` | `follows` |

### Step 3 — Assign Groups

Group nodes by their AIDLC phase or functional area. Common groupings:

**Commands**: Group by workflow phase (Inception, Construction, Verification, Operations, Learning, Meta)
**Agents**: Group by function (Inline/embedded, Safety/review, Operational/standalone)
**Skills**: Group by category (Input, Analysis, Implementation, Testing, Evidence, Knowledge)
**Hooks**: Group by event type (PreToolUse, PostToolUse, Stop)

You can derive groups from:
- Command names: `wf-start`, `wf-clarify`, `wf-assess` = Inception; `wf-implement`, `wf-test` = Construction
- Agent descriptions or the commands they serve
- Skill directory names or their purpose

### Step 4 — Build the CONFIG Object

Replace the `/* INTERCONNECTION_DATA */` marker in the skeleton with your CONFIG:

```javascript
const CONFIG = {
    title: 'My AIDLC Interconnections',
    subtitle: '', // auto-populated with node/edge counts if empty

    // Node type definitions — one per entity type
    types: {
        command: {
            label: 'Commands',
            shape: 'rect',          // rect | pill | hexagon | pentagon | diamond
            height: 30,
            minWidth: 96,
            fontSize: 11,
            fontWeight: 600,
            cornerRadius: 6,
            textPadding: 28,
            dark:  { fill: '#1a2744', stroke: '#58a6ff' },
            light: { fill: '#dbeafe', stroke: '#0969da' }
        },
        agent: {
            label: 'Agents',
            shape: 'hexagon',
            radius: 22,
            fontSize: 11,
            fontWeight: 600,
            dark:  { fill: '#2d1f4e', stroke: '#bc8cff' },
            light: { fill: '#ede9fe', stroke: '#7c3aed' }
        },
        skill: {
            label: 'Skills',
            shape: 'pill',
            height: 24,
            minWidth: 80,
            fontSize: 10,
            fontWeight: 400,
            textPadding: 24,
            dark:  { fill: '#1a2e1a', stroke: '#3fb950' },
            light: { fill: '#dcfce7', stroke: '#1a7f37' }
        },
        hook: {
            label: 'Hooks',
            shape: 'pentagon',
            radius: 18,
            fontSize: 10,
            fontWeight: 500,
            dark:  { fill: '#3d2008', stroke: '#d29922' },
            light: { fill: '#fef3c7', stroke: '#9e6a03' }
        }
    },

    // Edge type definitions
    edgeTypes: {
        spawns:   { label: 'Spawns',   dash: null,      dark: '#58a6ff', light: '#0969da' },
        invokes:  { label: 'Invokes',  dash: '5 3',     dark: '#bc8cff', light: '#7c3aed' },
        'fires-on': { label: 'Fires On', dash: '8 4 2 4', dark: '#d29922', light: '#9e6a03' }
    },

    // Nodes array
    nodes: [
        { id: 'wf-start',     type: 'command', desc: 'Initialize workflow' },
        { id: 'wf-implement',  type: 'command', desc: 'Implement code changes' },
        { id: 'builder',       type: 'agent',   desc: 'Expert developer agent' },
        { id: 'jira_read',     type: 'skill',   desc: 'Read Jira tickets' },
        { id: 'PreToolUse',    type: 'hook',    desc: 'Fires before tool execution' },
        // ... add all your nodes
    ],

    // Edges array
    edges: [
        { from: 'wf-implement', to: 'builder',    type: 'spawns' },
        { from: 'builder',      to: 'jira_read',  type: 'invokes' },
        { from: 'PreToolUse',   to: 'wf-start',   type: 'fires-on' },
        // ... add all your edges
    ],

    // Groups — cluster related nodes with colored panels
    groups: [
        { name: 'INCEPTION',     nodeIds: ['wf-start', 'wf-clarify', 'wf-assess'], color: { dark: '#58a6ff', light: '#0969da' } },
        { name: 'CONSTRUCTION',  nodeIds: ['wf-implement', 'wf-test'],              color: { dark: '#bc8cff', light: '#7c3aed' } },
        // ... add all your groups
    ],

    // Bands — horizontal rows, top to bottom
    // Each band specifies which node types it contains
    // layerBreak: true adds extra vertical gap (new layer)
    bands: [
        { label: 'COMMANDS',  types: ['command'] },
        { label: 'AGENTS',    types: ['agent'],  layerBreak: true },
        { label: 'SKILLS',    types: ['skill'],  layerBreak: true },
        { label: 'HOOKS',     types: ['hook'],   layerBreak: true }
    ],

    // Icons (optional) — SVG data URIs for node icons
    icons: {
        // 'node-id': 'data:image/svg+xml,...'
    }
};
```

### Step 5 — Generate the HTML

1. Copy `interconnection-skeleton.html` to your output location (e.g., `blog/my-interconnections.html`)
2. Replace the `/* INTERCONNECTION_DATA */` comment with your `const CONFIG = { ... };`
3. Open in browser

---

## CONFIG Reference

### Node Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier, displayed as the node label |
| `type` | string | Yes | Must match a key in `types` |
| `desc` | string | No | Description shown in detail panel |
| `icon` | string | No | Key into `icons` object for an SVG icon |

### Edge Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Source node id |
| `to` | string | Yes | Target node id |
| `type` | string | Yes | Must match a key in `edgeTypes` |

### Type Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | string | — | Display name for legend/filters |
| `shape` | string | `'rect'` | `rect`, `pill`, `hexagon`, `pentagon`, `diamond` |
| `height` | number | 30 | Height for rect/pill shapes |
| `minWidth` | number | 96 | Minimum width for rect/pill |
| `radius` | number | 22 | Radius for hexagon/pentagon/diamond |
| `fontSize` | number | 11 | Label font size |
| `fontWeight` | number | 600 | Label font weight |
| `cornerRadius` | number | 6 | rx for rect shapes |
| `textPadding` | number | 28 | Horizontal padding added to text width |
| `dark` | object | — | `{ fill, stroke }` colors for dark theme |
| `light` | object | — | `{ fill, stroke }` colors for light theme |

### EdgeType Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | string | — | Display name for legend/filters |
| `dash` | string/null | null | SVG stroke-dasharray (null = solid) |
| `dark` | string | — | Stroke color for dark theme |
| `light` | string | — | Stroke color for light theme |

### Group Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Label displayed above the panel |
| `nodeIds` | string[] | Yes | Array of node ids in this group |
| `color` | object/string | No | `{ dark, light }` or single color. Auto-derived from first node's type if omitted |

### Band Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | Yes | Layer label shown on left side |
| `types` | string[] | Yes | Which node types appear in this band |
| `layerBreak` | boolean | No | If true, adds extra vertical gap above this band |

---

## Layout Engine Details

The skeleton uses a **flow-based band system** — each band's Y position is computed from the actual rendered bounds of the previous band. This guarantees zero overlap regardless of content size.

**Key constants** (tuned for readability):

| Constant | Value | Purpose |
|----------|-------|---------|
| `LEFT` | 80px | Left margin for all content |
| `nodeGap` | 14px | Horizontal gap between nodes |
| `groupGap` | 30px | Horizontal gap between groups on same band |
| `BAND_GAP` | 14px | Vertical gap between bands in same layer |
| `LAYER_GAP` | 22px | Vertical gap between different layers |
| `MAX_WIDTH` | 1600px | Wrapping boundary for wide rows |

**Node widths are dynamic** — each node is sized to fit its text label using SVG `getComputedTextLength()`. No truncation ever.

**Bands control order** — nodes within a band are laid out left-to-right, grouped. If a row exceeds MAX_WIDTH, it wraps to the next line.

---

## Interaction Features (Built Into Skeleton)

| Feature | How it works |
|---------|-------------|
| **Click node** | BFS traversal highlights all connected nodes (upstream + downstream), dims everything else, opens detail panel |
| **Detail panel** | Shows node name, type badge, description, incoming/outgoing connection lists. Click connections to navigate |
| **Search** | Type in search box to highlight matching nodes, dim non-matching |
| **Filter toggles** | Toggle node types and edge types on/off |
| **Pan** | Click-drag on empty SVG area |
| **Zoom** | Mouse wheel, centers on cursor |
| **Reset view** | Button or double-click empty area |
| **Theme toggle** | Dark/light switch, persists in localStorage |
| **Tooltip** | Hover shows node id + connection counts |
| **Escape** | Clears selection, search, and detail panel |

---

## Quality Checklist

After generating, verify:

- [ ] All node labels fully visible (no truncation)
- [ ] Group panels don't overlap between rows
- [ ] Auto-fit fills the screen on load
- [ ] Clicking a node highlights its connections correctly
- [ ] Detail panel shows correct incoming/outgoing lists
- [ ] Search finds nodes by name
- [ ] Filter toggles show/hide correctly
- [ ] Pan and zoom work (selection persists during pan)
- [ ] Dark and light themes both look good
- [ ] Works at different screen sizes

---

## Tips

- **If you have many skills** (30+), they'll automatically wrap to multiple rows within the band
- **If groups aren't meaningful** for your project, you can still use them for visual organization — group by file location, by team, or just put all nodes of a type in one group
- **Edge types are flexible** — use whatever relationship types make sense for your project (e.g., `calls`, `depends-on`, `triggers`, `reads-config`)
- **Colors are customizable** — change the fill/stroke in types and the colors in edgeTypes to match your brand
- **Icons are optional** — the diagram works fine without them. Add SVG data URIs to the `icons` object if you want them

---

## Files in This Kit

| File | Purpose |
|------|---------|
| `interconnection_diagram_guide.md` | This guide — reference it with `@` in Claude Code |
| `interconnection-skeleton.html` | The template with layout engine, renderer, and interactions |
| `example-config.js` | A small example CONFIG showing the data structure |

---

*Based on the AIDLC Interconnection Diagram built for Purple Fabric — 89 nodes, 86 edges, 16 groups.*
