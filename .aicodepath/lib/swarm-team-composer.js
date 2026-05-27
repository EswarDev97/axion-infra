/**
 * Swarm Team Composer
 *
 * Maps AICodePath's 24 specialized agents to team roles based on
 * AIDLC phase, task capabilities, and orchestration pattern.
 *
 * Reuses AgentRegistry.suggestAgent() scoring for capability matching
 * and adds team-aware deduplication and role assignment.
 *
 * @module lib/swarm-team-composer
 */

const path = require('path');
const logger = require('./logger');

/** Maximum number of teammates per team (cost control + Claude Code limit) */
const MAX_TEAM_SIZE = 5;

/**
 * Phase-specific default team compositions
 * Each phase has a preferred orchestration pattern and agent list
 */
const PHASE_DEFAULTS = {
  'PRE-FLIGHT': {
    pattern: 'review',
    agents: ['aicodepath-architect', 'aicodepath-devops-architect'],
    description: 'Research and environment validation',
  },
  'INCEPTION': {
    pattern: 'pipeline',
    agents: [
      'aicodepath-architect',
      'aicodepath-api-designer',
      'aicodepath-database-architect',
      'aicodepath-security-engineer',
    ],
    description: 'Sequential design handoff pipeline',
  },
  'CONSTRUCTION': {
    pattern: 'parallel',
    agents: [
      'aicodepath-backend-architect',
      'aicodepath-frontend-architect',
      'aicodepath-test-engineer',
      'aicodepath-database-architect',
      'aicodepath-security-engineer',
    ],
    description: 'Parallel specialist implementation',
  },
  'OPERATIONS': {
    pattern: 'review',
    agents: [
      'aicodepath-sre-engineer',
      'aicodepath-devops-architect',
      'aicodepath-performance-engineer',
    ],
    description: 'Operations research and implementation',
  },
};

/** Valid orchestration patterns */
const VALID_PATTERNS = ['parallel', 'pipeline', 'swarm', 'review'];

class SwarmTeamComposer {
  /**
   * @param {Object} registry - AgentRegistry instance with loaded agents
   * @param {Object} [sessionStateManager] - Optional SessionStateManager for phase detection
   */
  constructor(registry, sessionStateManager) {
    this.registry = registry;
    this.sessionStateManager = sessionStateManager;
  }

  /**
   * Compose a team for a given task and context
   *
   * @param {string} taskDescription - What the team needs to accomplish
   * @param {Object} [options] - Composition options
   * @param {string} [options.pattern] - Override orchestration pattern
   * @param {string} [options.phase] - Override AIDLC phase (auto-detected if omitted)
   * @param {number} [options.maxSize] - Override max team size
   * @param {string[]} [options.requiredAgents] - Agents that must be included
   * @param {string[]} [options.excludeAgents] - Agents to exclude
   * @returns {Object} Team composition: { teamName, pattern, phase, members[] }
   */
  composeTeam(taskDescription, options = {}) {
    const phase = options.phase || this._detectPhase();
    const pattern = this._resolvePattern(options.pattern, phase);
    const maxSize = Math.min(options.maxSize || MAX_TEAM_SIZE, MAX_TEAM_SIZE);

    logger.info('Composing swarm team', {
      context: 'swarm-team-composer',
      task: taskDescription.substring(0, 80),
      phase,
      pattern,
      maxSize,
    });

    // Start with phase defaults or task-based suggestion
    let candidates = this._getCandidates(taskDescription, phase, options);

    // Apply required/excluded filters
    if (options.requiredAgents) {
      candidates = this._ensureRequired(candidates, options.requiredAgents);
    }
    if (options.excludeAgents) {
      candidates = candidates.filter(
        c => !options.excludeAgents.includes(c.agentName)
      );
    }

    // Deduplicate and trim to max size
    candidates = this._deduplicate(candidates).slice(0, maxSize);

    // Assign roles based on pattern
    const members = this._assignRoles(candidates, pattern);

    const teamName = this._generateTeamName(phase, pattern);

    logger.info('Team composed', {
      context: 'swarm-team-composer',
      teamName,
      memberCount: members.length,
      members: members.map(m => `${m.agentName}(${m.role})`).join(', '),
    });

    return {
      teamName,
      pattern,
      phase,
      description: taskDescription,
      members,
    };
  }

  /**
   * Get the default team composition for a given phase
   *
   * @param {string} phase - AIDLC phase name
   * @returns {Object|null} Default team or null if phase unknown
   */
  getPhaseDefaultTeam(phase) {
    const upper = (phase || '').toUpperCase();
    const defaults = PHASE_DEFAULTS[upper];
    if (!defaults) {
      return null;
    }

    return {
      pattern: defaults.pattern,
      description: defaults.description,
      agents: [...defaults.agents],
    };
  }

