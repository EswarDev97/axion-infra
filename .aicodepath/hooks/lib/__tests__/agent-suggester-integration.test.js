/**
 * Agent Suggester Integration Tests
 *
 * Validates the full suggestion pipeline end-to-end:
 * 1. All 24 agents resolve via AgentRegistry.findByName()
 * 2. Every DOMAIN_MAPPING entry resolves to at least one real agent
 * 3. Every VIOLATION_TYPE_MAPPING entry resolves to at least one real agent
 * 4. Key domain keywords produce correct agent suggestions
 * 5. Hook output uses valid Claude Code PostToolUse fields
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Mock logger
jest.mock('../../../lib/logger', () => ({
  debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

const AgentRegistry = require('../../../lib/agent-registry');
const AgentLoader = require('../../../lib/agent-loader');
const {
  suggestAgents,
  DOMAIN_MAPPING,
  VIOLATION_TYPE_MAPPING,
  CATEGORY_NORMALIZATION,
} = require('../agent-suggester');

// All 24 expected agent short-names (without aicodepath- prefix)
const ALL_AGENTS = [
  'api-designer',
  'architect',
  'backend-architect',
  'code-reviewer',
  'codebase-pattern-finder',
  'communication-coach',
  'compliance-auditor',
  'cost-optimizer',
  'data-scientist',
  'database-architect',
  'devops-architect',
  'frontend-architect',
  'ml-engineer',
  'mobile-architect',
  'performance-engineer',
  'qa',
  'refactoring-expert',
  'security-engineer',
  'sre-engineer',
  'swarm-lead',
  'technical-writer',
  'test-engineer',
  'ui-designer',
  'ux-designer',
];

let registry;

beforeAll(async () => {
  const loader = new AgentLoader();
  const agents = await loader.loadAll();
  registry = new AgentRegistry();
  registry.register(agents);
});

// ── 1. Agent Resolution ────────────────────────────────────────────────────

describe('Agent resolution — all 24 agents resolve via findByName()', () => {
  test.each(ALL_AGENTS)('resolves "%s" (with aicodepath- prefix fallback)', (agentName) => {
    const agent = registry.findByName(agentName);
    expect(agent).not.toBeNull();
    expect(agent.name).toBe(`aicodepath-${agentName}`);
  });
});

// ── 2. DOMAIN_MAPPING coverage ────────────────────────────────────────────

describe('DOMAIN_MAPPING — every keyword resolves to ≥1 real agent', () => {
  const entries = Object.entries(DOMAIN_MAPPING);

  test.each(entries)('keyword "%s" → all agent names resolve', (keyword, agentNames) => {
    agentNames.forEach(name => {
      const agent = registry.findByName(name);
      expect(agent).not.toBeNull();
      // Every agent name in the mapping must resolve to something registered
    });
  });

  test('no DOMAIN_MAPPING entry contains the bare "security" string (invalid agent name)', () => {
    Object.entries(DOMAIN_MAPPING).forEach(([keyword, agents]) => {
      expect(agents).not.toContain('security');
    });
  });

  test('all 24 agents (except swarm-lead) appear in at least one DOMAIN_MAPPING entry', () => {
    // swarm-lead is a coordinator, not a domain specialist — intentionally excluded
    const coordinators = new Set(['swarm-lead']);
    const allMappedAgents = new Set(Object.values(DOMAIN_MAPPING).flat());

    ALL_AGENTS.filter(a => !coordinators.has(a)).forEach(agentName => {
      expect(allMappedAgents).toContain(agentName);
    });
  });
});

// ── 3. VIOLATION_TYPE_MAPPING coverage ───────────────────────────────────

describe('VIOLATION_TYPE_MAPPING — every violation type resolves to ≥1 real agent', () => {
  const entries = Object.entries(VIOLATION_TYPE_MAPPING);

  test.each(entries)('violation "%s" → all agent names resolve', (type, agentNames) => {
    agentNames.forEach(name => {
      const agent = registry.findByName(name);
      expect(agent).not.toBeNull();
    });
  });

  test('no VIOLATION_TYPE_MAPPING entry contains the bare "security" string', () => {
    Object.entries(VIOLATION_TYPE_MAPPING).forEach(([type, agents]) => {
      expect(agents).not.toContain('security');
    });
  });
});

// ── 4. CATEGORY_NORMALIZATION — all values are valid VIOLATION_TYPE_MAPPING keys

describe('CATEGORY_NORMALIZATION — all values map to existing VIOLATION_TYPE_MAPPING keys', () => {
  test('every normalization target exists in VIOLATION_TYPE_MAPPING', () => {
    const validTargets = new Set(Object.keys(VIOLATION_TYPE_MAPPING));
    Object.entries(CATEGORY_NORMALIZATION).forEach(([raw, normalized]) => {
      expect(validTargets).toContain(normalized);
    });
  });
});

// ── 5. suggestAgents() end-to-end — key domain scenarios ─────────────────

describe('suggestAgents() — end-to-end domain scenarios', () => {
  test('security violation → security-engineer suggested', async () => {
    const result = await suggestAgents({
      violations: [{
        rule: 'sec-001',
        message: 'Missing CSRF protection on POST endpoint',
        severity: 'error',
        category: 'security',
        file: 'src/api/routes.ts',
        line: 10,
      }],
    });
    const names = result.suggestions.map(s => s.agent.name);
    expect(names.some(n => n.includes('security-engineer'))).toBe(true);
  });

  test('API design violation → api-designer suggested', async () => {
    const result = await suggestAgents({
      violations: [{
        rule: 'api-001',
        message: 'No versioning strategy for REST API endpoint',
        severity: 'warning',
        category: 'api-design',
        file: 'src/api/users.ts',
        line: 5,
      }],
    });
    const names = result.suggestions.map(s => s.agent.name);
    expect(names.some(n => n.includes('api-designer'))).toBe(true);
  });

  test('compliance violation → compliance-auditor suggested', async () => {
    const result = await suggestAgents({
      violations: [{
        rule: 'comp-001',
        message: 'User PII stored without GDPR consent mechanism',
        severity: 'error',
        category: 'compliance',
        file: 'src/users/repository.ts',
        line: 22,
      }],
    });
    const names = result.suggestions.map(s => s.agent.name);
    expect(names.some(n => n.includes('compliance-auditor'))).toBe(true);
  });

  test('reliability violation → sre-engineer suggested', async () => {
    const result = await suggestAgents({
      violations: [{
        rule: 'rel-001',
        message: 'No SLO defined for this service',
        severity: 'warning',
        category: 'reliability',
        file: 'src/service.ts',
        line: 1,
      }],
    });
    const names = result.suggestions.map(s => s.agent.name);
    expect(names.some(n => n.includes('sre-engineer'))).toBe(true);
  });

  test('cost violation → cost-optimizer suggested', async () => {
    const result = await suggestAgents({
      violations: [{
        rule: 'cost-001',
        message: 'Oversized instance type, rightsizing recommended',
        severity: 'warning',
        category: 'cost',
        file: 'terraform/main.tf',
        line: 14,
      }],
    });
    const names = result.suggestions.map(s => s.agent.name);
    expect(names.some(n => n.includes('cost-optimizer'))).toBe(true);
  });

  test('ML violation → ml-engineer suggested', async () => {
    const result = await suggestAgents({
      violations: [{
        rule: 'ml-001',
        message: 'No model versioning or MLOps pipeline configured',
        severity: 'warning',
        category: 'ml',
        file: 'src/ml/train.py',
        line: 1,
      }],
    });
    const names = result.suggestions.map(s => s.agent.name);
    expect(names.some(n => n.includes('ml-engineer'))).toBe(true);
  });

  test('requirement mentioning "openapi" → api-designer suggested', async () => {
    const result = await suggestAgents({
      incompleteCriteria: [{
        text: 'Define OpenAPI swagger spec for all endpoints',
        verified: false,
        confidence: 0.2,
      }],
    });
    const names = result.suggestions.map(s => s.agent.name);
    expect(names.some(n => n.includes('api-designer'))).toBe(true);
  });

  test('requirement mentioning "slo" → sre-engineer suggested', async () => {
    const result = await suggestAgents({
      incompleteCriteria: [{
        text: 'Define SLO and error budget for the payment service',
        verified: false,
        confidence: 0.1,
      }],
    });
    const names = result.suggestions.map(s => s.agent.name);
    expect(names.some(n => n.includes('sre-engineer'))).toBe(true);
  });

  test('returns unique agents (no duplicates)', async () => {
    const result = await suggestAgents({
      violations: [
        { rule: 'sec-001', message: 'XSS vulnerability', severity: 'error', category: 'security', file: 'a.ts', line: 1 },
        { rule: 'sec-002', message: 'SQL injection risk', severity: 'error', category: 'security', file: 'b.ts', line: 2 },
      ],
    });
    const names = result.suggestions.map(s => s.agent.name);
    expect(names.length).toBe(new Set(names).size);
  });

  test('empty input returns no suggestions without throwing', async () => {
    const result = await suggestAgents({ violations: [], incompleteCriteria: [] });
    expect(result.totalAgents).toBe(0);
    expect(result.suggestions).toEqual([]);
  });
});

// ── 6. Hook output format ─────────────────────────────────────────────────

describe('Hook output format — PostToolUse hooks use hookSpecificOutput.additionalContext', () => {
  const HOOKS_DIR = path.join(__dirname, '../..');
  const HOOK_FILES = [
    'construction-skill-suggester.js',
    'inception-skill-suggester.js',
    'maintenance-skill-suggester.js',
    'monorepo-skill-suggester.js',
  ];

  test.each(HOOK_FILES)('%s does not return bare "message" field', (hookFile) => {
    const content = fs.readFileSync(path.join(HOOKS_DIR, hookFile), 'utf-8');
    // Should NOT have `{ proceed: true, message,` pattern
    expect(content).not.toMatch(/return\s*\{[^}]*\bproceed\b[^}]*\bmessage\b[^}]*\}/s);
  });

  test.each(HOOK_FILES)('%s returns hookSpecificOutput.additionalContext when suggestions exist', (hookFile) => {
    const content = fs.readFileSync(path.join(HOOKS_DIR, hookFile), 'utf-8');
    expect(content).toContain('hookSpecificOutput');
    expect(content).toContain('additionalContext');
  });

  test('construction-skill-suggester stdin→stdout round trip produces valid output', () => {
    const hookPath = path.join(HOOKS_DIR, 'construction-skill-suggester.js');
    const input = JSON.stringify({
      tool_name: 'Write',
      tool_input: {
        file_path: 'src/api/design/system-design.md',
        content: 'functional design doc',
      },
    });

    let stdout;
    try {
      stdout = execSync(`echo '${input}' | node "${hookPath}"`, {
        timeout: 10000,
        encoding: 'utf-8',
      });
    } catch (e) {
      // Non-zero exit is still valid (warning/block) — capture stdout from error
      stdout = e.stdout || '';
    }

    // Must be valid JSON if non-empty
    if (stdout.trim()) {
      let parsed;
      expect(() => { parsed = JSON.parse(stdout.trim()); }).not.toThrow();
      // If hookSpecificOutput present, must have additionalContext
      if (parsed.hookSpecificOutput) {
        expect(parsed.hookSpecificOutput).toHaveProperty('additionalContext');
        expect(typeof parsed.hookSpecificOutput.additionalContext).toBe('string');
      }
      // Must NOT contain invalid fields
      expect(parsed).not.toHaveProperty('proceed');
      expect(parsed).not.toHaveProperty('message');
    }
  });
});
