#!/usr/bin/env node

/**
 * ContextManager - Manages context window usage and optimization
 *
 * Research Foundation (2026):
 * - "Lost in the Middle" phenomenon: 15-47% degradation as context fills
 * - Effective capacity: 60-70% of advertised maximum
 * - Claude 4 Sonnet: <5% degradation across 200k tokens (best-in-class)
 * - Best practice: Use 70-80% max to avoid accuracy drop
 *
 * Responsibilities:
 * - Track token usage per agent invocation
 * - Check thresholds (60% warning, 70% critical, 85% exceeded)
 * - Apply priority loading (important info at start/end)
 * - Compact context (summarize middle content)
 * - Log usage to database
 *
 * @module lib/context-manager
 */

const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');
const { getDbPath } = require('./path-resolver');

class ContextManager {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.configPath - Path to context-management.json
   * @param {string} options.dbPath - Path to SQLite database
   * @param {Object} options.db - Database connection (optional)
   */
  constructor(options = {}) {
    this.configPath = options.configPath || '.aicodepath/config/context-management.json';
    this.dbPath = options.dbPath || getDbPath();
    this.db = options.db || null;
    this.config = null;
  }

  /**
   * Load configuration from file
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfig() {
    if (this.config) {
      return this.config;
    }

    try {
      const configFile = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configFile);
      return this.config;
    } catch (error) {
      // Use default config if file not found
      console.warn(`⚠️  Context config not found, using defaults: ${error.message}`);
      this.config = this.getDefaultConfig();
      return this.config;
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfig() {
    return {
      enabled: true,
      strategy: 'hybrid',
      thresholds: {
        warning: 0.60,
        critical: 0.70,
        maximum: 0.85
      },
      model_limits: {
        'claude-sonnet-4': 200000,
        'claude-opus-4': 200000,
        'claude-opus-4-6': 200000,
        'claude-opus-4-6-1m': 1000000,
        'claude-sonnet-4-6': 200000,
        'claude-haiku-4-5': 200000,
        'gpt-4': 128000,
        'gemini-pro': 1000000
      },
      strategies: {
        priority_loading: {
          enabled: true,
          always_include: ['guidelines/*.json', 'CLAUDE.md'],
          position: 'start'
        },
        compaction: {
          enabled: true,
          trigger_at: 0.70,
          method: 'summarize'
        },
        caching: {
          enabled: false,
          cache_static: ['guidelines', 'rules']
        }
      }
    };
  }

  /**
   * Estimate tokens from text (rough: ~4 chars per token)
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }
    return Math.ceil(text.length / 4);
  }

  /**
   * Get model limit from configuration
   * @param {string} modelName - Model name
   * @returns {number} Token limit for model
   */
  getModelLimit(modelName = 'claude-sonnet-4') {
    const config = this.config || this.getDefaultConfig();
    return config.model_limits[modelName] || 200000;
  }

  /**
   * Check threshold status
   * @param {number} currentTokens - Current token count
   * @param {number} limit - Token limit (optional, uses default if not provided)
   * @param {string} modelName - Model name (optional)
   * @returns {string} Status: 'safe' | 'warning' | 'critical' | 'exceeded'
   */
  checkThreshold(currentTokens, limit = null, modelName = 'claude-sonnet-4') {
    const config = this.config || this.getDefaultConfig();
    const tokenLimit = limit || this.getModelLimit(modelName);
    const usage = currentTokens / tokenLimit;

    if (usage >= config.thresholds.maximum) {
      return 'exceeded';
    } else if (usage >= config.thresholds.critical) {
      return 'critical';
    } else if (usage >= config.thresholds.warning) {
      return 'warning';
    } else {
      return 'safe';
    }
  }

  /**
   * Get threshold percentage
   * @param {number} currentTokens - Current token count
   * @param {number} limit - Token limit
   * @returns {number} Usage percentage (0-100)
   */
  getUsagePercentage(currentTokens, limit) {
    return Math.round((currentTokens / limit) * 100);
  }

  /**
   * Get status emoji for display
   * @param {string} status - Threshold status
   * @returns {string} Emoji indicator
   */
  getStatusEmoji(status) {
    switch (status) {
      case 'safe':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'critical':
        return '🟠';
      case 'exceeded':
        return '🔴';
      default:
        return '⚪';
    }
  }

