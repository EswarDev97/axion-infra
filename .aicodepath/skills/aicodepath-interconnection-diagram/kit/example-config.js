// ============================================================================
// EXAMPLE CONFIG — Small AIDLC project with 12 nodes
// Replace the /* INTERCONNECTION_DATA */ marker in interconnection-skeleton.html
// with your own CONFIG following this structure.
// ============================================================================

const CONFIG = {

    title: 'My AIDLC Interconnections',
    subtitle: '12 nodes \u00b7 10 edges \u00b7 5 groups',

    // ── Node type definitions ──
    // One entry per entity type. Shape + colors define how nodes look.
    types: {
        command: {
            label: 'Commands',
            shape: 'rect',
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

    // ── Edge type definitions ──
    // Each relationship type gets a distinct color and line style.
    edgeTypes: {
        spawns: {
            label: 'Spawns Agent',
            dash: null,         // solid line
            dark: '#58a6ff',
            light: '#0969da'
        },
        invokes: {
            label: 'Invokes Skill',
            dash: '5 3',       // dashed line
            dark: '#bc8cff',
            light: '#7c3aed'
        },
        'fires-on': {
            label: 'Fires On',
            dash: '8 4 2 4',   // dot-dash line
            dark: '#d29922',
            light: '#9e6a03'
        }
    },

    // ── Nodes ──
    // Every component in your AIDLC project.
    nodes: [
        // Commands (scan .claude/commands/*.md)
        { id: 'wf-start',      type: 'command', desc: 'Initialize workflow, create branch, gather context' },
        { id: 'wf-clarify',    type: 'command', desc: 'Lock requirements and acceptance criteria' },
        { id: 'wf-implement',  type: 'command', desc: 'Make code changes aligned to plan' },
        { id: 'wf-test',       type: 'command', desc: 'Generate unit and integration tests' },
        { id: 'wf-verify',     type: 'command', desc: 'Local verification and quality gates' },

        // Agents (scan .claude/agents/*.md)
        { id: 'builder',       type: 'agent',   desc: 'Implement code changes according to plan' },
        { id: 'reviewer',      type: 'agent',   desc: 'Code review for quality and patterns' },
        { id: 'security',      type: 'agent',   desc: 'Security analysis for OWASP Top 10' },

        // Skills (scan .claude/skills/*/SKILL.md)
        { id: 'jira_read',     type: 'skill',   desc: 'Read Jira ticket details' },
        { id: 'git_status',    type: 'skill',   desc: 'Check git repository status' },

        // Hooks (scan .claude/settings.json → hooks)
        { id: 'PreToolUse',    type: 'hook',    desc: 'Guard before tool execution' },
        { id: 'PostToolUse',   type: 'hook',    desc: 'Validate after tool execution' }
    ],

    // ── Edges ──
    // Relationships between components.
    edges: [
        // Commands spawn agents (from allowed-tools: Task(agent))
        { from: 'wf-implement',  to: 'builder',     type: 'spawns' },
        { from: 'wf-implement',  to: 'security',    type: 'spawns' },
        { from: 'wf-verify',     to: 'reviewer',    type: 'spawns' },

        // Agents invoke skills
        { from: 'builder',       to: 'jira_read',   type: 'invokes' },
        { from: 'builder',       to: 'git_status',  type: 'invokes' },

        // Hooks fire on events
        { from: 'PreToolUse',    to: 'wf-start',    type: 'fires-on' },
        { from: 'PreToolUse',    to: 'wf-implement', type: 'fires-on' },
        { from: 'PostToolUse',   to: 'wf-implement', type: 'fires-on' },
        { from: 'PostToolUse',   to: 'wf-test',     type: 'fires-on' },
        { from: 'PostToolUse',   to: 'wf-verify',   type: 'fires-on' }
    ],

    // ── Groups ──
    // Cluster related nodes with labeled translucent panels.
    // nodeIds must reference actual node ids from the nodes array.
    groups: [
        {
            name: 'INCEPTION',
            nodeIds: ['wf-start', 'wf-clarify'],
            color: { dark: '#58a6ff', light: '#0969da' }
        },
        {
            name: 'CONSTRUCTION',
            nodeIds: ['wf-implement', 'wf-test', 'wf-verify'],
            color: { dark: '#bc8cff', light: '#7c3aed' }
        },
        {
            name: 'BUILDERS',
            nodeIds: ['builder', 'security'],
            color: { dark: '#bc8cff', light: '#7c3aed' }
        },
        {
            name: 'REVIEWERS',
            nodeIds: ['reviewer'],
            color: { dark: '#3fb950', light: '#1a7f37' }
        },
        {
            name: 'INPUT SKILLS',
            nodeIds: ['jira_read', 'git_status'],
            color: { dark: '#3fb950', light: '#1a7f37' }
        }
    ],

    // ── Bands ──
    // Horizontal rows from top to bottom. Each band renders one or more node types.
    // layerBreak: true adds extra vertical space above (visual layer separator).
    bands: [
        { label: 'COMMANDS', types: ['command'] },
        { label: 'AGENTS',   types: ['agent'],  layerBreak: true },
        { label: 'SKILLS',   types: ['skill'],  layerBreak: true },
        { label: 'HOOKS',    types: ['hook'],    layerBreak: true }
    ],

    // ── Icons (optional) ──
    // Map node ids (or shared keys) to SVG data URIs.
    // If omitted, nodes show text labels only (which is perfectly fine).
    icons: {}
};