  /**
   * Build a spawn prompt for a teammate, embedding the AICodePath agent persona
   *
   * @param {Object} agentDef - Agent definition object from AgentRegistry
   * @param {Object} teamContext - Team formation context
   * @param {string} teamContext.teamName - Team name
   * @param {string} teamContext.pattern - Orchestration pattern
   * @param {string} teamContext.role - This member's role
   * @param {string} teamContext.taskScope - Description of assigned scope
   * @returns {string} Spawn prompt text
   */
  buildSpawnPrompt(agentDef, teamContext) {
    const lines = [
      `You are ${agentDef.name}, a specialized AI agent on team "${teamContext.teamName}".`,
      '',
      `## Your Role: ${teamContext.role}`,
      `Pattern: ${teamContext.pattern}`,
      '',
      `## Agent Specialization`,
      agentDef.description || '',
      '',
      `## Capabilities`,
      ...(agentDef.capabilities || []).map(c => `- ${c}`),
      '',
      `## Task Scope`,
      teamContext.taskScope || 'Work on assigned tasks from the team task list.',
      '',
      `## Team Coordination Rules`,
      '- Check the shared task list before starting work',
      '- Update task status as you progress',
      '- Signal completion when your assigned tasks are done',
      `- Follow the ${teamContext.pattern} orchestration pattern`,
    ];

    if (teamContext.pattern === 'pipeline') {
      lines.push(
        '- Wait for upstream tasks to complete before starting yours',
        '- Signal downstream teammates when your tasks are done'
      );
    } else if (teamContext.pattern === 'parallel') {
      lines.push(
        '- Work independently on your assigned units',
        '- Do not modify files assigned to other teammates'
      );
    } else if (teamContext.pattern === 'review') {
      lines.push(
        '- Phase 1: Research and analysis only (read-only)',
        '- Phase 2: Implementation based on research findings'
      );
    }

    return lines.join('\n');
  }

  /**
   * Score agents for a specific task using the registry's suggestion algorithm
   *
   * @param {string} task - Task description
   * @param {Array} [availableAgents] - Limit to these agents (optional)
   * @returns {Array} Scored agents sorted by relevance
   */
  scoreAgentsForTask(task, availableAgents) {
    const suggested = this.registry.suggestAgent({ task });

    if (!availableAgents || availableAgents.length === 0) {
      return suggested.map(agent => ({
        agentName: agent.name,
        agent,
        score: 1,
      }));
    }

    const allowedNames = new Set(availableAgents.map(n => n.toLowerCase()));
    return suggested
      .filter(agent => allowedNames.has(agent.name.toLowerCase()))
      .map(agent => ({
        agentName: agent.name,
        agent,
        score: 1,
      }));
  }

  /**
   * Get candidate agents from phase defaults + task scoring
   * @private
   */
  _getCandidates(taskDescription, phase, options) {
    const candidates = [];
    const seen = new Set();

    // Phase defaults first
    const phaseDefaults = PHASE_DEFAULTS[(phase || '').toUpperCase()];
    if (phaseDefaults) {
      for (const agentName of phaseDefaults.agents) {
        const agent = this.registry.findByName(agentName);
        if (agent && !seen.has(agentName.toLowerCase())) {
          seen.add(agentName.toLowerCase());
          candidates.push({ agentName: agent.name, agent });
        }
      }
    }

    // Task-based scoring to fill remaining slots
    const suggested = this.registry.suggestAgent({ task: taskDescription });
    for (const agent of suggested) {
      if (!seen.has(agent.name.toLowerCase())) {
        seen.add(agent.name.toLowerCase());
        candidates.push({ agentName: agent.name, agent });
      }
    }

    return candidates;
  }

  /**
   * Ensure required agents are included at the front of the list
   * @private
   */
  _ensureRequired(candidates, requiredAgents) {
    const required = [];
    const rest = [];
    const requiredSet = new Set(requiredAgents.map(n => n.toLowerCase()));

    // Pull required agents out
    for (const c of candidates) {
      if (requiredSet.has(c.agentName.toLowerCase())) {
        required.push(c);
        requiredSet.delete(c.agentName.toLowerCase());
      } else {
        rest.push(c);
      }
    }

    // Add any required agents not in candidates from registry
    for (const name of requiredSet) {
      const agent = this.registry.findByName(name);
      if (agent) {
        required.push({ agentName: agent.name, agent });
      }
    }

    return [...required, ...rest];
  }

  /**
   * Remove duplicate agents (by name, case-insensitive)
   * @private
   */
  _deduplicate(candidates) {
    const seen = new Set();
    return candidates.filter(c => {
      const key = c.agentName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Assign roles to team members based on orchestration pattern
   * @private
   */
  _assignRoles(candidates, pattern) {
    return candidates.map((c, index) => {
      let role = 'specialist';

      if (index === 0) {
        role = pattern === 'review' ? 'reviewer' : 'lead';
      } else if (pattern === 'review' && index === candidates.length - 1) {
        role = 'implementer';
      }

      return {
        agentName: c.agentName,
        agent: c.agent,
        role,
        status: 'pending',
      };
    });
  }

  /**
   * Resolve orchestration pattern from option override or phase default
   * @private
   */
  _resolvePattern(explicitPattern, phase) {
    if (explicitPattern && VALID_PATTERNS.includes(explicitPattern)) {
      return explicitPattern;
    }

    const phaseDefaults = PHASE_DEFAULTS[(phase || '').toUpperCase()];
    return phaseDefaults ? phaseDefaults.pattern : 'parallel';
  }

  /**
   * Detect current AIDLC phase from session state
   * @private
   */
  _detectPhase() {
    if (!this.sessionStateManager) {
      return 'CONSTRUCTION';
    }

    try {
      const phase = this.sessionStateManager.get('current_phase');
      return phase || 'CONSTRUCTION';
    } catch {
      return 'CONSTRUCTION';
    }
  }

  /**
   * Generate a unique team name based on phase and pattern
   * @private
   */
  _generateTeamName(phase, pattern) {
    const timestamp = Date.now().toString(36).slice(-4);
    const phasePart = (phase || 'build').toLowerCase().replace(/[^a-z]/g, '');
    return `${phasePart}-${pattern}-${timestamp}`;
  }
}

module.exports = {
  SwarmTeamComposer,
  PHASE_DEFAULTS,
  VALID_PATTERNS,
  MAX_TEAM_SIZE,
};
