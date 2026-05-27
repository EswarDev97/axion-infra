/**
 * Terminal Sandbox Security Module
 *
 * Provides security controls for terminal sessions including command validation,
 * path restrictions, and environment variable filtering.
 *
 * @module lib/terminal-sandbox
 */

const path = require('path');
const logger = require('./logger');
const pathResolver = require('./path-resolver');

/**
 * Default blocked command patterns
 */
const DEFAULT_BLOCKED_COMMANDS = [
  'rm -rf',
  'rm -r /',
  'dd if=',
  ':() {',
  'mkfs',
  'shutdown',
  'reboot',
  'poweroff',
  'halt',
  'init 0',
  'sudo rm',
  'chmod 777 /',
  'chown root',
  'curl | bash',
  'wget | bash',
  'eval',
  'exec',
];

/**
 * Default allowed commands for restricted mode
 */
const DEFAULT_ALLOWED_COMMANDS = [
  'npm',
  'node',
  'npx',
  'yarn',
  'pnpm',
  'git',
  'ls',
  'dir',
  'cd',
  'pwd',
  'cat',
  'less',
  'more',
  'head',
  'tail',
  'grep',
  'find',
  'echo',
  'print',
  'mkdir',
  'touch',
  'cp',
  'mv',
  'rm',
  'rmdir',
  'clear',
  'cls',
  'history',
  'which',
  'whereis',
  'type',
  'help',
  'man',
  'vi',
  'vim',
  'nano',
  'code',
  'exit',
  'export',
  'unset',
  'env',
  'set',
  'ps',
  'top',
  'htop',
  'kill',
  'killall',
  'df',
  'du',
  'free',
  'uname',
  'date',
  'uptime',
  'whoami',
  'id',
  'wc',
  'sort',
  'uniq',
  'cut',
  'awk',
  'sed',
  'tr',
  'xargs',
  'tar',
  'zip',
  'unzip',
  'curl',
  'wget',
  'jq',
  'python',
  'python3',
  'pip',
  'pip3',
  'node',
  'deno',
  'bun',
  'rustc',
  'cargo',
  'go',
  'java',
  'javac',
  'mvn',
  'gradle',
];

/**
 * Sensitive environment variables to filter
 */
const SENSITIVE_ENV_VARS = [
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'GITHUB_TOKEN',
  'GITLAB_TOKEN',
  'NPM_TOKEN',
  'API_KEY',
  'SECRET_KEY',
  'PRIVATE_KEY',
  'PASSWORD',
  'TOKEN',
  'CREDENTIAL',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'AZURE_API_KEY',
];

/**
 * Terminal Sandbox
 *
 * Provides security validation and filtering for terminal sessions.
 */
class TerminalSandbox {
  constructor(options = {}) {
    this.options = {
      // Security level: 'permissive', 'restricted', 'strict'
      securityLevel: options.securityLevel || 'permissive',

      // Allowed paths (null = project root only)
      allowedPaths: options.allowedPaths || [pathResolver.findProjectRoot()],

      // Command whitelist (null = no whitelist)
      allowedCommands: options.allowedCommands || null,

      // Command blacklist
      blockedCommands: options.blockedCommands || DEFAULT_BLOCKED_COMMANDS,

      // Restricted environment variables
      restrictedEnv: {
        PATH: this._getSafePath(),
        HOME: process.cwd(),
        ...(options.restrictedEnv || {}),
      },

      // Enable command audit logging
      auditLog: options.auditLog !== false,

      // Enable container isolation (requires Docker)
      useContainer: options.useContainer || false,

      // Maximum command execution time (ms)
      maxExecutionTime: options.maxExecutionTime || 300000, // 5 minutes

      // Allow network access
      allowNetwork: options.allowNetwork !== false,

      ...options,
    };

    // Configure based on security level
    this._applySecurityLevel();

    // Audit log
    this.auditLog = [];
  }

