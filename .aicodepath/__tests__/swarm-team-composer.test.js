/**
 * Test: Swarm Team Composer
 *
 * Tests team composition logic, phase defaults, role assignment,
 * deduplication, and spawn prompt generation.
 */

const path = require('path');

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}\u2713${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}\u2717${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Got: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value`);
  }
}

function assertIncludes(arr, value, message = '') {
  if (!arr.includes(value)) {
    throw new Error(`${message}\n  Expected array to include: ${value}\n  Got: [${arr.join(', ')}]`);
  }
}

// ============================================================================
// Mock AgentRegistry
// ============================================================================

function createMockRegistry() {
  const agents = new Map();

  const agentDefs = [
    { name: 'aicodepath-architect', category: 'Architecture', capabilities: ['architecture', 'design', 'scalability'], triggers: ['design', 'system'], keywords: ['architect', 'design'], priority: 'high', description: 'High-level technical direction' },
    { name: 'aicodepath-backend-architect', category: 'Architecture', capabilities: ['backend', 'api', 'services'], triggers: ['backend', 'server'], keywords: ['backend', 'api'], priority: 'high', description: 'Backend system design' },
    { name: 'aicodepath-frontend-architect', category: 'Architecture', capabilities: ['frontend', 'ui', 'components'], triggers: ['frontend', 'react'], keywords: ['frontend', 'ui'], priority: 'high', description: 'Frontend architecture' },
    { name: 'aicodepath-api-designer', category: 'Design', capabilities: ['api', 'rest', 'graphql'], triggers: ['api', 'endpoint'], keywords: ['api', 'rest'], priority: 'medium', description: 'API design' },
    { name: 'aicodepath-database-architect', category: 'Data', capabilities: ['database', 'schema', 'sql'], triggers: ['database', 'schema'], keywords: ['database', 'sql'], priority: 'medium', description: 'Database architecture' },
    { name: 'aicodepath-security-engineer', category: 'Security', capabilities: ['security', 'auth', 'encryption'], triggers: ['security', 'vulnerability'], keywords: ['security', 'auth'], priority: 'high', description: 'Security engineering' },
    { name: 'aicodepath-test-engineer', category: 'Quality', capabilities: ['testing', 'tdd', 'coverage'], triggers: ['test', 'coverage'], keywords: ['test', 'testing'], priority: 'medium', description: 'Test engineering' },
    { name: 'aicodepath-devops-architect', category: 'Operations', capabilities: ['devops', 'ci/cd', 'deployment'], triggers: ['deploy', 'pipeline'], keywords: ['devops', 'ci'], priority: 'medium', description: 'DevOps architecture' },
    { name: 'aicodepath-sre-engineer', category: 'Operations', capabilities: ['reliability', 'monitoring', 'sre'], triggers: ['reliability', 'monitoring'], keywords: ['sre', 'reliability'], priority: 'medium', description: 'Site reliability' },
    { name: 'aicodepath-performance-engineer', category: 'Operations', capabilities: ['performance', 'optimization', 'profiling'], triggers: ['performance', 'optimize'], keywords: ['performance', 'latency'], priority: 'medium', description: 'Performance engineering' },
  ];

  for (const a of agentDefs) {
    agents.set(a.name.toLowerCase(), a);
  }

  return {
    agents,
    findByName(name) {
      return agents.get(name.toLowerCase()) || null;
    },
    findByCategory(cat) {
      return Array.from(agents.values()).filter(a => a.category === cat);
    },
    suggestAgent(context) {
      const text = `${context.task || ''} ${context.filePath || ''} ${context.violationType || ''}`.toLowerCase();
      const scored = [];
      for (const agent of agents.values()) {
        let score = 0;
        agent.capabilities.forEach(cap => {
          if (text.includes(cap.toLowerCase())) score += 10;
        });
        agent.triggers.forEach(trigger => {
          if (text.includes(trigger.toLowerCase())) score += 8;
        });
        if (score > 0) scored.push({ agent, score });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.map(s => s.agent).slice(0, 5);
    },
    getAll() {
      return Array.from(agents.values());
    },
  };
}

// ============================================================================
// Load module under test
// ============================================================================

const { SwarmTeamComposer, PHASE_DEFAULTS, VALID_PATTERNS, MAX_TEAM_SIZE } = require('../lib/swarm-team-composer');

// ============================================================================
// Tests
// ============================================================================

console.log('\n=== Swarm Team Composer Tests ===\n');

// --- Constants ---

test('MAX_TEAM_SIZE is 5', () => {
  assertEqual(MAX_TEAM_SIZE, 5);
});

test('VALID_PATTERNS contains all 4 patterns', () => {
  assertEqual(VALID_PATTERNS.length, 4);
  assertIncludes(VALID_PATTERNS, 'parallel');
  assertIncludes(VALID_PATTERNS, 'pipeline');
  assertIncludes(VALID_PATTERNS, 'swarm');
  assertIncludes(VALID_PATTERNS, 'review');
});

test('PHASE_DEFAULTS has entries for all 4 phases', () => {
  assertTrue(PHASE_DEFAULTS['PRE-FLIGHT'] !== undefined, 'Missing PRE-FLIGHT');
  assertTrue(PHASE_DEFAULTS['INCEPTION'] !== undefined, 'Missing INCEPTION');
  assertTrue(PHASE_DEFAULTS['CONSTRUCTION'] !== undefined, 'Missing CONSTRUCTION');
  assertTrue(PHASE_DEFAULTS['OPERATIONS'] !== undefined, 'Missing OPERATIONS');
});

// --- Phase Default Teams ---

test('PRE-FLIGHT defaults to review pattern with 2 agents', () => {
  const defaults = PHASE_DEFAULTS['PRE-FLIGHT'];
  assertEqual(defaults.pattern, 'review');
  assertEqual(defaults.agents.length, 2);
  assertIncludes(defaults.agents, 'aicodepath-architect');
  assertIncludes(defaults.agents, 'aicodepath-devops-architect');
});

test('INCEPTION defaults to pipeline pattern with 4 agents', () => {
  const defaults = PHASE_DEFAULTS['INCEPTION'];
  assertEqual(defaults.pattern, 'pipeline');
  assertEqual(defaults.agents.length, 4);
});

test('CONSTRUCTION defaults to parallel pattern with 5 agents', () => {
  const defaults = PHASE_DEFAULTS['CONSTRUCTION'];
  assertEqual(defaults.pattern, 'parallel');
  assertEqual(defaults.agents.length, 5);
});

test('OPERATIONS defaults to review pattern with 3 agents', () => {
  const defaults = PHASE_DEFAULTS['OPERATIONS'];
  assertEqual(defaults.pattern, 'review');
  assertEqual(defaults.agents.length, 3);
});

// --- Team Composition ---

test('composeTeam returns team with correct structure', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Build a REST API', { phase: 'CONSTRUCTION' });

  assertTrue(team.teamName !== undefined, 'Missing teamName');
  assertTrue(team.pattern !== undefined, 'Missing pattern');
  assertTrue(team.phase !== undefined, 'Missing phase');
  assertTrue(Array.isArray(team.members), 'members should be an array');
  assertTrue(team.members.length > 0, 'Should have at least one member');
  assertTrue(team.members.length <= MAX_TEAM_SIZE, 'Should not exceed MAX_TEAM_SIZE');
});

test('composeTeam uses phase default pattern', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Design API', { phase: 'INCEPTION' });

  assertEqual(team.pattern, 'pipeline');
});

test('composeTeam respects explicit pattern override', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Build feature', {
    phase: 'CONSTRUCTION',
    pattern: 'swarm',
  });

  assertEqual(team.pattern, 'swarm');
});

test('composeTeam respects maxSize option', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Build feature', {
    phase: 'CONSTRUCTION',
    maxSize: 3,
  });

  assertTrue(team.members.length <= 3, `Expected <= 3 members, got ${team.members.length}`);
});

test('composeTeam enforces MAX_TEAM_SIZE even if maxSize is higher', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Build feature', {
    phase: 'CONSTRUCTION',
    maxSize: 10,
  });

  assertTrue(team.members.length <= MAX_TEAM_SIZE, `Expected <= ${MAX_TEAM_SIZE} members, got ${team.members.length}`);
});

test('composeTeam includes required agents', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Build feature', {
    phase: 'PRE-FLIGHT',
    requiredAgents: ['aicodepath-security-engineer'],
  });

  const names = team.members.map(m => m.agentName);
  assertIncludes(names, 'aicodepath-security-engineer');
});

test('composeTeam excludes specified agents', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Build feature', {
    phase: 'CONSTRUCTION',
    excludeAgents: ['aicodepath-frontend-architect'],
  });

  const names = team.members.map(m => m.agentName);
  assertTrue(!names.includes('aicodepath-frontend-architect'), 'Should exclude frontend-architect');
});

test('composeTeam deduplicates agents', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Design database schema', { phase: 'INCEPTION' });

  const names = team.members.map(m => m.agentName.toLowerCase());
  const uniqueNames = new Set(names);
  assertEqual(names.length, uniqueNames.size, 'Should have no duplicate agents');
});

// --- Role Assignment ---

test('first member gets lead role for non-review patterns', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Build feature', { phase: 'CONSTRUCTION' });

  assertEqual(team.members[0].role, 'lead');
});

test('first member gets reviewer role for review pattern', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Audit system', {
    phase: 'PRE-FLIGHT',
    pattern: 'review',
  });

  assertEqual(team.members[0].role, 'reviewer');
});

test('last member gets implementer role for review pattern', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Audit system', {
    phase: 'OPERATIONS',
    pattern: 'review',
  });

  assertTrue(team.members.length >= 2, 'Need at least 2 members');
  assertEqual(team.members[team.members.length - 1].role, 'implementer');
});

test('middle members get specialist role', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Build feature', { phase: 'CONSTRUCTION' });

  if (team.members.length > 2) {
    assertEqual(team.members[1].role, 'specialist');
  }
});

// --- getPhaseDefaultTeam ---

test('getPhaseDefaultTeam returns defaults for known phase', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const defaults = composer.getPhaseDefaultTeam('CONSTRUCTION');

  assertTrue(defaults !== null, 'Should return defaults');
  assertEqual(defaults.pattern, 'parallel');
  assertTrue(defaults.agents.length === 5);
});

test('getPhaseDefaultTeam returns null for unknown phase', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const defaults = composer.getPhaseDefaultTeam('NONEXISTENT');

  assertTrue(defaults === null, 'Should return null for unknown phase');
});

test('getPhaseDefaultTeam is case-insensitive', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const defaults = composer.getPhaseDefaultTeam('construction');

  assertTrue(defaults !== null, 'Should handle lowercase');
  assertEqual(defaults.pattern, 'parallel');
});

// --- buildSpawnPrompt ---

test('buildSpawnPrompt includes agent name and team context', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const agent = registry.findByName('aicodepath-architect');
  const prompt = composer.buildSpawnPrompt(agent, {
    teamName: 'test-team',
    pattern: 'parallel',
    role: 'lead',
    taskScope: 'Design the API layer',
  });

  assertTrue(prompt.includes('aicodepath-architect'), 'Should include agent name');
  assertTrue(prompt.includes('test-team'), 'Should include team name');
  assertTrue(prompt.includes('lead'), 'Should include role');
  assertTrue(prompt.includes('parallel'), 'Should include pattern');
  assertTrue(prompt.includes('Design the API layer'), 'Should include task scope');
});

test('buildSpawnPrompt adds pipeline-specific rules', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const agent = registry.findByName('aicodepath-api-designer');
  const prompt = composer.buildSpawnPrompt(agent, {
    teamName: 'test-team',
    pattern: 'pipeline',
    role: 'specialist',
  });

  assertTrue(prompt.includes('upstream'), 'Pipeline prompt should mention upstream');
  assertTrue(prompt.includes('downstream'), 'Pipeline prompt should mention downstream');
});

test('buildSpawnPrompt adds parallel-specific rules', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const agent = registry.findByName('aicodepath-backend-architect');
  const prompt = composer.buildSpawnPrompt(agent, {
    teamName: 'test-team',
    pattern: 'parallel',
    role: 'specialist',
  });

  assertTrue(prompt.includes('independently'), 'Parallel prompt should mention independent work');
});

test('buildSpawnPrompt adds review-specific rules', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const agent = registry.findByName('aicodepath-sre-engineer');
  const prompt = composer.buildSpawnPrompt(agent, {
    teamName: 'test-team',
    pattern: 'review',
    role: 'reviewer',
  });

  assertTrue(prompt.includes('Research'), 'Review prompt should mention research phase');
  assertTrue(prompt.includes('Implementation'), 'Review prompt should mention implementation phase');
});

// --- scoreAgentsForTask ---

test('scoreAgentsForTask returns agents matching task', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const scored = composer.scoreAgentsForTask('design database schema');

  assertTrue(scored.length > 0, 'Should find matching agents');
  const names = scored.map(s => s.agentName);
  assertIncludes(names, 'aicodepath-database-architect');
});

test('scoreAgentsForTask filters to available agents', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const scored = composer.scoreAgentsForTask('design database schema', [
    'aicodepath-database-architect',
    'aicodepath-architect',
  ]);

  for (const s of scored) {
    assertTrue(
      ['aicodepath-database-architect', 'aicodepath-architect'].includes(s.agentName),
      `Unexpected agent: ${s.agentName}`
    );
  }
});

// --- Session state detection ---

test('composeTeam defaults to CONSTRUCTION when no session state', () => {
  const registry = createMockRegistry();
  const composer = new SwarmTeamComposer(registry);
  const team = composer.composeTeam('Build something');

  // Without explicit phase and no session manager, should default to CONSTRUCTION
  assertEqual(team.pattern, 'parallel');
});

test('composeTeam uses session state phase when available', () => {
  const registry = createMockRegistry();
  const mockSession = {
    get: (key) => key === 'current_phase' ? 'INCEPTION' : null,
  };
  const composer = new SwarmTeamComposer(registry, mockSession);
  const team = composer.composeTeam('Design something');

  assertEqual(team.pattern, 'pipeline');
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
process.exit(failed > 0 ? 1 : 0);
