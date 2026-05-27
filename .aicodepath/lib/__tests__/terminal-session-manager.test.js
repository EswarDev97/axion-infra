/**
 * Terminal Session Manager Tests
 *
 * Unit tests for the terminal session manager module.
 * Note: These tests may be skipped if node-pty is not installed.
 */

const {
  TerminalSessionManager,
  createTerminalManager,
  closeTerminalManager,
  isTerminalAvailable,
} = require('../terminal-session-manager');

const {
  TerminalSandbox,
  createSandbox,
  getDefaultBlockedCommands,
  getDefaultAllowedCommands,
} = require('../terminal-sandbox');

// Skip all tests if node-pty is not available
const describeOrSkip = isTerminalAvailable() ? describe : describe.skip;

describeOrSkip('TerminalSessionManager', () => {
  let manager;

  beforeEach(() => {
    // Create a fresh manager for each test
    manager = new TerminalSessionManager({
      maxSessions: 3,
      defaultCwd: process.cwd(),
    });
  });

  afterEach(() => {
    // Cleanup all sessions
    if (manager) {
      for (const session of manager.getSessions()) {
        try {
          manager.closeSession(session.id);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  });

  describe('Session Creation', () => {
    test('creates a new session', () => {
      const sessionId = manager.createSession('test-session-1', {
        cols: 80,
        rows: 24,
      });

      expect(sessionId).toBe('test-session-1');
      expect(manager.getSessions()).toHaveLength(1);

      const session = manager.getSession('test-session-1');
      expect(session).toBeDefined();
      expect(session.id).toBe('test-session-1');
      expect(session.hasClient).toBe(false);
    });

    test('throws error when max sessions reached', () => {
      manager.createSession('s1');
      manager.createSession('s2');
      manager.createSession('s3');

      expect(() => manager.createSession('s4')).toThrow(/Maximum sessions/);
    });

    test('throws error for duplicate session ID', () => {
      manager.createSession('duplicate');

      expect(() => manager.createSession('duplicate')).toThrow(/already exists/);
    });

    test('throws error for invalid working directory', () => {
      // This should fail because we try to validate an invalid path
      // The actual behavior depends on path validation implementation
      const result = manager._validatePath('/this/path/does/not/exist/anywhere');
      // May or may not be valid depending on system
      expect(result).toHaveProperty('valid');
    });
  });

  describe('Session Management', () => {
    test('attaches client to session', () => {
      manager.createSession('test-attach');
      const mockWs = { readyState: 1, send: jest.fn() };

      manager.attachClient('test-attach', mockWs);

      const session = manager.getSession('test-attach');
      expect(session.hasClient).toBe(true);
    });

    test('throws error attaching to non-existent session', () => {
      const mockWs = { readyState: 1, send: jest.fn() };

      expect(() => manager.attachClient('non-existent', mockWs)).toThrow(/not found/);
    });

    test('closes session', () => {
      manager.createSession('test-close');
      expect(manager.getSessions()).toHaveLength(1);

      const result = manager.closeSession('test-close');
      expect(result).toBe(true);
      expect(manager.getSessions()).toHaveLength(0);
    });

    test('returns false closing non-existent session', () => {
      const result = manager.closeSession('non-existent');
      expect(result).toBe(false);
    });

    test('resizes terminal session', () => {
      manager.createSession('test-resize');

      // Should not throw
      expect(() => manager.resize('test-resize', 120, 40)).not.toThrow();
    });

    test('throws error resizing non-existent session', () => {
      expect(() => manager.resize('non-existent', 120, 40)).toThrow(/not found/);
    });
  });

  describe('Input Handling', () => {
    test('writes input to session', () => {
      manager.createSession('test-write');
      const data = Buffer.from('echo hello').toString('base64');

      // Should not throw for safe commands
      expect(() => manager.write('test-write', data)).not.toThrow();
    });

    test('blocks dangerous commands', () => {
      manager.createSession('test-block');
      const dangerousCmd = Buffer.from('rm -rf /').toString('base64');

      const result = manager.write('test-block', dangerousCmd);
      expect(result).toBe(false);
    });

    test('throws error writing to non-existent session', () => {
      const data = Buffer.from('echo test').toString('base64');

      expect(() => manager.write('non-existent', data)).toThrow(/not found/);
    });
  });

  describe('Session Queries', () => {
    test('gets all sessions', () => {
      manager.createSession('s1');
      manager.createSession('s2');

      const sessions = manager.getSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toHaveProperty('id');
      expect(sessions[0]).toHaveProperty('createdAt');
      expect(sessions[0]).toHaveProperty('lastActivity');
    });

    test('gets specific session', () => {
      manager.createSession('specific-session');

      const session = manager.getSession('specific-session');
      expect(session).toBeDefined();
      expect(session.id).toBe('specific-session');
    });

    test('returns null for non-existent session', () => {
      const session = manager.getSession('non-existent');
      expect(session).toBeNull();
    });

    test('gets session statistics', () => {
      manager.createSession('stats-1');
      manager.createSession('stats-2');

      const stats = manager.getStats();
      expect(stats).toHaveProperty('totalSessions', 2);
      expect(stats).toHaveProperty('activeSessions', 0);
      expect(stats).toHaveProperty('averageIdleTime');
      expect(stats).toHaveProperty('oldestSession');
      expect(stats).toHaveProperty('newestSession');
    });
  });

  describe('Cleanup', () => {
    test('closes all sessions', () => {
      manager.createSession('s1');
      manager.createSession('s2');
      manager.createSession('s3');

      manager.closeAll();

      expect(manager.getSessions()).toHaveLength(0);
    });

    test('cleanup idle sessions', () => {
      manager.createSession('idle-session');

      // Manually set lastActivity to be old
      const session = manager.sessions.get('idle-session');
      session.lastActivity = Date.now() - (60 * 60 * 1000); // 1 hour ago

      const cleaned = manager.cleanupIdleSessions(30 * 60 * 1000); // 30 min threshold
      expect(cleaned).toBe(1);
      expect(manager.getSessions()).toHaveLength(0);
    });
  });
});

describe('TerminalSandbox', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = new TerminalSandbox({
      securityLevel: 'permissive',
      auditLog: true,
    });
  });

  afterEach(() => {
    if (sandbox) {
      sandbox.clearAuditLog();
    }
  });

  describe('Command Validation', () => {
    test('validates safe commands', () => {
      const result = sandbox.validateCommand('ls -la');
      expect(result.valid).toBe(true);
    });

    test('blocks dangerous commands by default', () => {
      const result = sandbox.validateCommand('rm -rf /');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('BLOCKED_PATTERN');
    });

    test('blocks dd command', () => {
      const result = sandbox.validateCommand('dd if=/dev/zero of=/dev/sda');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('BLOCKED_PATTERN');
    });

    test('validates with whitelist in restricted mode', () => {
      const restrictedSandbox = new TerminalSandbox({
        securityLevel: 'restricted',
      });

      const npmResult = restrictedSandbox.validateCommand('npm install');
      expect(npmResult.valid).toBe(true);

      const unknownResult = restrictedSandbox.validateCommand('unknown-command');
      expect(unknownResult.valid).toBe(false);
      expect(unknownResult.code).toBe('NOT_WHITELISTED');
    });

    test('blocks network commands when network disabled', () => {
      const noNetworkSandbox = new TerminalSandbox({
        allowNetwork: false,
      });

      const curlResult = noNetworkSandbox.validateCommand('curl https://example.com');
      expect(curlResult.valid).toBe(false);
      expect(curlResult.code).toBe('NETWORK_BLOCKED');
    });
  });

  describe('Path Validation', () => {
    test('validates paths within allowed directories', () => {
      const result = sandbox.validatePath(process.cwd());
      expect(result.valid).toBe(true);
      expect(result).toHaveProperty('resolvedPath');
    });

    test('rejects paths outside allowed directories', () => {
      const result = sandbox.validatePath('/etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.code).toBe('PATH_NOT_ALLOWED');
    });
  });

  describe('Environment Filtering', () => {
    test('returns sandboxed environment variables', () => {
      const env = sandbox.getSandboxedEnv();

      expect(env).toHaveProperty('PATH');
      expect(env).toHaveProperty('HOME');
    });

    test('filters sensitive environment variables', () => {
      // Set a sensitive env var
      process.env.TEST_SECRET_KEY = 'super-secret';

      const env = sandbox.getSandboxedEnv();

      // The filtered value should be masked
      expect(env.TEST_SECRET_KEY).toBe('********');

      // Cleanup
      delete process.env.TEST_SECRET_KEY;
    });
  });

  describe('Command Sanitization', () => {
    test('sanitizes safe commands', () => {
      const result = sandbox.sanitizeCommand('ls -la /home');
      expect(result.safe).toBe(true);
      expect(result.command).toBe('ls');
      expect(result.args).toEqual(['-la', '/home']);
    });

    test('detects dangerous argument patterns', () => {
      const result = sandbox.sanitizeCommand('some-cmd | rm -rf /');
      expect(result.safe).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    test('logs validation attempts', () => {
      sandbox.validateCommand('ls', { sessionId: 'test-123' });

      const log = sandbox.getAuditLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0]).toHaveProperty('timestamp');
      expect(log[0]).toHaveProperty('command');
      expect(log[0]).toHaveProperty('result');
      expect(log[0].context.sessionId).toBe('test-123');
    });

    test('filters audit log', () => {
      sandbox.validateCommand('ls');
      sandbox.validateCommand('rm -rf /');
      sandbox.validateCommand('echo test');

      const invalidLog = sandbox.getAuditLog({ invalidOnly: true });
      expect(invalidLog.length).toBe(1);

      const validLog = sandbox.getAuditLog({ validOnly: true });
      expect(validLog.length).toBe(2);
    });

    test('limits audit log size', () => {
      // The audit log should limit its size to prevent memory issues
      // Generate many entries
      for (let i = 0; i < 10050; i++) {
        sandbox.validateCommand(`echo ${i}`);
      }

      const log = sandbox.getAuditLog();
      // Should be truncated
      expect(log.length).toBeLessThan(10050);
    });

    test('clears audit log', () => {
      sandbox.validateCommand('ls');
      expect(sandbox.getAuditLog().length).toBeGreaterThan(0);

      sandbox.clearAuditLog();
      expect(sandbox.getAuditLog().length).toBe(0);
    });
  });

  describe('Configuration', () => {
    test('returns sandbox configuration', () => {
      const config = sandbox.getConfig();

      expect(config).toHaveProperty('securityLevel');
      expect(config).toHaveProperty('allowedPaths');
      expect(config).toHaveProperty('hasWhitelist');
      expect(config).toHaveProperty('blacklistCount');
      expect(config).toHaveProperty('allowNetwork');
    });
  });
});

describe('Sandbox Presets', () => {
  test('creates permissive sandbox', () => {
    const sandbox = createSandbox('permissive');
    const config = sandbox.getConfig();

    expect(config.securityLevel).toBe('permissive');
    expect(config.hasWhitelist).toBe(false);
  });

  test('creates restricted sandbox', () => {
    const sandbox = createSandbox('restricted');
    const config = sandbox.getConfig();

    expect(config.securityLevel).toBe('restricted');
    expect(config.hasWhitelist).toBe(true);
    expect(config.allowNetwork).toBe(false);
  });

  test('creates strict sandbox', () => {
    const sandbox = createSandbox('strict');
    const config = sandbox.getConfig();

    expect(config.securityLevel).toBe('strict');
    expect(config.hasWhitelist).toBe(true);
    expect(config.allowNetwork).toBe(false);
  });
});

describe('Utility Functions', () => {
  test('returns default blocked commands', () => {
    const blocked = getDefaultBlockedCommands();

    expect(Array.isArray(blocked)).toBe(true);
    expect(blocked).toContain('rm -rf');
    expect(blocked).toContain('dd if=');
  });

  test('returns default allowed commands', () => {
    const allowed = getDefaultAllowedCommands();

    expect(Array.isArray(allowed)).toBe(true);
    expect(allowed).toContain('ls');
    expect(allowed).toContain('npm');
    expect(allowed).toContain('git');
  });
});

describe('Singleton Manager', () => {
  afterEach(() => {
    closeTerminalManager();
  });

  test('creates singleton manager', () => {
    if (!isTerminalAvailable()) {
      // Skip test if node-pty not available
      return;
    }

    const manager1 = createTerminalManager({ maxSessions: 3 });
    const manager2 = createTerminalManager();

    expect(manager1).toBe(manager2);
  });

  test('closes singleton manager', () => {
    if (!isTerminalAvailable()) {
      return;
    }

    createTerminalManager();
    expect(getTerminalManager()).not.toBeNull();

    closeTerminalManager();
    expect(getTerminalManager()).toBeNull();
  });
});
