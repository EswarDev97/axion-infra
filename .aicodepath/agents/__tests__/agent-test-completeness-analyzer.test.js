/**
 * Test: aicodepath-test-completeness-analyzer agent structural contract
 *
 * Sprint: Specialist Review Agents (2026-04-20)
 * Plan: aicodepath-docs/plan/2026-04-20-specialist-review-agents-plan.md Batch 1 Task 2
 *
 * TDD RED — this test must fail BEFORE the agent file is written.
 * Validates: file existence, frontmatter fields, 6-step analysis process,
 *            1-10 rating system, severity mapping, output format.
 */

const fs = require('fs');
const path = require('path');

const AGENT_PATH = path.resolve(__dirname, '..', 'aicodepath-test-completeness-analyzer.md');

describe('aicodepath-test-completeness-analyzer agent', () => {
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
    it('should exist at .aicodepath/agents/aicodepath-test-completeness-analyzer.md', () => {
      expect(fs.existsSync(AGENT_PATH)).toBe(true);
    });
  });

  describe('frontmatter fields', () => {
    it('should have frontmatter section', () => {
      expect(frontmatter).toBeDefined();
    });

    it('should have name: aicodepath-test-completeness-analyzer', () => {
      expect(frontmatter).toMatch(/^name:\s*aicodepath-test-completeness-analyzer$/m);
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

    it('should have disallowedTools field present', () => {
      expect(frontmatter).toMatch(/^disallowedTools:/m);
    });
  });

  describe('description format', () => {
    it('should have description starting with "Use when"', () => {
      expect(frontmatter).toMatch(/^description:\s*"?Use when/m);
    });

    it('should have description of at least 20 words', () => {
      const descMatch = frontmatter.match(/^description:\s*"?(.+?)"?\s*$/m);
      expect(descMatch).not.toBeNull();
      const words = descMatch[1].trim().split(/\s+/);
      expect(words.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('6-step analysis process', () => {
    it('should have Step 1 — understand changes', () => {
      expect(body).toMatch(/Step 1/i);
    });

    it('should have Step 2 — map test coverage', () => {
      expect(body).toMatch(/Step 2/i);
    });

    it('should have Step 3 — identify critical gaps', () => {
      expect(body).toMatch(/Step 3/i);
    });

    it('should have Step 4 — evaluate test quality', () => {
      expect(body).toMatch(/Step 4/i);
    });

    it('should have Step 5 — rate each gap 1-10', () => {
      expect(body).toMatch(/Step 5/i);
    });

    it('should have Step 6 — produce test scenario inventory', () => {
      expect(body).toMatch(/Step 6/i);
    });

    it('should reference CLAUDE.md for project-specific standards', () => {
      expect(body).toMatch(/CLAUDE\.md/);
    });
  });

  describe('1-10 coverage rating system', () => {
    it('should define 9-10 as critical functionality', () => {
      expect(body).toMatch(/9[-–]10/);
    });

    it('should define 7-8 as important business logic', () => {
      expect(body).toMatch(/7[-–]8/);
    });

    it('should define 5-6 as edge cases', () => {
      expect(body).toMatch(/5[-–]6/);
    });

    it('should define 3-4 as nice-to-have', () => {
      expect(body).toMatch(/3[-–]4/);
    });

    it('should define 1-2 as minor', () => {
      expect(body).toMatch(/1[-–]2/);
    });
  });

  describe('severity mapping from rating', () => {
    it('should map CRITICAL to gaps rated 8-10', () => {
      expect(body).toMatch(/CRITICAL[^\n]*8[-–]10|8[-–]10[^\n]*CRITICAL/);
    });

    it('should map HIGH to gaps rated 5-7', () => {
      expect(body).toMatch(/HIGH[^\n]*5[-–]7|5[-–]7[^\n]*HIGH/);
    });

    it('should map MEDIUM to gaps rated 3-4', () => {
      expect(body).toMatch(/MEDIUM[^\n]*3[-–]4|3[-–]4[^\n]*MEDIUM/);
    });

    it('should map LOW to gaps rated 1-2', () => {
      expect(body).toMatch(/LOW[^\n]*1[-–]2|1[-–]2[^\n]*LOW/);
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

    it('should include test scenario inventory (tested vs missing)', () => {
      expect(body).toMatch(/scenario inventory|what.s tested|tested vs/i);
    });

    it('should include criticality rating in output description', () => {
      expect(body).toMatch(/criticality rating|criticality \(1[-–]10\)|rating \(1[-–]10\)/i);
    });
  });

  describe('pragmatism principles', () => {
    it('should caution against testing trivial getters/setters', () => {
      expect(body).toMatch(/getter|setter|trivial/i);
    });

    it('should emphasize behavioral coverage over line coverage', () => {
      expect(body).toMatch(/behavior|behaviour/i);
    });
  });
});
