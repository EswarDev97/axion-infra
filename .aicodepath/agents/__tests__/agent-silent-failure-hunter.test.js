/**
 * Test: aicodepath-silent-failure-hunter agent structural contract
 *
 * Sprint: Specialist Review Agents (2026-04-20)
 * Plan: aicodepath-docs/plan/2026-04-20-specialist-review-agents-plan.md Batch 1 Task 1
 *
 * TDD RED — this test must fail BEFORE the agent file is written.
 * Validates: file existence, frontmatter fields, 5-phase process, output format table.
 */

const fs = require('fs');
const path = require('path');

const AGENT_PATH = path.resolve(__dirname, '..', 'aicodepath-silent-failure-hunter.md');

describe('aicodepath-silent-failure-hunter agent', () => {
  let content;
  let frontmatter;
  let body;

  beforeAll(() => {
    if (fs.existsSync(AGENT_PATH)) {
      content = fs.readFileSync(AGENT_PATH, 'utf8');
      // Extract frontmatter between first and second ---
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (match) {
        frontmatter = match[1];
        body = match[2];
      }
    }
  });

  describe('file existence', () => {
    it('should exist at .aicodepath/agents/aicodepath-silent-failure-hunter.md', () => {
      expect(fs.existsSync(AGENT_PATH)).toBe(true);
    });
  });

  describe('frontmatter fields', () => {
    it('should have frontmatter section', () => {
      expect(frontmatter).toBeDefined();
    });

    it('should have name: aicodepath-silent-failure-hunter', () => {
      expect(frontmatter).toMatch(/^name:\s*aicodepath-silent-failure-hunter$/m);
    });

    it('should have model: sonnet', () => {
      expect(frontmatter).toMatch(/^model:\s*sonnet$/m);
    });

    it('should have permissionMode: bypassPermissions', () => {
      expect(frontmatter).toMatch(/^permissionMode:\s*bypassPermissions$/m);
    });

    it('should have plugin_pack: quality', () => {
      expect(frontmatter).toMatch(/^plugin_pack:\s*quality$/m);
    });

    it('should list Read in tools', () => {
      expect(frontmatter).toMatch(/^\s*-\s*Read$/m);
    });

    it('should list Glob in tools', () => {
      expect(frontmatter).toMatch(/^\s*-\s*Glob$/m);
    });

    it('should list Grep in tools', () => {
      expect(frontmatter).toMatch(/^\s*-\s*Grep$/m);
    });
  });

  describe('5-phase review process', () => {
    it('should have Phase 1 — error handling identification', () => {
      expect(body).toMatch(/Phase 1/i);
    });

    it('should have Phase 2 — error handler scrutiny', () => {
      expect(body).toMatch(/Phase 2/i);
    });

    it('should have Phase 3 — error message examination', () => {
      expect(body).toMatch(/Phase 3/i);
    });

    it('should have Phase 4 — hidden failure detection', () => {
      expect(body).toMatch(/Phase 4/i);
    });

    it('should have Phase 5 — project standards validation', () => {
      expect(body).toMatch(/Phase 5/i);
    });

    it('should instruct reading CLAUDE.md for project-specific error conventions', () => {
      expect(body).toMatch(/CLAUDE\.md/);
    });
  });

  describe('output format', () => {
    it('should include Severity column in output table', () => {
      expect(body).toMatch(/Severity/);
    });

    it('should include Location column in output table', () => {
      expect(body).toMatch(/Location/);
    });

    it('should include Suggestion column in output table', () => {
      expect(body).toMatch(/Suggestion/);
    });

    it('should include Auto-fixable column in output table', () => {
      expect(body).toMatch(/Auto-fixable/i);
    });
  });

  describe('severity mapping', () => {
    it('should define CRITICAL severity for silent failures', () => {
      expect(body).toMatch(/CRITICAL/);
    });

    it('should define HIGH severity', () => {
      expect(body).toMatch(/HIGH/);
    });

    it('should define MEDIUM severity', () => {
      expect(body).toMatch(/MEDIUM/);
    });
  });
});