  /**
   * Track usage to database
   * @param {string} agentName - Agent name
   * @param {number} tokensUsed - Tokens used
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async trackUsage(agentName, tokensUsed, options = {}) {
    const config = this.config || this.getDefaultConfig();
    if (!config.enabled) {
      return;
    }

    const modelName = options.modelName || 'claude-sonnet-4';
    const limit = this.getModelLimit(modelName);
    const status = this.checkThreshold(tokensUsed, limit, modelName);
    const compactionTriggered = status === 'critical' && config.strategies.compaction.enabled;

    try {
      // Use provided db connection or create new one
      const db = this.db || new Database(this.dbPath);

      const stmt = db.prepare(`
        INSERT INTO context_usage
        (agent_name, tokens_used, model_name, threshold_status, compaction_triggered, timestamp)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);

      stmt.run(
        agentName,
        tokensUsed,
        modelName,
        status,
        compactionTriggered ? 1 : 0
      );

      // Close db if we opened it
      if (!this.db) {
        db.close();
      }
    } catch (error) {
      console.warn(`⚠️  Failed to track context usage: ${error.message}`);
    }
  }

  /**
   * Apply priority loading strategy
   * @param {Object} context - Context object
   * @param {Array} context.items - Context items to prioritize
   * @returns {Object} Reordered context
   */
  applyPriorityLoading(context) {
    const config = this.config || this.getDefaultConfig();
    if (!config.strategies.priority_loading.enabled) {
      return context;
    }

    const { always_include, position } = config.strategies.priority_loading;
    const items = context.items || [];

    // Separate priority items from regular items
    const priorityItems = [];
    const regularItems = [];

    items.forEach(item => {
      const isPriority = always_include.some(pattern => {
        // Simple pattern matching (could be enhanced with glob)
        return item.path && item.path.includes(pattern.replace('*', ''));
      });

      if (isPriority) {
        priorityItems.push(item);
      } else {
        regularItems.push(item);
      }
    });

    // Reorder based on position strategy
    if (position === 'start') {
      return {
        ...context,
        items: [...priorityItems, ...regularItems]
      };
    } else if (position === 'end') {
      return {
        ...context,
        items: [...regularItems, ...priorityItems]
      };
    } else if (position === 'both') {
      // Split priority items: half at start, half at end
      const midpoint = Math.ceil(priorityItems.length / 2);
      const startItems = priorityItems.slice(0, midpoint);
      const endItems = priorityItems.slice(midpoint);

      return {
        ...context,
        items: [...startItems, ...regularItems, ...endItems]
      };
    }

    return context;
  }

  /**
   * Compact context by summarizing middle content
   * @param {Object} context - Context object
   * @param {number} targetTokens - Target token count after compaction
   * @returns {Promise<Object>} Compacted context
   */
  async compact(context, targetTokens = null) {
    const config = this.config || this.getDefaultConfig();
    if (!config.strategies.compaction.enabled) {
      return context;
    }

    // If target not specified, compact to 60% of limit
    const limit = this.getModelLimit();
    const target = targetTokens || Math.floor(limit * 0.6);

    const items = context.items || [];
    const currentTokens = items.reduce((sum, item) => {
      return sum + this.estimateTokens(item.content || '');
    }, 0);

    // If already under target, no need to compact
    if (currentTokens <= target) {
      return context;
    }

    // Strategy: Keep first 30%, summarize middle 40%, keep last 30%
    const keepStart = Math.floor(items.length * 0.3);
    const keepEnd = Math.floor(items.length * 0.3);
    const summarizeCount = items.length - keepStart - keepEnd;

    const startItems = items.slice(0, keepStart);
    const middleItems = items.slice(keepStart, keepStart + summarizeCount);
    const endItems = items.slice(keepStart + summarizeCount);

    // Create summary of middle items
    const middleSummary = {
      path: '[COMPACTED_CONTEXT]',
      content: `[Context compacted: ${summarizeCount} items summarized]\n\nSummary:\n` +
               middleItems.map(item => `- ${item.path || 'Unknown'}: ${item.summary || 'No summary'}`).join('\n'),
      summary: `Compacted ${summarizeCount} context items`,
      tokens: this.estimateTokens(middleItems.map(i => i.content || '').join('\n')) // Original token count
    };

    return {
      ...context,
      items: [...startItems, middleSummary, ...endItems],
      compacted: true,
      originalTokens: currentTokens,
      compactedTokens: this.estimateTokens(
        [...startItems, middleSummary, ...endItems]
          .map(i => i.content || '')
          .join('\n')
      )
    };
  }

