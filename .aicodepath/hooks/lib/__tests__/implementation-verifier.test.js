/**
 * Implementation Verifier Tests
 */

const {
  getPatterns,
  calculateConfidence,
  PATTERN_LIBRARY
} = require('../implementation-verifier');

describe('Implementation Verifier', () => {
  describe('getPatterns', () => {
    test('should extract JWT patterns', () => {
      const requirement = 'User can login with JWT token';
      const patterns = getPatterns(requirement);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.includes('jwt'))).toBe(true);
      expect(patterns.some(p => p.includes('token'))).toBe(true);
      expect(patterns.some(p => p.includes('login'))).toBe(true);
    });

    test('should extract database patterns', () => {
      const requirement = 'Create database migration for users table';
      const patterns = getPatterns(requirement);

      expect(patterns.some(p => p.includes('database') || p.includes('migration'))).toBe(true);
    });

    test('should extract authentication patterns', () => {
      const requirement = 'Password hashing using bcrypt';
      const patterns = getPatterns(requirement);

      expect(patterns.some(p => p.includes('password') || p.includes('hash'))).toBe(true);
    });

    test('should extract testing patterns', () => {
      const requirement = 'Unit tests with mock data';
      const patterns = getPatterns(requirement);

      expect(patterns.some(p => p.includes('test') || p.includes('mock'))).toBe(true);
    });

    test('should extract security patterns', () => {
      const requirement = 'CSRF protection and XSS sanitization';
      const patterns = getPatterns(requirement);

      expect(patterns.some(p => p.includes('csrf'))).toBe(true);
      // Sanitize/sanitization may be split - check for partial match
      expect(patterns.some(p => p.includes('sanit'))).toBe(true);
    });

    test('should extract keywords as patterns', () => {
      const requirement = 'Custom authentication flow';
      const patterns = getPatterns(requirement);

      expect(patterns.some(p => p.includes('custom'))).toBe(true);
      expect(patterns.some(p => p.includes('authentication'))).toBe(true);
      expect(patterns.some(p => p.includes('flow'))).toBe(true);
    });

    test('should handle mixed case', () => {
      const requirement = 'JWT Token Authentication';
      const patterns = getPatterns(requirement);

      // Should still find patterns (case-insensitive matching)
      expect(patterns.length).toBeGreaterThan(0);
    });

    test('should remove duplicates', () => {
      const requirement = 'Login login LOGIN authentication';
      const patterns = getPatterns(requirement);

      const uniquePatterns = new Set(patterns);
      expect(patterns.length).toBe(uniquePatterns.size);
    });
  });

  describe('calculateConfidence', () => {
    test('should return 0 for no matches', () => {
      const matches = [];
      const patterns = ['pattern1', 'pattern2'];

      const confidence = calculateConfidence(matches, patterns);
      expect(confidence).toBe(0.0);
    });

    test('should increase confidence with more matches', () => {
      const matches1 = [
        { pattern: 'jwt', match: 'jwt.sign' }
      ];
      const matches5 = [
        { pattern: 'jwt', match: 'jwt.sign' },
        { pattern: 'jwt', match: 'jwt.verify' },
        { pattern: 'token', match: 'token' },
        { pattern: 'login', match: 'login()' },
        { pattern: 'auth', match: 'authenticate' }
      ];
      const patterns = ['jwt', 'token', 'login', 'auth'];

      const confidence1 = calculateConfidence(matches1, patterns);
      const confidence5 = calculateConfidence(matches5, patterns);

      expect(confidence5).toBeGreaterThan(confidence1);
    });

    test('should weight pattern coverage heavily', () => {
      const matchesAllPatterns = [
        { pattern: 'p1', match: 'm1' },
        { pattern: 'p2', match: 'm2' },
        { pattern: 'p3', match: 'm3' }
      ];
      const matchesOnePattern = [
        { pattern: 'p1', match: 'm1' },
        { pattern: 'p1', match: 'm2' },
        { pattern: 'p1', match: 'm3' }
      ];
      const patterns = ['p1', 'p2', 'p3'];

      const confAll = calculateConfidence(matchesAllPatterns, patterns);
      const confOne = calculateConfidence(matchesOnePattern, patterns);

      // All patterns matched should score higher than one pattern matched multiple times
      expect(confAll).toBeGreaterThan(confOne);
    });

    test('should return value between 0 and 1', () => {
      const matches = [
        { pattern: 'jwt', match: 'jwt.sign' },
        { pattern: 'token', match: 'token' }
      ];
      const patterns = ['jwt', 'token'];

      const confidence = calculateConfidence(matches, patterns);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    test('should cap at 1.0 for many matches', () => {
      const matches = Array(20).fill(null).map((_, i) => ({
        pattern: `p${i}`,
        match: `m${i}`
      }));
      const patterns = Array(20).fill(null).map((_, i) => `p${i}`);

      const confidence = calculateConfidence(matches, patterns);

      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('PATTERN_LIBRARY', () => {
    test('should contain authentication patterns', () => {
      expect(PATTERN_LIBRARY.jwt).toBeDefined();
      expect(PATTERN_LIBRARY.login).toBeDefined();
      expect(PATTERN_LIBRARY.password).toBeDefined();
      expect(PATTERN_LIBRARY.hash).toBeDefined();
    });

    test('should contain database patterns', () => {
      expect(PATTERN_LIBRARY.database).toBeDefined();
      expect(PATTERN_LIBRARY.migration).toBeDefined();
      expect(PATTERN_LIBRARY.query).toBeDefined();
    });

    test('should contain API patterns', () => {
      expect(PATTERN_LIBRARY.endpoint).toBeDefined();
      expect(PATTERN_LIBRARY.rest).toBeDefined();
      expect(PATTERN_LIBRARY.validation).toBeDefined();
    });

    test('should contain testing patterns', () => {
      expect(PATTERN_LIBRARY.test).toBeDefined();
      expect(PATTERN_LIBRARY.unittest).toBeDefined();
      expect(PATTERN_LIBRARY.mock).toBeDefined();
    });

    test('should contain security patterns', () => {
      expect(PATTERN_LIBRARY.encryption).toBeDefined();
      expect(PATTERN_LIBRARY.csrf).toBeDefined();
      expect(PATTERN_LIBRARY.cors).toBeDefined();
      expect(PATTERN_LIBRARY.sanitize).toBeDefined();
    });

    test('should contain performance patterns', () => {
      expect(PATTERN_LIBRARY.cache).toBeDefined();
      expect(PATTERN_LIBRARY.async).toBeDefined();
    });

    test('should have array values', () => {
      Object.values(PATTERN_LIBRARY).forEach(patterns => {
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });
    });

    test('should have string pattern values', () => {
      Object.values(PATTERN_LIBRARY).forEach(patterns => {
        patterns.forEach(pattern => {
          expect(typeof pattern).toBe('string');
          expect(pattern.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
