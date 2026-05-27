#!/usr/bin/env node

/**
 * AgentLoader - Discovers and parses agent markdown files
 *
 * Loads agent definitions from .aicodepath/skills/roles/ with:
 * - YAML frontmatter parsing (metadata)
 * - Markdown body parsing (guidelines)
 * - In-memory caching for performance (<10ms for 30 agents)
 *
 * @module lib/agent-loader
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('yaml');
const pathResolver = require('./path-resolver');

class AgentLoader {
  /**
   * @param {string} agentsDir - Directory containing agent *.md files
   */
  constructor(agentsDir = null) {
    if (!agentsDir) {
      const aicodePathRoot = pathResolver.getAicodePathRoot();
      // Prefer new agents/ directory, fall back to legacy skills/roles/
      const newAgentsDir = path.join(aicodePathRoot, 'agents');
      const legacyAgentsDir = path.join(aicodePathRoot, 'skills', 'roles');
      agentsDir = require('fs').existsSync(newAgentsDir) ? newAgentsDir : legacyAgentsDir;
    }
    this.agentsDir = path.resolve(agentsDir);
    this.cache = new Map();
    this.lastLoadTime = null;
  }

  /**
   * Load all agents from the agents directory
   * @returns {Promise<Array>} Array of agent objects
   */
  async loadAll() {
    const startTime = Date.now();

    try {
      // Check if directory exists
      await fs.access(this.agentsDir);
    } catch (error) {
      throw new Error(`Agent directory not found: ${this.agentsDir}`);
    }

    // Find all .md files
    const files = await fs.readdir(this.agentsDir);
    const agentFiles = files.filter(f => f.endsWith('.md'));

    if (agentFiles.length === 0) {
      throw new Error(`No agent files found in ${this.agentsDir}`);
    }

    // Load all agents in parallel
    const agents = await Promise.all(
      agentFiles.map(file => this.loadAgent(path.basename(file, '.md')))
    );

    const loadTime = Date.now() - startTime;
    this.lastLoadTime = loadTime;

    // Performance check: should load 30 agents in <10ms
    if (agents.length >= 10 && loadTime > 50) {
      console.warn(`⚠️  Agent loading slower than expected: ${loadTime}ms for ${agents.length} agents`);
    }

    return agents.filter(a => a !== null);
  }

  /**
   * Load a single agent by name
   * @param {string} name - Agent name (without .md extension)
   * @returns {Promise<Object>} Agent object
   */
  async loadAgent(name) {
    // Check cache first
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    const filePath = path.join(this.agentsDir, `${name}.md`);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const agent = this.parseAgent(name, content, filePath);

      // Cache the agent
      this.cache.set(name, agent);

      return agent;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Agent not found: ${name}`);
      }
      throw new Error(`Failed to load agent ${name}: ${error.message}`);
    }
  }

  /**
   * Parse agent markdown file (YAML frontmatter + markdown body)
   * @param {string} name - Agent name
   * @param {string} content - File content
   * @param {string} filePath - File path for reference
   * @returns {Object} Parsed agent object
   */
  parseAgent(name, content, filePath) {
    const agent = {
      name,
      filePath,
      category: 'Other',
      capabilities: [],
      triggers: [],
      priority: 'normal',
      context_budget: 10000,
      guidelines: '',
      metadata: {}
    };

    // Check for YAML frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

    if (frontmatterMatch) {
      // Has frontmatter
      const [, frontmatterStr, bodyStr] = frontmatterMatch;

      try {
        const frontmatter = yaml.parse(frontmatterStr);

        // Merge frontmatter into agent
        Object.assign(agent, {
          name: frontmatter.name || name,
          category: frontmatter.category || agent.category,
          capabilities: Array.isArray(frontmatter.capabilities) ? frontmatter.capabilities : [],
          triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers : [],
          priority: frontmatter.priority || agent.priority,
          context_budget: frontmatter.context_budget || agent.context_budget,
          metadata: frontmatter.metadata || {}
        });

        agent.guidelines = bodyStr.trim();
      } catch (error) {
        console.warn(`⚠️  Failed to parse frontmatter for ${name}: ${error.message}`);
        // Fall back to treating entire content as guidelines
        agent.guidelines = content.trim();
      }
    } else {
      // No frontmatter - entire content is guidelines
      agent.guidelines = content.trim();

      // Try to extract basic metadata from markdown headers
      const titleMatch = content.match(/^#\s+Role:\s+(.+)$/m);
      if (titleMatch) {
        agent.name = titleMatch[1].trim();
      }
    }

    // Generate keywords for search (lowercase)
    agent.keywords = [
      ...agent.capabilities.map(c => c.toLowerCase()),
      ...agent.triggers.map(t => t.toLowerCase()),
      agent.name.toLowerCase(),
      agent.category.toLowerCase()
    ];

    return agent;
  }

  /**
   * Reload a specific agent (bust cache)
   * @param {string} name - Agent name
   * @returns {Promise<Object>} Reloaded agent object
   */
  async reloadAgent(name) {
    this.cache.delete(name);
    return this.loadAgent(name);
  }

  /**
   * Clear the entire cache
   */
  clearCache() {
    this.cache.clear();
    this.lastLoadTime = null;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      cached_agents: this.cache.size,
      last_load_time_ms: this.lastLoadTime,
      cache_keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Check if an agent exists
   * @param {string} name - Agent name
   * @returns {Promise<boolean>} True if agent exists
   */
  async exists(name) {
    const filePath = path.join(this.agentsDir, `${name}.md`);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = AgentLoader;

// Allow standalone execution for testing
if (require.main === module) {
  (async () => {
    const loader = new AgentLoader();
    console.log('Loading all agents...');
    const agents = await loader.loadAll();
    console.log(`\n✅ Loaded ${agents.length} agents in ${loader.lastLoadTime}ms`);
    console.log('\nAgents:');
    agents.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.category})`);
    });
    console.log('\nCache stats:', loader.getCacheStats());
  })().catch(console.error);
}