  /**
   * Get current context usage statistics
   * @param {string} agentName - Filter by agent name (optional)
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(agentName = null) {
    try {
      const db = this.db || new Database(this.dbPath, { readonly: true });

      let query = `
        SELECT
          agent_name,
          COUNT(*) as total_invocations,
          SUM(tokens_used) as total_tokens,
          AVG(tokens_used) as avg_tokens,
          MAX(tokens_used) as max_tokens,
          SUM(CASE WHEN compaction_triggered = 1 THEN 1 ELSE 0 END) as compactions_triggered,
          COUNT(DISTINCT threshold_status) as unique_statuses
        FROM context_usage
      `;

      if (agentName) {
        query += ` WHERE agent_name = ?`;
      }

      query += ` GROUP BY agent_name ORDER BY total_tokens DESC`;

      const stmt = db.prepare(query);
      const results = agentName ? stmt.all(agentName) : stmt.all();

      // Close db if we opened it
      if (!this.db) {
        db.close();
      }

      return results;
    } catch (error) {
      console.warn(`⚠️  Failed to get usage stats: ${error.message}`);
      return [];
    }
  }

  /**
   * Get overall context health
   * @returns {Promise<Object>} Health metrics
   */
  async getContextHealth() {
    try {
      const db = this.db || new Database(this.dbPath, { readonly: true });

      const stats = db.prepare(`
        SELECT
          COUNT(*) as total_invocations,
          SUM(tokens_used) as total_tokens,
          AVG(tokens_used) as avg_tokens,
          SUM(CASE WHEN threshold_status = 'safe' THEN 1 ELSE 0 END) as safe_count,
          SUM(CASE WHEN threshold_status = 'warning' THEN 1 ELSE 0 END) as warning_count,
          SUM(CASE WHEN threshold_status = 'critical' THEN 1 ELSE 0 END) as critical_count,
          SUM(CASE WHEN threshold_status = 'exceeded' THEN 1 ELSE 0 END) as exceeded_count,
          SUM(CASE WHEN compaction_triggered = 1 THEN 1 ELSE 0 END) as total_compactions
        FROM context_usage
      `).get();

      // Calculate health score (0-100)
      const total = stats.total_invocations || 1;
      const healthScore = Math.round(
        ((stats.safe_count + stats.warning_count * 0.7 + stats.critical_count * 0.3) / total) * 100
      );

      // Close db if we opened it
      if (!this.db) {
        db.close();
      }

      return {
        ...stats,
        health_score: healthScore,
        health_status: healthScore >= 80 ? 'healthy' :
                       healthScore >= 60 ? 'moderate' : 'poor'
      };
    } catch (error) {
      console.warn(`⚠️  Failed to get context health: ${error.message}`);
      return {
        health_score: 0,
        health_status: 'unknown',
        total_invocations: 0
      };
    }
  }

  /**
   * Clear old context usage records
   * @param {number} daysOld - Delete records older than this many days
   * @returns {Promise<number>} Number of records deleted
   */
  async clearOldRecords(daysOld = 30) {
    try {
      const db = this.db || new Database(this.dbPath);

      const result = db.prepare(`
        DELETE FROM context_usage
        WHERE timestamp < datetime('now', '-' || ? || ' days')
      `).run(daysOld);

      // Close db if we opened it
      if (!this.db) {
        db.close();
      }

      return result.changes;
    } catch (error) {
      console.warn(`⚠️  Failed to clear old records: ${error.message}`);
      return 0;
    }
  }
}

module.exports = ContextManager;

// Allow standalone execution for testing
if (require.main === module) {
  (async () => {
    console.log('Testing ContextManager...\n');

    const manager = new ContextManager();
    await manager.loadConfig();

    console.log('Configuration loaded:');
    console.log(JSON.stringify(manager.config, null, 2));

    // Test threshold checking
    console.log('\nTesting threshold checks:');
    const tests = [
      { tokens: 50000, limit: 200000 },   // 25% - safe
      { tokens: 130000, limit: 200000 },  // 65% - warning
      { tokens: 150000, limit: 200000 },  // 75% - critical
      { tokens: 180000, limit: 200000 }   // 90% - exceeded
    ];

    tests.forEach(({ tokens, limit }) => {
      const status = manager.checkThreshold(tokens, limit);
      const percentage = manager.getUsagePercentage(tokens, limit);
      const emoji = manager.getStatusEmoji(status);
      console.log(`  ${emoji} ${tokens.toLocaleString()} / ${limit.toLocaleString()} tokens (${percentage}%) - ${status}`);
    });

    // Test token estimation
    console.log('\nTesting token estimation:');
    const testText = 'This is a test string with approximately 10 words in it.';
    const estimated = manager.estimateTokens(testText);
    console.log(`  Text: "${testText}"`);
    console.log(`  Length: ${testText.length} chars`);
    console.log(`  Estimated tokens: ${estimated} (~${Math.round(testText.length / estimated)} chars/token)`);

    // Test usage stats (if database exists)
    console.log('\nContext health:');
    const health = await manager.getContextHealth();
    console.log(`  Health Score: ${health.health_score}/100 (${health.health_status})`);
    console.log(`  Total Invocations: ${health.total_invocations}`);
    console.log(`  Safe: ${health.safe_count || 0}, Warning: ${health.warning_count || 0}, Critical: ${health.critical_count || 0}, Exceeded: ${health.exceeded_count || 0}`);

    console.log('\n✅ ContextManager tests completed');
  })().catch(console.error);
}
