# Claude Code Plugin Development Guide

**Purpose**: Guide for creating Claude Code plugins that integrate with AICodePath

**Reference**: Based on the `plugin-dev@claude-plugins-official` toolkit patterns

---

## Overview

Claude Code plugins extend Claude's capabilities with custom commands, skills, agents, and hooks. This guide covers how to develop plugins that work with AICodePath's workflow.

---

## Plugin Structure

A Claude Code plugin follows this standard structure:

```
my-plugin/
├── plugin.json          # Plugin metadata and configuration
├── PLUGIN.md           # Documentation (loaded as context)
├── commands/           # Slash command definitions
│   └── my-command.md
├── skills/             # Skill definitions
│   └── my-skill.md
├── agents/             # Agent definitions
│   └── my-agent.md
├── hooks/              # Hook implementations
│   └── pre-tool-use.js
└── .mcp.json          # MCP server configuration (optional)
```

---

## Plugin.json

The plugin manifest defines metadata and capabilities:

```json
{
  "name": "my-plugin",
  "displayName": "My AICodePath Plugin",
  "version": "1.0.0",
  "description": "Extends AICodePath with custom capabilities",
  "author": "Your Name",
  "license": "MIT",
  "commands": ["commands/my-command.md"],
  "skills": ["skills/my-skill.md"],
  "agents": ["agents/my-agent.md"],
  "hooks": {
    "PreToolUse": {
      "Bash": "hooks/pre-tool-use.js",
      "Write": "hooks/pre-tool-use.js"
    }
  },
  "keywords": ["aicodepath", "workflow", "automation"],
  "repository": "https://github.com/you/my-plugin"
}
```

---

## Developing Components

### 1. Commands

Commands are invoked via `/command-name` in Claude Code.

**Example: `commands/validate.md`**

```markdown
---
name: validate
description: Run AICodePath guideline validation
---

# Validate Command

When the user runs `/validate`, perform these steps:

1. Check the current file for guideline violations
2. Load applicable guidelines from `guidelines/*.json`
3. Report any violations with severity and suggested fixes
4. Provide a summary of the validation results

## Usage

/validate [file-path]
```

### 2. Skills

Skills provide domain expertise and workflows.

**Example: `skills/aicodepath-design.md`**

```markdown
---
name: aicodepath-design
description: AICodePath functional design expertise
autoInvoke: false
---

# AICodePath Design Skill

## When to Use

Invoke this skill when the user needs help with:
- Domain entity design
- Business rule definition
- API contract design

## Workflow

1. **Understand Requirements**
   - Ask clarifying questions about the domain
   - Identify key entities and relationships

2. **Design Entities**
   - Define entity properties and types
   - Apply naming conventions from `coding-standards.json`

3. **Validate Design**
   - Check against `architecture-rules.json`
   - Ensure proper layer separation
```

### 3. Agents

Agents are autonomous specialists that perform specific tasks.

**Example: `agents/code-reviewer.md`**

```markdown
---
name: code-reviewer
description: AICodePath code review agent with confidence scoring
tools: [Read, Glob, Grep]
---

# Code Reviewer Agent

## Purpose

Review code changes for AICodePath guideline compliance.

## Process

1. **Gather Context**
   - Read the files being reviewed
   - Load applicable guidelines

2. **Analyze Code**
   - Check against each guideline rule
   - Calculate confidence score for each issue

3. **Report Issues**
   - Only report high-confidence issues (80+)
   - Include rule ID, severity, and suggested fix

## Confidence Scoring

| Score | Action |
|-------|--------|
| 80+ | Report as issue |
| 50-79 | Flag for review |
| <50 | Suppress |
```

### 4. Hooks

Hooks intercept tool calls for validation or modification.

**Example: `hooks/pre-tool-use.js`**

```javascript
/**
 * PreToolUse hook for AICodePath validation
 */
module.exports = {
  name: 'aicodepath-validator',

  /**
   * Called before tool execution
   * @param {object} context - Tool call context
   * @param {string} context.tool - Tool name (Bash, Write, Edit)
   * @param {object} context.input - Tool input parameters
   * @returns {object} - { allow: boolean, message?: string }
   */
  async onPreToolUse(context) {
    const { tool, input } = context;

    // Validate Write/Edit operations
    if (tool === 'Write' || tool === 'Edit') {
      const filePath = input.file_path;
      const content = input.content || input.new_string;

      // Run guideline validation
      const violations = await validateContent(content, filePath);

      if (violations.hasErrors) {
        return {
          allow: false,
          message: formatViolations(violations)
        };
      }
    }

    return { allow: true };
  }
};

async function validateContent(content, filePath) {
  // Load applicable guidelines and check content
  // Return { hasErrors: boolean, violations: [] }
}

