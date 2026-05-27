'use strict';

const {
  allowDuplication,
  CONFIG,
  calculateSimilarity,
  extractFunctions,
  extractTableDefinitions,
  extractIndexes,
} = require('../duplication-checker');

// ---------------------------------------------------------------------------
// allowDuplication()
// ---------------------------------------------------------------------------

describe('allowDuplication()', () => {
  it('returns false for normal code', () => {
    expect(allowDuplication('function foo() { return 1; }')).toBe(false);
  });

  it('returns true for exact escape hatch comment', () => {
    expect(allowDuplication('// aicodepath: allow-duplication')).toBe(true);
  });

  it('returns true with extra spaces around colon', () => {
    expect(allowDuplication('// aicodepath:  allow-duplication')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(allowDuplication('// AICodePath: Allow-Duplication')).toBe(true);
  });

  it('returns true when comment is embedded in code', () => {
    const code = [
      'function foo() {',
      '  // aicodepath: allow-duplication',
      '  return duplicated();',
      '}',
    ].join('\n');
    expect(allowDuplication(code)).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(allowDuplication('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CONFIG structure
// ---------------------------------------------------------------------------

describe('CONFIG', () => {
  it('has exact threshold of 100', () => {
    expect(CONFIG.exactThreshold).toBe(100);
  });

  it('near threshold is between 50 and 100', () => {
    expect(CONFIG.nearThreshold).toBeGreaterThan(50);
    expect(CONFIG.nearThreshold).toBeLessThan(100);
  });

  it('passThreshold is less than reviewThreshold', () => {
    expect(CONFIG.passThreshold).toBeLessThan(CONFIG.reviewThreshold);
  });

  it('codeExtensions includes .ts, .js, .py', () => {
    expect(CONFIG.codeExtensions).toContain('.ts');
    expect(CONFIG.codeExtensions).toContain('.js');
    expect(CONFIG.codeExtensions).toContain('.py');
  });

  it('sqlExtensions includes .sql', () => {
    expect(CONFIG.sqlExtensions).toContain('.sql');
  });

  it('weights object has exact, near, structural keys', () => {
    expect(typeof CONFIG.weights.exact).toBe('number');
    expect(typeof CONFIG.weights.near).toBe('number');
    expect(typeof CONFIG.weights.structural).toBe('number');
  });

  it('exact weight is higher than near weight (exact duplication is worse)', () => {
    expect(CONFIG.weights.exact).toBeGreaterThanOrEqual(CONFIG.weights.near);
  });
});

// ---------------------------------------------------------------------------
// calculateSimilarity() — falls back to Jaccard when indexer unavailable
// ---------------------------------------------------------------------------

describe('calculateSimilarity()', () => {
  it('returns a number between 0 and 1', () => {
    const score = calculateSimilarity('hello world foo', 'hello world bar');
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('identical strings have score close to 1', () => {
    const text = 'function processUser(id) { return fetch(id); }';
    const score = calculateSimilarity(text, text);
    expect(score).toBeCloseTo(1, 1);
  });

  it('completely different strings have score close to 0', () => {
    const score = calculateSimilarity('alpha beta gamma', 'delta epsilon zeta');
    expect(score).toBeLessThan(0.3);
  });

  it('partial overlap is between 0 and 1', () => {
    const score = calculateSimilarity('a b c d', 'a b e f');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('handles empty strings without throwing', () => {
    expect(() => calculateSimilarity('', '')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// extractFunctions() / extractTableDefinitions() / extractIndexes()
// — all delegate to the indexer; when indexer unavailable they return [].
// ---------------------------------------------------------------------------

describe('extractFunctions()', () => {
  it('returns an array (empty or populated)', () => {
    const result = extractFunctions('function foo() {}', 'javascript');
    expect(Array.isArray(result)).toBe(true);
  });

  it('does not throw on unknown language', () => {
    expect(() => extractFunctions('some code', 'cobol')).not.toThrow();
  });
});

describe('extractTableDefinitions()', () => {
  it('returns an array', () => {
    const sql = 'CREATE TABLE users (id INT PRIMARY KEY, name TEXT);';
    expect(Array.isArray(extractTableDefinitions(sql))).toBe(true);
  });

  it('does not throw on empty SQL', () => {
    expect(() => extractTableDefinitions('')).not.toThrow();
  });
});

describe('extractIndexes()', () => {
  it('returns an array', () => {
    const sql = 'CREATE INDEX idx_users_name ON users(name);';
    expect(Array.isArray(extractIndexes(sql))).toBe(true);
  });

  it('does not throw on empty input', () => {
    expect(() => extractIndexes('')).not.toThrow();
  });
});
