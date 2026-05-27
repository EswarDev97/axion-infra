'use strict';

const {
  DOMAIN_MAPPING,
  VIOLATION_TYPE_MAPPING,
  CATEGORY_NORMALIZATION,
  formatSuggestions,
} = require('../lib/agent-suggester');

// ---------------------------------------------------------------------------
// DOMAIN_MAPPING structure
// ---------------------------------------------------------------------------

describe('DOMAIN_MAPPING', () => {
  it('is a non-empty object', () => {
    expect(typeof DOMAIN_MAPPING).toBe('object');
    expect(Object.keys(DOMAIN_MAPPING).length).toBeGreaterThan(50);
  });

  it('every value is a non-empty array of strings', () => {
    for (const [key, agents] of Object.entries(DOMAIN_MAPPING)) {
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
      agents.forEach(a => expect(typeof a).toBe('string'));
    }
  });

  it('security keywords map to security-engineer', () => {
    expect(DOMAIN_MAPPING['security']).toContain('security-engineer');
    expect(DOMAIN_MAPPING['authentication']).toContain('security-engineer');
    expect(DOMAIN_MAPPING['encryption']).toContain('security-engineer');
  });

  it('database keywords map to database-architect', () => {
    expect(DOMAIN_MAPPING['database']).toContain('database-architect');
    expect(DOMAIN_MAPPING['migration']).toContain('database-architect');
  });

  it('api keywords map to api-designer', () => {
    expect(DOMAIN_MAPPING['api']).toContain('api-designer');
    expect(DOMAIN_MAPPING['endpoint']).toContain('api-designer');
  });

  it('test keywords map to test-engineer', () => {
    expect(DOMAIN_MAPPING['test']).toContain('test-engineer');
  });

  it('performance keywords map to performance-engineer', () => {
    expect(DOMAIN_MAPPING['performance']).toContain('performance-engineer');
    expect(DOMAIN_MAPPING['latency']).toContain('performance-engineer');
  });

  it('ml/ai keywords map to ml-engineer or data-scientist', () => {
    const pytorch = DOMAIN_MAPPING['pytorch'] || [];
    expect(pytorch.some(a => ['ml-engineer', 'data-scientist'].includes(a))).toBe(true);
  });

  it('compliance keywords map to compliance-auditor', () => {
    expect(DOMAIN_MAPPING['gdpr']).toContain('compliance-auditor');
    expect(DOMAIN_MAPPING['hipaa']).toContain('compliance-auditor');
  });
});

// ---------------------------------------------------------------------------
// VIOLATION_TYPE_MAPPING structure
// ---------------------------------------------------------------------------

describe('VIOLATION_TYPE_MAPPING', () => {
  it('has at least 15 entries', () => {
    expect(Object.keys(VIOLATION_TYPE_MAPPING).length).toBeGreaterThanOrEqual(15);
  });

  it('security maps to security-engineer', () => {
    expect(VIOLATION_TYPE_MAPPING['security']).toContain('security-engineer');
  });

  it('testing maps to test-engineer', () => {
    expect(VIOLATION_TYPE_MAPPING['testing']).toContain('test-engineer');
  });

  it('frontend maps to frontend-architect', () => {
    expect(VIOLATION_TYPE_MAPPING['frontend']).toContain('frontend-architect');
  });

  it('documentation maps to technical-writer', () => {
    expect(VIOLATION_TYPE_MAPPING['documentation']).toContain('technical-writer');
  });
});

// ---------------------------------------------------------------------------
// CATEGORY_NORMALIZATION
// ---------------------------------------------------------------------------

describe('CATEGORY_NORMALIZATION', () => {
  it('normalizes security categories to "security"', () => {
    expect(CATEGORY_NORMALIZATION['secrets']).toBe('security');
    expect(CATEGORY_NORMALIZATION['injection']).toBe('security');
    expect(CATEGORY_NORMALIZATION['authentication']).toBe('security');
  });

  it('normalizes naming to "guideline"', () => {
    expect(CATEGORY_NORMALIZATION['naming']).toBe('guideline');
  });

  it('normalizes testing categories to "testing"', () => {
    expect(CATEGORY_NORMALIZATION['assertions']).toBe('testing');
    expect(CATEGORY_NORMALIZATION['mocking']).toBe('testing');
  });

  it('normalizes database to "data-modeling"', () => {
    expect(CATEGORY_NORMALIZATION['database']).toBe('data-modeling');
  });

  it('normalizes docker to "devops"', () => {
    expect(CATEGORY_NORMALIZATION['docker']).toBe('devops');
  });
});

// ---------------------------------------------------------------------------
// formatSuggestions()
// ---------------------------------------------------------------------------

describe('formatSuggestions()', () => {
  it('returns "No agent suggestions available." when totalAgents is 0', () => {
    const result = formatSuggestions({ totalAgents: 0, suggestions: [] });
    expect(result).toContain('No agent suggestions available');
  });

  it('returns string containing agent name when suggestions exist', () => {
    const mockResult = {
      totalAgents: 1,
      suggestions: [
        {
          agent: { name: 'security-engineer', category: 'security', description: 'Security expert' },
          sources: [{ type: 'violation', reason: 'SQL injection risk', severity: 'error' }],
          score: 15,
        },
      ],
    };
    const text = formatSuggestions(mockResult);
    expect(text).toContain('security-engineer');
    expect(text).toContain('1 agents recommended');
  });

  it('shows max 5 suggestions', () => {
    const suggestions = Array.from({ length: 8 }, (_, i) => ({
      agent: { name: `agent-${i}`, category: 'general', description: `Agent ${i}` },
      sources: [{ type: 'violation', reason: 'issue', severity: 'warning' }],
      score: 10 - i,
    }));
    const text = formatSuggestions({ totalAgents: 8, suggestions });
    // Should show agents 0-4 but not 5-7
    expect(text).toContain('agent-4');
    expect(text).not.toContain('agent-5');
  });

  it('shows "and N more" when sources exceed 3', () => {
    const sources = Array.from({ length: 5 }, (_, i) => ({
      type: 'violation',
      reason: `issue-${i}`,
      severity: 'warning',
    }));
    const mockResult = {
      totalAgents: 1,
      suggestions: [
        {
          agent: { name: 'code-reviewer', category: 'quality', description: 'Reviewer' },
          sources,
          score: 10,
        },
      ],
    };
    const text = formatSuggestions(mockResult);
    expect(text).toContain('and 2 more');
  });
});
