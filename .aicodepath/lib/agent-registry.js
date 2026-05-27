#!/usr/bin/env node

/**
 * AgentRegistry - In-memory index for fast agent lookups
 *
 * Provides:
 * - Indexing by name, category, capability keywords
 * - Fast lookup: O(1) by name, O(k) by capability
 * - Agent search and recommendations
 *
 * @module lib/agent-registry
 */

class AgentRegistry {
  constructor() {
    this.agents = new Map(); // name -> agent
    this.byCategory = new Map(); // category -> [agents]
    this.byCapability = new Map(); // capability -> [agents]
    this.byKeyword = new Map(); // keyword -> [agents]
  }

  /**
   * Register multiple agents at once
   * @param {Array} agents - Array of agent objects
   */
  register(agents) {
    agents.forEach(agent => this.registerOne(agent));
  }

  /**
   * Register a single agent
   * @param {Object} agent - Agent object
   */
  registerOne(agent) {
    // Store by name
    this.agents.set(agent.name.toLowerCase(), agent);

    // Index by category
    const category = agent.category || 'Other';
    if (!this.byCategory.has(category)) {
      this.byCategory.set(category, []);
    }
    this.byCategory.get(category).push(agent);

    // Index by capabilities
    agent.capabilities.forEach(capability => {
      const key = capability.toLowerCase();
      if (!this.byCapability.has(key)) {
        this.byCapability.set(key, []);
      }
      this.byCapability.get(key).push(agent);
    });

    // Index by all keywords
    agent.keywords.forEach(keyword => {
      if (!this.byKeyword.has(keyword)) {
        this.byKeyword.set(keyword, []);
      }
      this.byKeyword.get(keyword).push(agent);
    });
  }

  /**
   * Find agent by exact name
   * @param {string} name - Agent name
   * @returns {Object|null} Agent object or null
   */
  findByName(name) {
    const key = name.toLowerCase();
    return this.agents.get(key)
      || this.agents.get('aicodepath-' + key)
      || null;
  }

  /**
   * Find agents by category
   * @param {string} category - Category name
   * @returns {Array} Array of agents
   */
  findByCategory(category) {
    return this.byCategory.get(category) || [];
  }

  /**
   * Find agents by capability keyword (fuzzy match)
   * @param {string} keyword - Capability keyword
   * @returns {Array} Array of agents with scores
   */
  findByCapability(keyword) {
    const searchTerm = keyword.toLowerCase();
    const matches = new Map(); // agent name -> score

    // Exact match in capabilities
    if (this.byCapability.has(searchTerm)) {
      this.byCapability.get(searchTerm).forEach(agent => {
        matches.set(agent.name, (matches.get(agent.name) || 0) + 10);
      });
    }

    // Partial match in all keywords
    for (const [kw, agents] of this.byKeyword.entries()) {
      if (kw.includes(searchTerm) || searchTerm.includes(kw)) {
        agents.forEach(agent => {
          matches.set(agent.name, (matches.get(agent.name) || 0) + 5);
        });
      }
    }

    // Partial match in agent names
    for (const [name, agent] of this.agents.entries()) {
      if (name.includes(searchTerm) || searchTerm.includes(name)) {
        matches.set(agent.name, (matches.get(agent.name) || 0) + 3);
      }
    }

    // Convert to array and sort by score
    return Array.from(matches.entries())
      .map(([name, score]) => ({
        agent: this.agents.get(name.toLowerCase()),
        score
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.agent);
  }

  /**
   * Suggest agents based on context (task description, file path, etc.)
   * @param {Object} context - Context object
   * @param {string} context.task - Task description
   * @param {string} context.filePath - File path being worked on
   * @param {string} context.violationType - Type of validation violation
   * @returns {Array} Ranked array of agent objects
   */
  suggestAgent(context) {
    const { task = '', filePath = '', violationType = '' } = context;
    const allText = `${task} ${filePath} ${violationType}`.toLowerCase();

    const scores = new Map(); // agent name -> score

    // Score agents based on keyword matches
    for (const [name, agent] of this.agents.entries()) {
      let score = 0;

      // Check capabilities
      agent.capabilities.forEach(cap => {
        if (allText.includes(cap.toLowerCase())) {
          score += 10;
        }
      });

      // Check triggers
      agent.triggers.forEach(trigger => {
        if (allText.includes(trigger.toLowerCase())) {
          score += 8;
        }
      });

      // Check category
      if (allText.includes(agent.category.toLowerCase())) {
        score += 5;
      }

      // Priority bonus
      if (agent.priority === 'high') {
        score += 2;
      } else if (agent.priority === 'critical') {
        score += 5;
      }

      if (score > 0) {
        scores.set(name, score);
      }
    }

    // Sort by score and return agents
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => this.agents.get(name))
      .slice(0, 5); // Top 5 suggestions
  }

  /**
   * Get a team composition for a given context
   *
   * Wraps suggestAgent() with team-aware deduplication and size limits.
   * Returns agents suitable for forming a swarm team.
   *
   * @param {Object} context - Context object
   * @param {string} context.task - Task description
   * @param {number} [context.maxSize=5] - Maximum team size
   * @param {string[]} [context.exclude] - Agent names to exclude
   * @returns {Array} Deduplicated array of agent objects for team formation
   */
  getTeamComposition(context) {
    const { task = '', maxSize = 5, exclude = [] } = context;
    const excludeSet = new Set(exclude.map(n => n.toLowerCase()));

    const suggestions = this.suggestAgent({ task });
    const team = [];
    const seen = new Set();

    for (const agent of suggestions) {
      if (team.length >= maxSize) break;
      const key = agent.name.toLowerCase();
      if (seen.has(key) || excludeSet.has(key)) continue;
      seen.add(key);
      team.push(agent);
    }

    return team;
  }

  /**
   * Get all registered agents
   * @returns {Array} Array of all agents
   */
  getAll() {
    return Array.from(this.agents.values());
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry stats
   */
  getStats() {
    return {
      total_agents: this.agents.size,
      categories: Array.from(this.byCategory.keys()),
      capabilities_indexed: this.byCapability.size,
      keywords_indexed: this.byKeyword.size
    };
  }

  /**
   * Clear the entire registry
   */
  clear() {
    this.agents.clear();
    this.byCategory.clear();
    this.byCapability.clear();
    this.byKeyword.clear();
  }
}

module.exports = AgentRegistry;

// Allow standalone execution for testing
if (require.main === module) {
  const AgentLoader = require('./agent-loader');

  (async () => {
    console.log('Testing AgentRegistry...\n');

    const loader = new AgentLoader();
    const agents = await loader.loadAll();

    const registry = new AgentRegistry();
    registry.register(agents);

    console.log('Registry stats:', registry.getStats());
    console.log('\nTest search for "database":');
    const dbAgents = registry.findByCapability('database');
    dbAgents.forEach(agent => console.log(`  - ${agent.name} (${agent.category})`));

    console.log('\nTest suggestion for task "design authentication system":');
    const suggestions = registry.suggestAgent({ task: 'design authentication system' });
    suggestions.forEach(agent => console.log(`  - ${agent.name} (${agent.category})`));
  })().catch(console.error);
}
