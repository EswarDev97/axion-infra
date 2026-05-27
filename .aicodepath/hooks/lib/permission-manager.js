#!/usr/bin/env node

/**
 * Permission Manager
 *
 * Advanced permission management system with dynamic updates, scope management,
 * audit logging, and intelligent permission suggestions.
 *
 * Features:
 * - Store permissions in SQLite database
 * - Query permissions by pattern
 * - Dynamic permission updates from hooks
 * - Permission scopes (global, session, temporary)
 * - Audit trail of all permission actions
 * - Permission suggestion based on usage patterns
 *
 * Usage:
 *   const PermissionManager = require('./lib/permission-manager');
 *   const pm = new PermissionManager();
 *
 *   // Grant permission
 *   pm.grant('git status', 'Bash', 'allow', 'global');
 *
 *   // Check permission
 *   const allowed = pm.check('git status', 'Bash');
 *
 *   // Get suggestions
 *   const suggestions = pm.getSuggestions();
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { findProjectRoot } = require('../../.aicodepath/lib/path-resolver');

/**
 * Permission Manager Class
 */
class PermissionManager {
  constructor(dbPath = null) {
    this.projectRoot = findProjectRoot() || process.cwd();
    this.dbPath = dbPath || path.join(this.projectRoot, 'aicodepath-docs', 'permissions.db');
    this.db = null;
    this.sessionId = this.generateSessionId();
    this.usageStats = new Map(); // Track permission usage

    this.ensureDatabase();
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ensure database and tables exist
   */
  ensureDatabase() {
    // Create directory if needed
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database (better-sqlite3 is synchronous)
    this.db = new Database(this.dbPath);

    // Create tables (synchronous with better-sqlite3)
    // Permissions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL,
        tool TEXT NOT NULL,
        decision TEXT NOT NULL CHECK(decision IN ('allow', 'deny', 'ask')),
        reason TEXT,
        granted_at TEXT NOT NULL,
        granted_by TEXT,
        expires_at TEXT,
        scope TEXT NOT NULL CHECK(scope IN ('global', 'session', 'temporary')),
        session_id TEXT,
        metadata TEXT,
        UNIQUE(pattern, tool, scope, session_id)
      )
    `);

    // Permission audit table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS permission_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        permission_id INTEGER,
        action TEXT NOT NULL CHECK(action IN ('grant', 'revoke', 'use', 'suggest')),
        timestamp TEXT NOT NULL,
        context TEXT,
        FOREIGN KEY(permission_id) REFERENCES permissions(id)
      )
    `);