  /**
   * Validate command before execution
   * @param {string} command - Command to validate
   * @param {Object} context - Execution context
   * @returns {Object} Validation result
   */
  validateCommand(command, context = {}) {
    const normalizedCmd = command.toLowerCase().trim();
    const firstWord = normalizedCmd.split(/\s+/)[0];

    // Check blocklist first
    for (const blocked of this.options.blockedCommands) {
      if (normalizedCmd.includes(blocked.toLowerCase())) {
        const result = {
          valid: false,
          reason: `Command contains blocked pattern: ${blocked}`,
          code: 'BLOCKED_PATTERN',
        };
        this._auditLog(command, result, context);
        return result;
      }
    }

    // Check whitelist if set
    if (this.options.allowedCommands) {
      if (!this.options.allowedCommands.includes(firstWord)) {
        const result = {
          valid: false,
          reason: `Command not in whitelist: ${firstWord}`,
          code: 'NOT_WHITELISTED',
        };
        this._auditLog(command, result, context);
        return result;
      }
    }

    // Check network access if restricted
    if (!this.options.allowNetwork) {
      const networkCommands = ['curl', 'wget', 'npm install', 'yarn add', 'pip install'];
      for (const netCmd of networkCommands) {
        if (normalizedCmd.startsWith(netCmd)) {
          const result = {
            valid: false,
            reason: `Network access disabled: ${netCmd}`,
            code: 'NETWORK_BLOCKED',
          };
          this._auditLog(command, result, context);
          return result;
        }
      }
    }

    const result = { valid: true };
    this._auditLog(command, result, context);
    return result;
  }

  /**
   * Create sandboxed environment variables
   * @returns {Object} Filtered environment variables
   */
  getSandboxedEnv() {
    const env = { ...process.env };

    // Apply restrictions
    for (const [key, value] of Object.entries(this.options.restrictedEnv)) {
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }

    // Filter sensitive environment variables
    for (const sensitiveKey of SENSITIVE_ENV_VARS) {
      if (env[sensitiveKey]) {
        env[sensitiveKey] = '********';
      }
    }

    return env;
  }

  /**
   * Validate path is within allowed directories
   * @param {string} targetPath - Path to validate
   * @returns {Object} Validation result
   */
  validatePath(targetPath) {
    try {
      const resolved = path.resolve(targetPath);

      for (const allowed of this.options.allowedPaths) {
        const allowedResolved = path.resolve(allowed);
        if (resolved.startsWith(allowedResolved)) {
          return { valid: true, resolvedPath: resolved };
        }
      }

      return {
        valid: false,
        reason: `Path not allowed: ${targetPath}`,
        code: 'PATH_NOT_ALLOWED',
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Invalid path: ${error.message}`,
        code: 'INVALID_PATH',
      };
    }
  }

  /**
   * Sanitize command arguments
   * @param {string} command - Command with arguments
   * @returns {Object} Sanitized command info
   */
  sanitizeCommand(command) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    // Check for dangerous argument patterns
    const dangerousPatterns = [
      /\|.*rm/,           // piped to rm
      /&&.*rm/,           // rm after &&
      /;.*rm/,            // rm after ;
      /\$\(.*rm/,         // rm in command substitution
      /`.*rm/,            // rm in backticks
      />.*\/dev\/sda/,    // overwrite disk
      /:.*>.*\//,         // write to root
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          safe: false,
          reason: 'Dangerous argument pattern detected',
          command: cmd,
          args: [],
        };
      }
    }