function formatViolations(violations) {
  // Format violations for display
}
```

---

## Hook Events

| Event | Trigger | Use Case |
|-------|---------|----------|
| `PreToolUse` | Before any tool call | Validation, blocking dangerous operations |
| `PostToolUse` | After tool execution | Logging, cleanup |
| `SessionStart` | When session begins | Setup, context injection |
| `Stop` | When Claude tries to stop | Loop continuation (ralph-loop style) |
| `UserPromptSubmit` | When user submits prompt | Pre-flight checks |

---

## MCP Server Integration

For plugins that need external capabilities, configure MCP servers:

**Example: `.mcp.json`**

```json
{
  "servers": {
    "my-service": {
      "command": "node",
      "args": ["mcp-server/index.js"],
      "env": {
        "API_KEY": "${MY_SERVICE_API_KEY}"
      }
    }
  }
}
```

---

## AICodePath Integration Patterns

### Pattern 1: Guideline Enforcement Hook

```javascript
// hooks/guideline-validator.js
const guidelines = require('./guidelines');

module.exports = {
  async onPreToolUse({ tool, input }) {
    if (tool !== 'Write' && tool !== 'Edit') return { allow: true };

    const filePath = input.file_path;
    const content = input.content || input.new_string;

    // Determine file type
    const fileType = detectFileType(filePath);

    // Load applicable guidelines
    const rules = guidelines.getForFileType(fileType);

    // Check content
    const violations = checkContent(content, rules);

    if (violations.filter(v => v.severity === 'error').length > 0) {
      return {
        allow: false,
        message: formatViolationReport(violations)
      };
    }

    return { allow: true };
  }
};
```

### Pattern 2: Workflow Phase Tracking

```javascript
// hooks/phase-tracker.js
const db = require('./knowledge-base');

module.exports = {
  async onPostToolUse({ tool, input, output }) {
    // Track phase transitions based on tool usage
    if (tool === 'Write' && input.file_path.includes('design')) {
      await db.updatePhase('CONSTRUCTION');
    }

    if (tool === 'Bash' && input.command.includes('npm test')) {
      await db.logActivity('tests_run', output);
    }
  }
};
```

### Pattern 3: Confidence-Based Filtering

```javascript
// agents/reviewer.js
function calculateConfidence(issue, context) {
  let confidence = 0;

  // Pattern match confidence
  if (issue.patternMatch === 'exact') confidence += 30;
  else if (issue.patternMatch === 'partial') confidence += 15;

  // Context relevance
  if (isRelevantToFileType(issue, context.fileType)) confidence += 25;

  // Severity alignment
  if (severityMatchesPattern(issue)) confidence += 20;

  // Code path analysis
  if (issue.codePathConfirmed) confidence += 25;

  return confidence;
}

function filterIssues(issues, context) {
  return issues
    .map(issue => ({
      ...issue,
      confidence: calculateConfidence(issue, context)
    }))
    .filter(issue => issue.confidence >= 80);
}
```

---

## Testing Plugins

### Manual Testing

```bash
# Install plugin locally
claude plugins add ./my-plugin

# List installed plugins
claude plugins list

# Test command
# In Claude Code: /my-command

# Remove plugin
claude plugins remove my-plugin
```

### Hook Testing

```bash
# Test hook with sample input
echo '{"tool":"Write","input":{"file_path":"test.ts","content":"..."}}' | \
  node hooks/pre-tool-use.js
```

---

## Best Practices

### 1. Plugin Design

- **Single Responsibility**: Each plugin should do one thing well
- **Graceful Degradation**: Plugins should fail gracefully if dependencies are missing
- **Clear Documentation**: PLUGIN.md should explain all capabilities

### 2. Hook Design

- **Fast Execution**: Hooks should be fast (<100ms)
- **No Side Effects**: PreToolUse hooks should only validate, not modify state
- **Clear Messages**: Rejection messages should explain why and how to fix

### 3. AICodePath Compatibility

- **Follow Guidelines**: Plugins should follow AICodePath coding standards
- **Integrate with KB**: Use the knowledge base for state persistence
- **Log to Audit**: Record significant actions in audit.md

---

## Publishing

### To Claude Plugins Registry

1. Ensure `plugin.json` has all required fields
2. Add comprehensive `PLUGIN.md` documentation
3. Test on all supported platforms
4. Submit to claude-plugins-official (if Anthropic) or publish independently

### Version Management

```json
{
  "version": "1.0.0",
  "minClaudeVersion": "1.0.0",
  "maxClaudeVersion": "2.0.0"
}
```

---

## References

- **Plugin Dev Toolkit**: `plugin-dev@claude-plugins-official`
- **Example Plugins**: `~/Download/claude-plugins/internal/example-plugin`
- **Hook API**: Claude Code documentation
- **MCP Protocol**: Model Context Protocol specification
