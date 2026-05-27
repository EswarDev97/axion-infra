/**
 * Unit tests for ContextManager
 *
 * Tests:
 * - Load configuration from file
 * - Estimate tokens from text
 * - Check threshold status (safe, warning, critical, exceeded)
 * - Track usage to database
 * - Apply priority loading strategy
 * - Compact context (summarize middle)
 * - Get usage statistics
 * - Get context health metrics
 *
 * @module lib/__tests__/context-manager.test.js
 */

const ContextManager = require('../context-manager');
const fs = require('fs').promises;
const path = require('path');

describe('ContextManager', () => {
  let manager;
  let mockDb;

  beforeEach(() => {
    // Mock database
    mockDb = {
      prepare: jest.fn(() => ({
        run: jest.fn(),
        get: jest.fn(() => ({
          total_invocations: 100,
          total_tokens: 500000,
          avg_tokens: 5000,
          safe_count: 60,
          warning_count: 25,
          critical_count: 10,
          exceeded_count: 5,
          total_compactions: 8
        })),
        all: jest.fn(() => [
          {
            agent_name: 'backend-architect',
            total_invocations: 50,
            total_tokens: 250000,
            avg_tokens: 5000,
            max_tokens: 15000,
            compactions_triggered: 3,
            unique_statuses: 3
          }
        ])
      })),
      close: jest.fn()
    };

    manager = new ContextManager({ db: mockDb });
  });

  describe('loadConfig', () => {
    it('should load configuration from file', async () => {
      const config = await manager.loadConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.thresholds).toBeDefined();
      expect(config.thresholds.warning).toBe(0.6);
      expect(config.thresholds.critical).toBe(0.7);
      expect(config.thresholds.maximum).toBe(0.85);
    });

    it('should cache loaded configuration', async () => {
      const config1 = await manager.loadConfig();
      const config2 = await manager.loadConfig();

      expect(config1).toBe(config2); // Same object reference
    });

    it('should use default config if file not found', async () => {
      const managerNoFile = new ContextManager({
        configPath: '/nonexistent/path.json',
        db: mockDb
      });

      const config = await managerNoFile.loadConfig();

      expect(config).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.strategy).toBe('hybrid');
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = manager.getDefaultConfig();

      expect(config.enabled).toBe(true);
      expect(config.strategy).toBe('hybrid');
      expect(config.thresholds.warning).toBe(0.60);
      expect(config.thresholds.critical).toBe(0.70);
      expect(config.thresholds.maximum).toBe(0.85);
    });

    it('should include model limits', () => {
      const config = manager.getDefaultConfig();

      expect(config.model_limits).toBeDefined();
      expect(config.model_limits['claude-sonnet-4']).toBe(200000);
      expect(config.model_limits['gpt-4']).toBe(128000);
      expect(config.model_limits['gemini-pro']).toBe(1000000);
    });

    it('should include optimization strategies', () => {
      const config = manager.getDefaultConfig();

      expect(config.strategies.priority_loading.enabled).toBe(true);
      expect(config.strategies.compaction.enabled).toBe(true);
      expect(config.strategies.caching.enabled).toBe(false);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens at ~4 chars per token', () => {
      const text = 'This is a test string with 40 characters';
      const tokens = manager.estimateTokens(text);

      expect(tokens).toBe(Math.ceil(text.length / 4));
      expect(tokens).toBe(11); // 41 chars / 4 = 10.25 → 11
    });

    it('should handle empty strings', () => {
      expect(manager.estimateTokens('')).toBe(0);
      expect(manager.estimateTokens(null)).toBe(0);
      expect(manager.estimateTokens(undefined)).toBe(0);
    });

    it('should handle long text', () => {
      const longText = 'a'.repeat(10000);
      const tokens = manager.estimateTokens(longText);

      expect(tokens).toBe(2500); // 10000 / 4 = 2500
    });
  });

  describe('getModelLimit', () => {
    beforeEach(async () => {
      await manager.loadConfig();
    });

    it('should get limit for Claude Sonnet 4', () => {
      const limit = manager.getModelLimit('claude-sonnet-4');

      expect(limit).toBe(200000);
    });

    it('should get limit for GPT-4', () => {
      const limit = manager.getModelLimit('gpt-4');

      expect(limit).toBe(128000);
    });

    it('should get limit for Gemini Pro', () => {
      const limit = manager.getModelLimit('gemini-pro');

      expect(limit).toBe(1000000);
    });

    it('should default to 200k for unknown models', () => {
      const limit = manager.getModelLimit('unknown-model');

      expect(limit).toBe(200000);
    });

    it('should use default model if not specified', () => {
      const limit = manager.getModelLimit();

      expect(limit).toBe(200000); // claude-sonnet-4 default
    });
  });

  describe('checkThreshold', () => {
    beforeEach(async () => {
      await manager.loadConfig();
    });

    it('should return "safe" for low usage (< 60%)', () => {
      const status = manager.checkThreshold(50000, 200000);

      expect(status).toBe('safe'); // 25%
    });

    it('should return "warning" for moderate usage (60-70%)', () => {
      const status = manager.checkThreshold(130000, 200000);

      expect(status).toBe('warning'); // 65%
    });

    it('should return "critical" for high usage (70-85%)', () => {
      const status = manager.checkThreshold(150000, 200000);

      expect(status).toBe('critical'); // 75%
    });

    it('should return "exceeded" for excessive usage (> 85%)', () => {
      const status = manager.checkThreshold(180000, 200000);

      expect(status).toBe('exceeded'); // 90%
    });

    it('should handle exact threshold boundaries', () => {
      expect(manager.checkThreshold(120000, 200000)).toBe('warning'); // exactly 60%
      expect(manager.checkThreshold(140000, 200000)).toBe('critical'); // exactly 70%
      expect(manager.checkThreshold(170000, 200000)).toBe('exceeded'); // exactly 85%
    });

    it('should use default limit if not provided', () => {
      const status = manager.checkThreshold(150000);

      expect(status).toBe('critical');
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate usage percentage', () => {
      expect(manager.getUsagePercentage(50000, 200000)).toBe(25);
      expect(manager.getUsagePercentage(100000, 200000)).toBe(50);
      expect(manager.getUsagePercentage(150000, 200000)).toBe(75);
      expect(manager.getUsagePercentage(200000, 200000)).toBe(100);
    });

    it('should round to nearest integer', () => {
      expect(manager.getUsagePercentage(66666, 200000)).toBe(33); // 33.333%
      expect(manager.getUsagePercentage(133333, 200000)).toBe(67); // 66.6665%
    });
  });

  describe('getStatusEmoji', () => {
    it('should return correct emojis for each status', () => {
      expect(manager.getStatusEmoji('safe')).toBe('🟢');
      expect(manager.getStatusEmoji('warning')).toBe('🟡');
      expect(manager.getStatusEmoji('critical')).toBe('🟠');
      expect(manager.getStatusEmoji('exceeded')).toBe('🔴');
      expect(manager.getStatusEmoji('unknown')).toBe('⚪');
    });
  });

  describe('trackUsage', () => {
    beforeEach(async () => {
      await manager.loadConfig();
    });

    it('should track usage to database', async () => {
      await manager.trackUsage('test-agent', 50000);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockDb.prepare().run).toHaveBeenCalled();
    });

    it('should include threshold status', async () => {
      await manager.trackUsage('test-agent', 150000);

      const prepareCall = mockDb.prepare.mock.calls[0][0];
      expect(prepareCall).toContain('threshold_status');

      const runCall = mockDb.prepare().run.mock.calls[0];
      expect(runCall[3]).toBe('critical'); // 75% of 200k
    });

    it('should flag compaction triggered at critical threshold', async () => {
      await manager.trackUsage('test-agent', 150000);

      const runCall = mockDb.prepare().run.mock.calls[0];
      expect(runCall[4]).toBe(1); // compaction_triggered = true
    });

    it('should not flag compaction for safe usage', async () => {
      await manager.trackUsage('test-agent', 50000);

      const runCall = mockDb.prepare().run.mock.calls[0];
      expect(runCall[4]).toBe(0); // compaction_triggered = false
    });

    it('should handle database errors gracefully', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await manager.trackUsage('test-agent', 50000);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to track context usage'));

      warnSpy.mockRestore();
    });

    it('should not track if disabled in config', async () => {
      manager.config.enabled = false;

      await manager.trackUsage('test-agent', 50000);

      expect(mockDb.prepare).not.toHaveBeenCalled();
    });
  });

  describe('applyPriorityLoading', () => {
    beforeEach(async () => {
      await manager.loadConfig();
    });

    it('should place priority items at start', () => {
      const context = {
        items: [
          { path: 'src/file1.ts', content: 'code' },
          { path: 'guidelines/rules.json', content: 'rules' },
          { path: 'src/file2.ts', content: 'code' },
          { path: 'CLAUDE.md', content: 'guide' }
        ]
      };

      const result = manager.applyPriorityLoading(context);

      expect(result.items[0].path).toBe('guidelines/rules.json');
      expect(result.items[1].path).toBe('CLAUDE.md');
      expect(result.items[2].path).toBe('src/file1.ts');
      expect(result.items[3].path).toBe('src/file2.ts');
    });

    it('should not reorder if disabled', () => {
      manager.config.strategies.priority_loading.enabled = false;

      const context = {
        items: [
          { path: 'src/file1.ts', content: 'code' },
          { path: 'guidelines/rules.json', content: 'rules' }
        ]
      };

      const result = manager.applyPriorityLoading(context);

      expect(result.items[0].path).toBe('src/file1.ts');
      expect(result.items[1].path).toBe('guidelines/rules.json');
    });
  });

  describe('compact', () => {
    beforeEach(async () => {
      await manager.loadConfig();
    });

    it('should compact context when over target', async () => {
      const longContent = 'a'.repeat(100000); // ~25k tokens each

      const context = {
        items: [
          { path: 'file1.ts', content: longContent },
          { path: 'file2.ts', content: longContent },
          { path: 'file3.ts', content: longContent },
          { path: 'file4.ts', content: longContent },
          { path: 'file5.ts', content: longContent }
        ]
      };

      const result = await manager.compact(context, 60000); // Target 60k tokens

      expect(result.compacted).toBe(true);
      expect(result.originalTokens).toBeGreaterThan(result.compactedTokens);
    });

    it('should keep first 30% and last 30% of items', async () => {
      const context = {
        items: Array.from({ length: 10 }, (_, i) => ({
          path: `file${i}.ts`,
          content: 'a'.repeat(100000)
        }))
      };

      const result = await manager.compact(context, 60000);

      // Should have: 3 start items + 1 summary + 3 end items = 7 items
      expect(result.items.length).toBe(7);
      expect(result.items[3].path).toBe('[COMPACTED_CONTEXT]');
    });

    it('should not compact if already under target', async () => {
      const context = {
        items: [
          { path: 'file1.ts', content: 'small' },
          { path: 'file2.ts', content: 'content' }
        ]
      };

      const result = await manager.compact(context, 1000000);

      expect(result.compacted).toBeUndefined();
      expect(result.items.length).toBe(2);
    });

    it('should not compact if disabled', async () => {
      manager.config.strategies.compaction.enabled = false;

      const longContent = 'a'.repeat(100000);
      const context = {
        items: Array.from({ length: 10 }, (_, i) => ({
          path: `file${i}.ts`,
          content: longContent
        }))
      };

      const result = await manager.compact(context, 10000);

      expect(result.compacted).toBeUndefined();
    });
  });

  describe('getUsageStats', () => {
    it('should get usage statistics from database', async () => {
      const stats = await manager.getUsageStats();

      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].agent_name).toBe('backend-architect');
    });

    it('should filter by agent name if provided', async () => {
      await manager.getUsageStats('backend-architect');

      const prepareCall = mockDb.prepare.mock.calls[0][0];
      expect(prepareCall).toContain('WHERE agent_name = ?');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const stats = await manager.getUsageStats();

      expect(stats).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('getContextHealth', () => {
    it('should calculate health score', async () => {
      const health = await manager.getContextHealth();

      expect(health).toBeDefined();
      expect(health.health_score).toBeDefined();
      expect(health.health_status).toBeDefined();
      expect(health.total_invocations).toBe(100);
    });

    it('should classify as healthy (>= 80%)', async () => {
      mockDb.prepare().get.mockReturnValue({
        total_invocations: 100,
        safe_count: 85,
        warning_count: 10,
        critical_count: 5,
        exceeded_count: 0
      });

      const health = await manager.getContextHealth();

      expect(health.health_status).toBe('healthy');
      expect(health.health_score).toBeGreaterThanOrEqual(80);
    });

    it('should classify as moderate (60-79%)', async () => {
      mockDb.prepare().get.mockReturnValue({
        total_invocations: 100,
        safe_count: 50,
        warning_count: 30,
        critical_count: 15,
        exceeded_count: 5
      });

      const health = await manager.getContextHealth();

      expect(health.health_status).toBe('moderate');
    });

    it('should classify as poor (< 60%)', async () => {
      mockDb.prepare().get.mockReturnValue({
        total_invocations: 100,
        safe_count: 20,
        warning_count: 20,
        critical_count: 30,
        exceeded_count: 30
      });

      const health = await manager.getContextHealth();

      expect(health.health_status).toBe('poor');
    });
  });

  describe('clearOldRecords', () => {
    it('should delete old records', async () => {
      mockDb.prepare().run.mockReturnValue({ changes: 42 });

      const deleted = await manager.clearOldRecords(30);

      expect(deleted).toBe(42);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('Database error');
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const deleted = await manager.clearOldRecords(30);

      expect(deleted).toBe(0);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
