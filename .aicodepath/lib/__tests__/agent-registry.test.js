/**
 * Unit tests for AgentRegistry
 *
 * Tests:
 * - Register agents and index by name/category/capability
 * - Fast lookup by name (O(1))
 * - Fast search by capability (O(k) where k = matching agents)
 * - Suggest agents based on context
 * - Fuzzy matching for keywords
 *
 * @module lib/__tests__/agent-registry.test.js
 */

const AgentRegistry = require('../agent-registry');
const AgentLoader = require('../agent-loader');

describe('AgentRegistry', () => {
  let registry;
  let sampleAgents;

  beforeEach(() => {
    registry = new AgentRegistry();

    // Create sample agents for testing
    sampleAgents = [
      {
        name: 'backend-architect',
        category: 'Architects',
        capabilities: ['API design', 'microservices', 'database selection'],
        triggers: ['backend', 'API', 'microservice'],
        priority: 'high',
        keywords: ['api design', 'microservices', 'database selection', 'backend', 'api', 'microservice', 'backend-architect', 'architects']
      },
      {
        name: 'database-architect',
        category: 'Architects',
        capabilities: ['database design', 'schema design', 'query optimization'],
        triggers: ['database', 'SQL', 'schema', 'query'],
        priority: 'high',
        keywords: ['database design', 'schema design', 'query optimization', 'database', 'sql', 'schema', 'query', 'database-architect', 'architects']
      },
      {
        name: 'security',
        category: 'Security',
        capabilities: ['security audit', 'OWASP compliance', 'vulnerability detection'],
        triggers: ['security', 'vulnerability', 'OWASP'],
        priority: 'critical',
        keywords: ['security audit', 'owasp compliance', 'vulnerability detection', 'security', 'vulnerability', 'owasp', 'security', 'security']
      }
    ];
  });

  describe('register', () => {
    it('should register multiple agents at once', () => {
      registry.register(sampleAgents);

      const all = registry.getAll();
      expect(all.length).toBe(3);
    });
  });

  describe('registerOne', () => {
    it('should register a single agent', () => {
      registry.registerOne(sampleAgents[0]);

      const agent = registry.findByName('backend-architect');
      expect(agent).toBeDefined();
      expect(agent.name).toBe('backend-architect');
    });

    it('should index agent by category', () => {
      registry.register(sampleAgents);

      const architects = registry.findByCategory('Architects');
      expect(architects.length).toBe(2);

      const security = registry.findByCategory('Security');
      expect(security.length).toBe(1);
    });

    it('should index agent by capabilities', () => {
      registry.register(sampleAgents);

      const apiAgents = registry.findByCapability('API design');
      expect(apiAgents.length).toBeGreaterThan(0);
      expect(apiAgents[0].name).toBe('backend-architect');
    });

    it('should index agent by keywords', () => {
      registry.register(sampleAgents);

      const results = registry.findByCapability('database');
      expect(results.length).toBeGreaterThan(0);

      const names = results.map(a => a.name);
      expect(names).toContain('database-architect');
      expect(names).toContain('backend-architect'); // Also has database selection capability
    });
  });

  describe('findByName', () => {
    beforeEach(() => {
      registry.register(sampleAgents);
    });

    it('should find agent by exact name', () => {
      const agent = registry.findByName('backend-architect');

      expect(agent).toBeDefined();
      expect(agent.name).toBe('backend-architect');
      expect(agent.category).toBe('Architects');
    });

    it('should be case-insensitive', () => {
      const agent1 = registry.findByName('Backend-Architect');
      const agent2 = registry.findByName('BACKEND-ARCHITECT');
      const agent3 = registry.findByName('backend-architect');

      expect(agent1).toBeDefined();
      expect(agent2).toBeDefined();
      expect(agent3).toBeDefined();

      expect(agent1.name).toBe(agent2.name);
      expect(agent2.name).toBe(agent3.name);
    });

    it('should return null for non-existent agent', () => {
      const agent = registry.findByName('nonexistent');

      expect(agent).toBeNull();
    });

    it('should be O(1) lookup performance', () => {
      // Load all real agents
      const loader = new AgentLoader();
      const agents = [];

      // Create 100 dummy agents for performance testing
      for (let i = 0; i < 100; i++) {
        agents.push({
          name: `agent-${i}`,
          category: 'Test',
          capabilities: ['test'],
          triggers: ['test'],
          priority: 'normal',
          keywords: ['test']
        });
      }

      registry.register(agents);

      // Lookup should be instant even with 100 agents
      const startTime = Date.now();
      registry.findByName('agent-50');
      const lookupTime = Date.now() - startTime;

      expect(lookupTime).toBeLessThan(5); // Should be <5ms
    });
  });

  describe('findByCategory', () => {
    beforeEach(() => {
      registry.register(sampleAgents);
    });

    it('should find all agents in a category', () => {
      const architects = registry.findByCategory('Architects');

      expect(architects.length).toBe(2);
      expect(architects[0].category).toBe('Architects');
      expect(architects[1].category).toBe('Architects');
    });

    it('should return empty array for non-existent category', () => {
      const agents = registry.findByCategory('Nonexistent');

      expect(agents).toEqual([]);
    });
  });

  describe('findByCapability', () => {
    beforeEach(() => {
      registry.register(sampleAgents);
    });

    it('should find agents by exact capability match', () => {
      const agents = registry.findByCapability('API design');

      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].name).toBe('backend-architect');
    });

    it('should find agents by partial keyword match', () => {
      const agents = registry.findByCapability('database');

      expect(agents.length).toBeGreaterThan(0);

      const names = agents.map(a => a.name);
      expect(names).toContain('database-architect');
    });

    it('should find agents by trigger match', () => {
      const agents = registry.findByCapability('OWASP');

      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].name).toBe('security');
    });

    it('should rank results by relevance (score)', () => {
      const agents = registry.findByCapability('database');

      // database-architect should rank higher than backend-architect
      // (exact capability vs partial match)
      expect(agents[0].name).toBe('database-architect');
    });

    it('should be case-insensitive', () => {
      const agents1 = registry.findByCapability('database');
      const agents2 = registry.findByCapability('DATABASE');
      const agents3 = registry.findByCapability('DataBase');

      expect(agents1.length).toBe(agents2.length);
      expect(agents2.length).toBe(agents3.length);
    });
  });

  describe('suggestAgent', () => {
    beforeEach(() => {
      registry.register(sampleAgents);
    });

    it('should suggest agents based on task description', () => {
      const suggestions = registry.suggestAgent({
        task: 'Design a RESTful API for user authentication'
      });

      expect(suggestions.length).toBeGreaterThan(0);

      const names = suggestions.map(a => a.name);
      expect(names).toContain('backend-architect'); // API keyword
    });

    it('should suggest agents based on file path', () => {
      const suggestions = registry.suggestAgent({
        filePath: 'src/controllers/auth.controller.ts'
      });

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should suggest agents based on violation type', () => {
      const suggestions = registry.suggestAgent({
        violationType: 'SQL injection vulnerability detected'
      });

      expect(suggestions.length).toBeGreaterThan(0);

      const names = suggestions.map(a => a.name);
      expect(names).toContain('security'); // Security keyword
    });

    it('should prioritize critical priority agents', () => {
      const suggestions = registry.suggestAgent({
        task: 'Security vulnerability in authentication'
      });

      // security agent has 'critical' priority, should rank higher
      expect(suggestions[0].name).toBe('security');
    });

    it('should return top 5 suggestions maximum', () => {
      // Add more agents
      for (let i = 0; i < 10; i++) {
        registry.registerOne({
          name: `agent-${i}`,
          category: 'Test',
          capabilities: ['test', 'security'],
          triggers: ['test', 'security'],
          priority: 'normal',
          keywords: ['test', 'security']
        });
      }

      const suggestions = registry.suggestAgent({
        task: 'security test'
      });

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty context gracefully', () => {
      const suggestions = registry.suggestAgent({});

      expect(Array.isArray(suggestions)).toBe(true);
      // May return empty or low-scoring suggestions
    });
  });

  describe('getAll', () => {
    it('should return all registered agents', () => {
      registry.register(sampleAgents);

      const all = registry.getAll();

      expect(all.length).toBe(3);
      expect(all[0]).toBeDefined();
      expect(all[1]).toBeDefined();
      expect(all[2]).toBeDefined();
    });

    it('should return empty array when no agents registered', () => {
      const all = registry.getAll();

      expect(all).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return registry statistics', () => {
      registry.register(sampleAgents);

      const stats = registry.getStats();

      expect(stats.total_agents).toBe(3);
      expect(stats.categories).toContain('Architects');
      expect(stats.categories).toContain('Security');
      expect(stats.capabilities_indexed).toBeGreaterThan(0);
      expect(stats.keywords_indexed).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all registered agents', () => {
      registry.register(sampleAgents);

      let stats = registry.getStats();
      expect(stats.total_agents).toBe(3);

      registry.clear();

      stats = registry.getStats();
      expect(stats.total_agents).toBe(0);
      expect(stats.categories).toEqual([]);
    });
  });
});
