/**
 * Unit tests for AgentLoader
 *
 * Tests:
 * - Load all agents from directory
 * - Parse YAML frontmatter correctly
 * - Parse markdown body (guidelines)
 * - Cache agents for performance
 * - Handle missing agents gracefully
 * - Generate keywords for search
 *
 * @module lib/__tests__/agent-loader.test.js
 */

const AgentLoader = require('../agent-loader');
const fs = require('fs').promises;
const path = require('path');

describe('AgentLoader', () => {
  let loader;

  beforeEach(() => {
    // AgentLoader constructor auto-detects agents directory via pathResolver
    // when no argument is passed. Passing null here lets it resolve correctly
    // whether tests run from project root, .aicodepath/, or worktree.
    loader = new AgentLoader(null);
  });

  afterEach(() => {
    loader.clearCache();
  });

  describe('loadAll', () => {
    it('should load all agent markdown files', async () => {
      const agents = await loader.loadAll();

      expect(agents).toBeDefined();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
    });

    it('should load 12 core agents in v2.0', async () => {
      const agents = await loader.loadAll();

      // v2.0 should have exactly 12 agents
      expect(agents.length).toBe(12);

      const agentNames = agents.map(a => a.name);
      expect(agentNames).toContain('architect');
      expect(agentNames).toContain('qa');
      expect(agentNames).toContain('security');
      expect(agentNames).toContain('backend-architect');
      expect(agentNames).toContain('test-engineer');
      expect(agentNames).toContain('code-reviewer');
      expect(agentNames).toContain('database-architect');
      expect(agentNames).toContain('devops-architect');
      expect(agentNames).toContain('performance-engineer');
      expect(agentNames).toContain('security-engineer');
      expect(agentNames).toContain('refactoring-expert');
      expect(agentNames).toContain('technical-writer');
    });

    it('should load agents in less than 50ms for 12 agents', async () => {
      const startTime = Date.now();
      await loader.loadAll();
      const loadTime = Date.now() - startTime;

      // Performance requirement: <10ms for 30 agents, <50ms for 12 is generous
      expect(loadTime).toBeLessThan(50);
    });

    it('should throw error if directory does not exist', async () => {
      const badLoader = new AgentLoader('/nonexistent/path');

      await expect(badLoader.loadAll()).rejects.toThrow('Agent directory not found');
    });
  });

  describe('loadAgent', () => {
    it('should load a single agent by name', async () => {
      const agent = await loader.loadAgent('architect');

      expect(agent).toBeDefined();
      expect(agent.name).toBe('architect');
      expect(agent.category).toBe('Architects');
      expect(agent.guidelines).toBeTruthy();
    });

    it('should parse YAML frontmatter correctly', async () => {
      const agent = await loader.loadAgent('backend-architect');

      expect(agent.name).toBe('backend-architect');
      expect(agent.category).toBe('Architects');
      expect(agent.priority).toBe('high');
      expect(agent.context_budget).toBe(15000);
      expect(Array.isArray(agent.capabilities)).toBe(true);
      expect(Array.isArray(agent.triggers)).toBe(true);
    });

    it('should parse markdown body as guidelines', async () => {
      const agent = await loader.loadAgent('qa');

      expect(agent.guidelines).toBeTruthy();
      expect(agent.guidelines).toContain('QA Engineer');
      expect(agent.guidelines.length).toBeGreaterThan(100);
    });

    it('should generate keywords for search', async () => {
      const agent = await loader.loadAgent('security');

      expect(Array.isArray(agent.keywords)).toBe(true);
      expect(agent.keywords.length).toBeGreaterThan(0);

      // Keywords should include capabilities, triggers, name, category (lowercase)
      expect(agent.keywords).toContain('security');
      expect(agent.keywords).toContain('vulnerability');
      expect(agent.keywords).toContain('audit');
    });

    it('should cache loaded agents', async () => {
      // Load first time
      const agent1 = await loader.loadAgent('architect');

      // Load second time (should hit cache)
      const startTime = Date.now();
      const agent2 = await loader.loadAgent('architect');
      const loadTime = Date.now() - startTime;

      expect(agent1).toBe(agent2); // Same object reference
      expect(loadTime).toBeLessThan(5); // Cache hit should be nearly instant
    });

    it('should throw error for non-existent agent', async () => {
      await expect(loader.loadAgent('nonexistent-agent')).rejects.toThrow('Agent not found: nonexistent-agent');
    });
  });

  describe('reloadAgent', () => {
    it('should bust cache and reload agent', async () => {
      // Load agent (goes to cache)
      const agent1 = await loader.loadAgent('qa');

      // Reload agent (bust cache)
      const agent2 = await loader.reloadAgent('qa');

      // Should be different object references (fresh load)
      expect(agent1).not.toBe(agent2);
      // But same content
      expect(agent1.name).toBe(agent2.name);
      expect(agent1.guidelines).toBe(agent2.guidelines);
    });
  });

  describe('exists', () => {
    it('should return true for existing agent', async () => {
      const exists = await loader.exists('architect');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent agent', async () => {
      const exists = await loader.exists('nonexistent-agent');
      expect(exists).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      await loader.loadAgent('architect');
      await loader.loadAgent('qa');

      const stats = loader.getCacheStats();

      expect(stats.cached_agents).toBe(2);
      expect(stats.cache_keys).toContain('architect');
      expect(stats.cache_keys).toContain('qa');
    });

    it('should track last load time', async () => {
      await loader.loadAll();

      const stats = loader.getCacheStats();

      expect(stats.last_load_time_ms).toBeDefined();
      expect(typeof stats.last_load_time_ms).toBe('number');
      expect(stats.last_load_time_ms).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached agents', async () => {
      await loader.loadAgent('architect');
      await loader.loadAgent('qa');

      let stats = loader.getCacheStats();
      expect(stats.cached_agents).toBe(2);

      loader.clearCache();

      stats = loader.getCacheStats();
      expect(stats.cached_agents).toBe(0);
      expect(stats.cache_keys).toEqual([]);
    });
  });

  describe('parseAgent', () => {
    it('should handle agents without frontmatter (legacy)', () => {
      const content = '# Role: Test Agent\n\nThis is a test agent.';
      const agent = loader.parseAgent('test', content, '/test.md');

      expect(agent.name).toBe('test');
      expect(agent.category).toBe('Other'); // default
      expect(agent.guidelines).toBe(content.trim());
    });

    it('should extract name from markdown header if no frontmatter', () => {
      const content = '# Role: Custom Agent\n\nGuidelines here.';
      const agent = loader.parseAgent('test', content, '/test.md');

      expect(agent.name).toBe('Custom Agent');
    });

    it('should handle malformed YAML gracefully', () => {
      const content = '---\ninvalid: yaml: content:\n---\n# Guidelines\nTest';
      const agent = loader.parseAgent('test', content, '/test.md');

      // Should fall back to treating entire content as guidelines
      expect(agent.guidelines).toBeTruthy();
    });
  });
});