    // Usage statistics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS permission_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL,
        tool TEXT NOT NULL,
        user_response TEXT NOT NULL CHECK(user_response IN ('allow', 'deny', 'ask', 'skip')),
        timestamp TEXT NOT NULL,
        session_id TEXT,
        context TEXT
      )
    `);

    // Indexes for performance
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_permissions_pattern ON permissions(pattern, tool)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_permissions_scope ON permissions(scope, session_id)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON permission_audit(timestamp)');
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_usage_pattern ON permission_usage(pattern, tool)');
  }

  /**
   * Grant a permission
   *
   * @param {string} pattern - Permission pattern (e.g., "git status")
   * @param {string} tool - Tool name (e.g., "Bash")
   * @param {string} decision - allow, deny, or ask
   * @param {string} scope - global, session, or temporary
   * @param {Object} options - Additional options
   */
  grant(pattern, tool, decision, scope = 'global', options = {}) {
    const now = new Date().toISOString();
    const expiresAt = options.expiresIn ? new Date(Date.now() + options.expiresIn).toISOString() : null;
    const sessionId = scope === 'session' ? this.sessionId : null;
    const metadata = options.metadata ? JSON.stringify(options.metadata) : null;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO permissions
      (pattern, tool, decision, reason, granted_at, granted_by, expires_at, scope, session_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      pattern, tool, decision, options.reason || null, now, options.grantedBy || 'user',
      expiresAt, scope, sessionId, metadata
    );

    // Log audit trail
    this.auditLog(result.lastInsertRowid, 'grant', {
      pattern,
      tool,
      decision,
      scope
    });

    return {
      id: result.lastInsertRowid,
      pattern,
      tool,
      decision,
      scope
    };
  }

  /**
   * Check if permission is granted
   *
   * @param {string} pattern - Permission pattern
   * @param {string} tool - Tool name
   * @returns {Object} Permission status
   */
  check(pattern, tool) {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      SELECT * FROM permissions
      WHERE pattern = ? AND tool = ?
      AND (expires_at IS NULL OR expires_at > ?)
      AND (scope = 'global' OR (scope = 'session' AND session_id = ?))
      ORDER BY
        CASE scope
          WHEN 'temporary' THEN 1
          WHEN 'session' THEN 2
          WHEN 'global' THEN 3
        END
      LIMIT 1
    `);

    const row = stmt.get(pattern, tool, now, this.sessionId);

    if (row) {
      // Log usage
      this.auditLog(row.id, 'use', { pattern, tool });

      return {
        granted: row.decision === 'allow',
        decision: row.decision,
        reason: row.reason,
        scope: row.scope,
        expiresAt: row.expires_at
      };
    }

    return {
      granted: false,
      decision: 'ask',
      reason: 'No permission found'
    };
  }

  /**
   * Revoke a permission
   *
   * @param {number} permissionId - Permission ID to revoke
   */
  revoke(permissionId) {
    const stmt = this.db.prepare('DELETE FROM permissions WHERE id = ?');
    const result = stmt.run(permissionId);

    // Log audit trail
    this.auditLog(permissionId, 'revoke', {});

    return {
      success: true,
      rowsAffected: result.changes
    };
  }

  /**
   * List all permissions
   *
   * @param {Object} filters - Filter options
   * @returns {Array} List of permissions
   */
  list(filters = {}) {
    let query = 'SELECT * FROM permissions WHERE 1=1';
    const params = [];

    if (filters.scope) {
      query += ' AND scope = ?';
      params.push(filters.scope);
    }

    if (filters.tool) {
      query += ' AND tool = ?';
      params.push(filters.tool);
    }

    if (filters.decision) {
      query += ' AND decision = ?';
      params.push(filters.decision);
    }

    if (filters.sessionId) {
      query += ' AND session_id = ?';
      params.push(filters.sessionId);
    }

    query += ' ORDER BY granted_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Record permission usage for suggestion system
   *
   * @param {string} pattern - Permission pattern
   * @param {string} tool - Tool name
   * @param {string} userResponse - User's response (allow, deny, skip)
   */
  recordUsage(pattern, tool, userResponse) {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO permission_usage (pattern, tool, user_response, timestamp, session_id, context)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(pattern, tool, userResponse, now, this.sessionId, null);

    return { id: result.lastInsertRowid };
  }

  /**
   * Get permission suggestions based on usage patterns
   *
   * @returns {Array} List of suggestions
   */
  getSuggestions() {
    const stmt = this.db.prepare(`
      SELECT
        pattern,
        tool,
        COUNT(*) as approval_count,
        MAX(timestamp) as last_used
      FROM permission_usage
      WHERE user_response = 'allow'
      AND NOT EXISTS (
        SELECT 1 FROM permissions p
        WHERE p.pattern = permission_usage.pattern
        AND p.tool = permission_usage.tool
        AND p.scope = 'global'
      )
      GROUP BY pattern, tool
      HAVING approval_count >= 3
      ORDER BY approval_count DESC, last_used DESC
      LIMIT 10
    `);

    const rows = stmt.all();

    return rows.map(row => ({
      pattern: row.pattern,
      tool: row.tool,
      reason: `You've approved this ${row.approval_count} times. Grant permanent permission?`,
      suggestedScope: 'global',
      usageCount: row.approval_count,
      lastUsed: row.last_used
    }));
  }

  /**
   * Clean up expired permissions
   *
   * @returns {Object} Cleanup results
   */
  cleanup() {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(
      'DELETE FROM permissions WHERE expires_at IS NOT NULL AND expires_at < ?'
    );

    const result = stmt.run(now);

    return {
      success: true,
      expiredPermissions: result.changes
    };
  }

  /**
   * Get audit trail
   *
   * @param {Object} filters - Filter options
   * @returns {Array} Audit entries
   */
  getAuditTrail(filters = {}) {
    let query = 'SELECT * FROM permission_audit WHERE 1=1';
    const params = [];

    if (filters.permissionId) {
      query += ' AND permission_id = ?';
      params.push(filters.permissionId);
    }

    if (filters.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters.since) {
      query += ' AND timestamp >= ?';
      params.push(filters.since);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Log audit entry
   *
   * @param {number} permissionId - Permission ID
   * @param {string} action - Action performed
   * @param {Object} context - Additional context
   */
  auditLog(permissionId, action, context) {
    try {
      const now = new Date().toISOString();
      const contextJson = JSON.stringify(context);

      const stmt = this.db.prepare(
        'INSERT INTO permission_audit (permission_id, action, timestamp, context) VALUES (?, ?, ?, ?)'
      );

      stmt.run(permissionId, action, now, contextJson);
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  }

  /**
   * Get statistics
   *
   * @returns {Object} Permission statistics
   */
  getStats() {
    const stmt = this.db.prepare(`
      SELECT
        scope,
        decision,
        COUNT(*) as count
      FROM permissions
      GROUP BY scope, decision
    `);

    const rows = stmt.all();

    const stats = {
      total: 0,
      byScope: {},
      byDecision: {}
    };

    rows.forEach(row => {
      stats.total += row.count;
      stats.byScope[row.scope] = (stats.byScope[row.scope] || 0) + row.count;
      stats.byDecision[row.decision] = (stats.byDecision[row.decision] || 0) + row.count;
    });

    return stats;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// Export class and helper function
module.exports = PermissionManager;

// CLI interface for testing
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const pm = new PermissionManager();

  try {
    if (!command || command === 'help') {
      console.log('Permission Manager CLI\n');
      console.log('Commands:');
      console.log('  grant <pattern> <tool> <decision> [scope]  Grant permission');
      console.log('  check <pattern> <tool>                     Check permission');
      console.log('  list [scope]                               List permissions');
      console.log('  suggestions                                Get suggestions');
      console.log('  stats                                      Show statistics');
      console.log('  audit                                      Show audit trail');
      console.log('  cleanup                                    Clean expired permissions');
      console.log('  help                                       Show this help');
      console.log('\nExamples:');
      console.log('  node permission-manager.js grant "git status" Bash allow global');
      console.log('  node permission-manager.js check "git status" Bash');
      console.log('  node permission-manager.js list global');
      console.log('  node permission-manager.js suggestions');
      process.exit(0);
    }

    if (command === 'grant') {
      const [, pattern, tool, decision, scope] = args;
      if (!pattern || !tool || !decision) {
        console.error('Usage: grant <pattern> <tool> <decision> [scope]');
        process.exit(1);
      }

      const result = pm.grant(pattern, tool, decision, scope || 'global');
      console.log('✅ Permission granted:', result);

    } else if (command === 'check') {
      const [, pattern, tool] = args;
      if (!pattern || !tool) {
        console.error('Usage: check <pattern> <tool>');
        process.exit(1);
      }

      const result = pm.check(pattern, tool);
      console.log('Permission status:', result);

    } else if (command === 'list') {
      const scope = args[1];
      const permissions = pm.list(scope ? { scope } : {});
      console.log(`\nPermissions (${permissions.length}):\n`);
      permissions.forEach(p => {
        console.log(`${p.id}. [${p.scope}] ${p.pattern} (${p.tool}) -> ${p.decision}`);
        if (p.expires_at) console.log(`   Expires: ${p.expires_at}`);
      });

    } else if (command === 'suggestions') {
      const suggestions = pm.getSuggestions();
      console.log(`\nPermission Suggestions (${suggestions.length}):\n`);
      suggestions.forEach(s => {
        console.log(`• ${s.pattern} (${s.tool})`);
        console.log(`  ${s.reason}`);
        console.log(`  Used ${s.usageCount} times, last: ${s.lastUsed}\n`);
      });

    } else if (command === 'stats') {
      const stats = pm.getStats();
      console.log('\nPermission Statistics:\n');
      console.log(`Total: ${stats.total}`);
      console.log('\nBy Scope:');
      Object.entries(stats.byScope).forEach(([scope, count]) => {
        console.log(`  ${scope}: ${count}`);
      });
      console.log('\nBy Decision:');
      Object.entries(stats.byDecision).forEach(([decision, count]) => {
        console.log(`  ${decision}: ${count}`);
      });

    } else if (command === 'audit') {
      const trail = pm.getAuditTrail({ limit: 20 });
      console.log(`\nAudit Trail (last ${trail.length}):\n`);
      trail.forEach(entry => {
        console.log(`${entry.timestamp} - ${entry.action}`);
        if (entry.context) {
          console.log(`  ${entry.context}`);
        }
      });

    } else if (command === 'cleanup') {
      const result = pm.cleanup();
      console.log('✅ Cleanup complete:', result);

    } else {
      console.error(`Unknown command: ${command}`);
      console.error('Use "help" to see available commands');
      process.exit(1);
    }

    pm.close();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    pm.close();
    process.exit(1);
  }
}
