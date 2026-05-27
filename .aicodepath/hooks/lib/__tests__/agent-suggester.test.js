/**
 * Agent Suggester Tests
 */

const {
  DOMAIN_MAPPING,
  VIOLATION_TYPE_MAPPING
} = require('../agent-suggester');

describe('Agent Suggester', () => {
  describe('DOMAIN_MAPPING', () => {
    test('should map authentication to security agents', () => {
      expect(DOMAIN_MAPPING.authentication).toContain('security-engineer');
      expect(DOMAIN_MAPPING.jwt).toContain('security-engineer');
      expect(DOMAIN_MAPPING.password).toContain('security-engineer');
    });

    test('should map database to database architect', () => {
      expect(DOMAIN_MAPPING.database).toContain('database-architect');
      expect(DOMAIN_MAPPING.migration).toContain('database-architect');
      expect(DOMAIN_MAPPING.query).toContain('database-architect');
    });

    test('should map API to backend architect', () => {
      expect(DOMAIN_MAPPING.api).toContain('backend-architect');
      expect(DOMAIN_MAPPING.endpoint).toContain('backend-architect');
      expect(DOMAIN_MAPPING.rest).toContain('backend-architect');
    });

    test('should map testing to test engineer', () => {
      expect(DOMAIN_MAPPING.test).toContain('test-engineer');
      expect(DOMAIN_MAPPING.unittest).toContain('test-engineer');
      expect(DOMAIN_MAPPING.coverage).toContain('test-engineer');
    });

    test('should map performance to performance engineer', () => {
      expect(DOMAIN_MAPPING.performance).toContain('performance-engineer');
      expect(DOMAIN_MAPPING.optimization).toContain('performance-engineer');
      expect(DOMAIN_MAPPING.cache).toContain('performance-engineer');
    });

    test('should map refactoring to refactoring expert', () => {
      expect(DOMAIN_MAPPING.refactor).toContain('refactoring-expert');
      expect(DOMAIN_MAPPING.duplication).toContain('refactoring-expert');
      expect(DOMAIN_MAPPING.complexity).toContain('refactoring-expert');
    });

    test('should map DevOps to devops architect', () => {
      expect(DOMAIN_MAPPING.deployment).toContain('devops-architect');
      expect(DOMAIN_MAPPING.docker).toContain('devops-architect');
      expect(DOMAIN_MAPPING.kubernetes).toContain('devops-architect');
    });

    test('should map documentation to technical writer', () => {
      expect(DOMAIN_MAPPING.documentation).toContain('technical-writer');
      expect(DOMAIN_MAPPING.readme).toContain('technical-writer');
    });

    test('should have multiple agents for some domains', () => {
      // Authentication can be handled by security-engineer or backend-architect
      expect(DOMAIN_MAPPING.authentication.length).toBeGreaterThan(1);

      // Cache can be handled by performance-engineer or backend-architect
      expect(DOMAIN_MAPPING.cache.length).toBeGreaterThan(1);
    });

    test('should map all security keywords to security agents', () => {
      const securityKeywords = [
        'security', 'encryption', 'csrf', 'cors', 'xss', 'sanitize'
      ];

      securityKeywords.forEach(keyword => {
        expect(DOMAIN_MAPPING[keyword]).toBeDefined();
        expect(DOMAIN_MAPPING[keyword].some(agent =>
          agent.includes('security')
        )).toBe(true);
      });
    });
  });

  describe('VIOLATION_TYPE_MAPPING', () => {
    test('should map guideline violations to code reviewer', () => {
      expect(VIOLATION_TYPE_MAPPING.guideline).toContain('code-reviewer');
    });

    test('should map architecture violations to architects', () => {
      expect(VIOLATION_TYPE_MAPPING.architecture).toContain('architect');
      expect(VIOLATION_TYPE_MAPPING.architecture).toContain('backend-architect');
    });

    test('should map security violations to security engineers', () => {
      expect(VIOLATION_TYPE_MAPPING.security).toContain('security-engineer');
    });

    test('should map duplication to refactoring expert', () => {
      expect(VIOLATION_TYPE_MAPPING.duplication).toContain('refactoring-expert');
    });

    test('should map testing violations to test engineer', () => {
      expect(VIOLATION_TYPE_MAPPING.testing).toContain('test-engineer');
    });

    test('should map performance to performance engineer', () => {
      expect(VIOLATION_TYPE_MAPPING.performance).toContain('performance-engineer');
    });

    test('should map API design to backend architect', () => {
      expect(VIOLATION_TYPE_MAPPING['api-design']).toContain('backend-architect');
    });

    test('should map data modeling to database architect', () => {
      expect(VIOLATION_TYPE_MAPPING['data-modeling']).toContain('database-architect');
    });

    test('should map DevOps to devops architect', () => {
      expect(VIOLATION_TYPE_MAPPING.devops).toContain('devops-architect');
    });

    test('should have at least one agent per violation type', () => {
      Object.values(VIOLATION_TYPE_MAPPING).forEach(agents => {
        expect(Array.isArray(agents)).toBe(true);
        expect(agents.length).toBeGreaterThan(0);
      });
    });
  });

  describe('mapping consistency', () => {
    test('agent names should be lowercase with hyphens', () => {
      const allAgents = new Set();

      Object.values(DOMAIN_MAPPING).forEach(agents => {
        agents.forEach(agent => allAgents.add(agent));
      });

      Object.values(VIOLATION_TYPE_MAPPING).forEach(agents => {
        agents.forEach(agent => allAgents.add(agent));
      });

      allAgents.forEach(agent => {
        expect(agent).toMatch(/^[a-z]+(-[a-z]+)*$/);
      });
    });

    test('should not have duplicate agents in arrays', () => {
      const checkNoDuplicates = (agents) => {
        const unique = new Set(agents);
        expect(agents.length).toBe(unique.size);
      };

      Object.values(DOMAIN_MAPPING).forEach(checkNoDuplicates);
      Object.values(VIOLATION_TYPE_MAPPING).forEach(checkNoDuplicates);
    });

    test('should have consistent agent names between mappings', () => {
      const domainAgents = new Set();
      const violationAgents = new Set();

      Object.values(DOMAIN_MAPPING).forEach(agents => {
        agents.forEach(agent => domainAgents.add(agent));
      });

      Object.values(VIOLATION_TYPE_MAPPING).forEach(agents => {
        agents.forEach(agent => violationAgents.add(agent));
      });

      // All violation agents should also exist in domain mapping
      violationAgents.forEach(agent => {
        expect(domainAgents.has(agent)).toBe(true);
      });
    });
  });

  describe('coverage checks', () => {
    test('should cover common development domains', () => {
      const expectedDomains = [
        'authentication', 'database', 'api', 'test',
        'security', 'performance', 'deployment'
      ];

      expectedDomains.forEach(domain => {
        expect(DOMAIN_MAPPING[domain]).toBeDefined();
      });
    });

    test('should cover common violation types', () => {
      const expectedTypes = [
        'guideline', 'architecture', 'security',
        'duplication', 'testing', 'performance'
      ];

      expectedTypes.forEach(type => {
        expect(VIOLATION_TYPE_MAPPING[type]).toBeDefined();
      });
    });
  });
});