    return {
      safe: true,
      command: cmd,
      args,
    };
  }

  /**
   * Get audit log
   * @param {Object} filter - Filter options
   * @returns {Array} Audit log entries
   */
  getAuditLog(filter = {}) {
    let log = [...this.auditLog];

    if (filter.validOnly) {
      log = log.filter(entry => entry.result.valid);
    }

    if (filter.invalidOnly) {
      log = log.filter(entry => !entry.result.valid);
    }

    if (filter.sessionId) {
      log = log.filter(entry => entry.context.sessionId === filter.sessionId);
    }

    if (filter.limit) {
      log = log.slice(-filter.limit);
    }

    return log;
  }

  /**
   * Clear audit log
   */
  clearAuditLog() {
    this.auditLog = [];
  }

  /**
   * Get sandbox configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      securityLevel: this.options.securityLevel,
      allowedPaths: this.options.allowedPaths,
      hasWhitelist: !!this.options.allowedCommands,
      whitelistCount: this.options.allowedCommands?.length || 0,
      blacklistCount: this.options.blockedCommands.length,
      auditLog: options.auditLog !== false,
      useContainer: this.options.useContainer,
      allowNetwork: this.options.allowNetwork,
      maxExecutionTime: this.options.maxExecutionTime,
    };
  }

  /**
   * Apply security level preset
   * @private
   */
  _applySecurityLevel() {
    switch (this.options.securityLevel) {
      case 'permissive':
        // No additional restrictions
        break;

      case 'restricted':
        // Use command whitelist
        this.options.allowedCommands = DEFAULT_ALLOWED_COMMANDS;
        this.options.allowNetwork = false;
        break;

      case 'strict':
        // Use whitelist, block network, restrict paths more
        this.options.allowedCommands = DEFAULT_ALLOWED_COMMANDS.filter(cmd =>
          !['curl', 'wget'].includes(cmd)
        );
        this.options.allowNetwork = false;
        this.options.maxExecutionTime = 60000; // 1 minute
        break;

      default:
        logger.warn('Unknown security level, using permissive', {
          level: this.options.securityLevel
        });
    }
  }

  /**
   * Get safe PATH for restricted environment
   * @private
   * @returns {string} Safe PATH string
   */
  _getSafePath() {
    if (process.platform === 'win32') {
      return 'C:\\Windows\\system32;C:\\Windows;C:\\Program Files\\nodejs';
    }

    // Unix-like systems
    const safePaths = [
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/local/sbin',
      '/usr/sbin',
      '/sbin',
    ];

    // Add common Node.js locations
    const nodePaths = [
      '/usr/local/bin',
      '/home/*/node_modules/.bin',
      '/node_modules/.bin',
    ];

    return [...safePaths, ...nodePaths].join(':');
  }

  /**
   * Log command validation to audit log
   * @private
   */
  _auditLog(command, result, context) {
    if (!this.options.auditLog) return;

    this.auditLog.push({
      timestamp: new Date().toISOString(),
      command: command.substring(0, 200), // Truncate long commands
      result: {
        valid: result.valid,
        reason: result.reason,
        code: result.code,
      },
      context: {
        sessionId: context.sessionId,
        userId: context.userId,
      },
    });

    // Limit audit log size
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }

    // Log to system logger
    if (!result.valid) {
      logger.warn('Command blocked by sandbox', {
        command: command.substring(0, 100),
        reason: result.reason,
        code: result.code,
        sessionId: context.sessionId,
      });
    }
  }
}

/**
 * Create a sandbox instance with preset configuration
 * @param {string} level - Security level ('permissive', 'restricted', 'strict')
 * @param {Object} options - Additional options
 * @returns {TerminalSandbox} Sandbox instance
 */
function createSandbox(level, options = {}) {
  return new TerminalSandbox({
    securityLevel: level,
    ...options,
  });
}

/**
 * Get default blocked commands
 * @returns {Array} Default blocked command patterns
 */
function getDefaultBlockedCommands() {
  return [...DEFAULT_BLOCKED_COMMANDS];
}

/**
 * Get default allowed commands
 * @returns {Array} Default allowed command patterns
 */
function getDefaultAllowedCommands() {
  return [...DEFAULT_ALLOWED_COMMANDS];
}

module.exports = {
  TerminalSandbox,
  createSandbox,
  getDefaultBlockedCommands,
  getDefaultAllowedCommands,
};
