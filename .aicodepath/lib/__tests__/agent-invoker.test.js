/**
 * Unit tests for AgentInvoker
 *
 * Tests:
 * - Invoke agent with task
 * - Build prompts correctly
 * - Check context limits
 * - Write output to file/stdout
 * - Log execution to database
 * - Handle errors gracefully
 *
 * @module lib/__tests__/agent-invoker.test.js
 */

const AgentInvoker = require('../agent-invoker');
const AgentLoader = require('../agent-loader');
const fs = require('fs').promises;
const path = require('path');

describe('AgentInvoker', () => {
  let invoker;
  let mockContextManager;
  let mockDb;

  beforeEach(() => {
    // Mock context manager
    mockContextManager = {
      checkThreshold: jest.fn((tokens, limit) => {
        if (tokens > limit) return 'exceeded';
        if (tokens > limit * 0.7) return 'critical';
        if (tokens > limit * 0.6) return 'warning';
        return 'safe';
      }),
      trackUsage: jest.fn()
    };

    // Mock database
    mockDb = {
      prepare: jest.fn(() => ({
        run: jest.fn()
      }))
    };

    const loader = new AgentLoader();
    invoker = new AgentInvoker({
      loader,
      contextManager: mockContextManager,
      db: mockDb
    });
  });

  afterEach(async () => {
    // Cleanup test output files
    try {
      const files = await fs.readdir('/tmp');
      const testFiles = files.filter(f => f.startsWith('aicodepath-agent-'));
      for (const file of testFiles) {
        await fs.unlink(path.join('/tmp', file));
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('invoke', () => {
    it('should invoke an agent successfully', async () => {
      const result = await invoker.invoke('architect', 'Design a microservices architecture', {
        mode: 'stdout'
      });

      expect(result.success).toBe(true);
      expect(result.agent).toBe('architect');
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should load agent definition', async () => {
      const result = await invoker.invoke('backend-architect', 'Design REST API', {
        mode: 'stdout'
      });

      expect(result.success).toBe(true);
      expect(result.agent).toBe('backend-architect');
    });

    it('should estimate tokens from prompt length', async () => {
      const result = await invoker.invoke('qa', 'Create test plan', {
        mode: 'stdout'
      });

      // Tokens should be roughly prompt.length / 4
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(typeof result.tokensUsed).toBe('number');
    });

    it('should track context usage if context manager available', async () => {
      await invoker.invoke('security', 'Security audit', {
        mode: 'stdout'
      });

      expect(mockContextManager.checkThreshold).toHaveBeenCalled();
      expect(mockContextManager.trackUsage).toHaveBeenCalledWith('security', expect.any(Number));
    });

    it('should throw error if context limit exceeded', async () => {
      // Mock context manager to always return 'exceeded'
      mockContextManager.checkThreshold.mockReturnValue('exceeded');

      await expect(
        invoker.invoke('architect', 'Very long task description', {
          mode: 'stdout'
        })
      ).rejects.toThrow('Context limit exceeded');
    });

    it('should warn if context usage critical', async () => {
      // Mock console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Mock critical threshold
      mockContextManager.checkThreshold.mockReturnValue('critical');

      await invoker.invoke('architect', 'Test task', {
        mode: 'stdout'
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Context usage critical'));

      warnSpy.mockRestore();
    });

    it('should log execution to database if available', async () => {
      await invoker.invoke('code-reviewer', 'Review code', {
        mode: 'stdout'
      });

      expect(mockDb.prepare).toHaveBeenCalled();
      const prepareCall = mockDb.prepare.mock.calls[0][0];
      expect(prepareCall).toContain('INSERT INTO agent_executions');
    });

    it('should log failure to database on error', async () => {
      // Force an error by providing invalid agent name
      try {
        await invoker.invoke('nonexistent-agent', 'Test task', {
          mode: 'stdout'
        });
      } catch (error) {
        // Expected to fail
      }

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should handle invocation without context manager', async () => {
      const invokerNoContext = new AgentInvoker({
        loader: new AgentLoader()
      });

      const result = await invokerNoContext.invoke('architect', 'Test task', {
        mode: 'stdout'
      });

      expect(result.success).toBe(true);
    });

    it('should handle invocation without database', async () => {
      const invokerNoDb = new AgentInvoker({
        loader: new AgentLoader(),
        contextManager: mockContextManager
      });

      const result = await invokerNoDb.invoke('architect', 'Test task', {
        mode: 'stdout'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('buildPrompt', () => {
    it('should build complete prompt with agent guidelines', () => {
      const agent = {
        name: 'test-agent',
        guidelines: '# Test Agent\n\nTest guidelines.',
        capabilities: ['test'],
        triggers: ['test']
      };

      const prompt = invoker.buildPrompt(agent, 'Test task', {});

      expect(prompt).toContain('# Agent Guidelines');
      expect(prompt).toContain('# Test Agent');
      expect(prompt).toContain('# Current Task');
      expect(prompt).toContain('Test task');
      expect(prompt).toContain('# Execution');
    });

    it('should include file path context if provided', () => {
      const agent = {
        name: 'test-agent',
        guidelines: 'Guidelines',
        capabilities: [],
        triggers: []
      };

      const prompt = invoker.buildPrompt(agent, 'Test task', {
        filePath: 'src/test.ts'
      });

      expect(prompt).toContain('# Context');
      expect(prompt).toContain('**File:** src/test.ts');
    });

    it('should include code snippet context if provided', () => {
      const agent = {
        name: 'test-agent',
        guidelines: 'Guidelines',
        capabilities: [],
        triggers: []
      };

      const prompt = invoker.buildPrompt(agent, 'Test task', {
        codeSnippet: 'function test() {}'
      });

      expect(prompt).toContain('```');
      expect(prompt).toContain('function test() {}');
    });

    it('should include requirements context if provided', () => {
      const agent = {
        name: 'test-agent',
        guidelines: 'Guidelines',
        capabilities: [],
        triggers: []
      };

      const prompt = invoker.buildPrompt(agent, 'Test task', {
        requirements: 'Must support authentication'
      });

      expect(prompt).toContain('**Requirements:**');
      expect(prompt).toContain('Must support authentication');
    });

    it('should format agent name in uppercase in execution section', () => {
      const agent = {
        name: 'backend-architect',
        guidelines: 'Guidelines',
        capabilities: [],
        triggers: []
      };

      const prompt = invoker.buildPrompt(agent, 'Test task', {});

      expect(prompt).toContain('Act as the **BACKEND-ARCHITECT**');
    });
  });

  describe('writeOutput', () => {
    it('should write to stdout mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const outputPath = await invoker.writeOutput(
        'Test content',
        'stdout',
        null,
        'test-agent'
      );

      expect(outputPath).toBe('stdout');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should write to file mode with custom path', async () => {
      const testPath = '/tmp/test-agent-output.md';

      const outputPath = await invoker.writeOutput(
        'Test content',
        'file',
        testPath,
        'test-agent'
      );

      expect(outputPath).toBe(testPath);

      // Verify file was created
      const content = await fs.readFile(testPath, 'utf8');
      expect(content).toBe('Test content');
    });

    it('should write to file mode with default path', async () => {
      const outputPath = await invoker.writeOutput(
        'Test content',
        'file',
        null,
        'test-agent'
      );

      expect(outputPath).toContain('/tmp/aicodepath-agent-test-agent-');
      expect(outputPath).toContain('.md');

      // Verify file was created
      const content = await fs.readFile(outputPath, 'utf8');
      expect(content).toBe('Test content');
    });

    it('should create directory if it does not exist', async () => {
      const testPath = '/tmp/nested/dir/test-output.md';

      const outputPath = await invoker.writeOutput(
        'Test content',
        'file',
        testPath,
        'test-agent'
      );

      expect(outputPath).toBe(testPath);

      // Verify file was created
      const content = await fs.readFile(testPath, 'utf8');
      expect(content).toBe('Test content');

      // Cleanup
      await fs.rm('/tmp/nested', { recursive: true, force: true });
    });

    it('should handle clipboard mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const outputPath = await invoker.writeOutput(
        'Test content',
        'clipboard',
        null,
        'test-agent'
      );

      expect(outputPath).toContain('/tmp/aicodepath-agent-test-agent-');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📋 Agent prompt written to:'));

      consoleSpy.mockRestore();
    });
  });

  describe('getDefaultOutputPath', () => {
    it('should generate default output path with timestamp', () => {
      const path1 = invoker.getDefaultOutputPath('test-agent');
      const path2 = invoker.getDefaultOutputPath('test-agent');

      expect(path1).toContain('/tmp/aicodepath-agent-test-agent-');
      expect(path2).toContain('/tmp/aicodepath-agent-test-agent-');

      // Paths should be different (different timestamps)
      expect(path1).not.toBe(path2);
    });

    it('should include agent name in path', () => {
      const path = invoker.getDefaultOutputPath('backend-architect');

      expect(path).toContain('backend-architect');
    });

    it('should use .md extension', () => {
      const path = invoker.getDefaultOutputPath('test-agent');

      expect(path).toEndWith('.md');
    });
  });

  describe('logExecution', () => {
    it('should log execution to database', async () => {
      await invoker.logExecution({
        agent_name: 'test-agent',
        task_description: 'Test task',
        output_path: '/tmp/output.md',
        tokens_used: 1000,
        duration_ms: 500,
        status: 'success'
      });

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockDb.prepare().run).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await invoker.logExecution({
        agent_name: 'test-agent',
        status: 'success'
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to log agent execution'));

      warnSpy.mockRestore();
    });

    it('should not log if database not available', async () => {
      const invokerNoDb = new AgentInvoker({
        loader: new AgentLoader()
      });

      // Should not throw error
      await invokerNoDb.logExecution({
        agent_name: 'test-agent',
        status: 'success'
      });
    });
  });
});
