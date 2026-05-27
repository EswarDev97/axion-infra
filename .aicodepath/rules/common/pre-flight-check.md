# Pre-Flight Check Stage

**Purpose**: Verify environment and knowledge base are ready before workflow execution

**Execution**: ALWAYS executes BEFORE Workspace Detection (first stage of any AICodePath workflow)

**Philosophy**: Knowledge Base and required plugins are mandatory; MCP servers and optional plugins are enhancements.

---

## Overview

The Pre-Flight Check ensures the essential tooling is available before starting any AICodePath workflow. The only hard requirement is the Knowledge Base - all other components are optional enhancements.

---

## Step 1: Check Knowledge Base (REQUIRED)

### 1.1 Verification

```bash
# Check if knowledge base is initialized
ls -la aicodepath-docs/aicodepath.db
```

### 1.2 Results

| Status | Action |
|--------|--------|
| ✓ File exists | Proceed to next step |
| ✗ File missing | Run initialization script |

### 1.3 Remediation

If knowledge base is not initialized:

```bash
cd .aicodepath && ./scripts/init-knowledge-base.sh
```

---

## Step 1.5: Credential Validation (OPTIONAL but RECOMMENDED)

### 1.5.1 Environment Credential Check

When connecting to external services (databases, APIs, cloud providers), validate credentials BEFORE attempting operations.

### 1.5.2 Credential Source Priority

Always use credentials from this priority order:
1. **Environment Variables** (highest priority)
2. **Secrets Manager** (AWS Secrets Manager, HashiCorp Vault)
3. **Local config files** (development only, .gitignored)

**NEVER use:**
- Hardcoded credentials in code
- Credentials from conversation history
- Assumed/guessed credentials

### 1.5.3 Pre-Connection Validation

Before any database/API connection:

```bash
# Verify environment variables exist
echo "DB_HOST: ${DB_HOST:-NOT_SET}"
echo "DB_USER: ${DB_USER:-NOT_SET}"
echo "DB_NAME: ${DB_NAME:-NOT_SET}"
# Never echo passwords, just check they're set
[ -n "$DB_PASSWORD" ] && echo "DB_PASSWORD: SET" || echo "DB_PASSWORD: NOT_SET"
```

### 1.5.4 Connection Test

For database connections:
```bash
# Test connection (read-only query)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"
```

For API connections:
```bash
# Test with health endpoint
curl -s -o /dev/null -w "%{http_code}" $API_URL/health
```

### 1.5.5 Credential Validation Results

```markdown
## Credential Validation Results

| Service | Credential Source | Test Result | Action |
|---------|------------------|-------------|--------|
| Database | ENV: DB_* | [Connected/Failed/Not Set] | [Proceed/Fix/Skip] |
| API | ENV: API_KEY | [200 OK/Failed/Not Set] | [Proceed/Fix/Skip] |
| AWS | ENV: AWS_* | [Valid/Failed/Not Set] | [Proceed/Fix/Skip] |
```

**If ANY credential validation fails:**
1. STOP workflow
2. Report which credential failed
3. Ask user to provide correct credentials in environment
4. Do NOT guess or use credentials from other sources

### 1.5.6 Hook Integration

The `pre-flight-check.js` hook validates credentials programmatically. See `hooks/pre-flight-check.js`.

---

## Step 2: Check MCP Servers (OPTIONAL)

MCP servers enhance the workflow but are NOT required. The workflow continues if unavailable.

### 2.1 Optional MCP Servers

| Server | Purpose | Capabilities | Required |
|--------|---------|--------------|----------|
| Code indexing MCP | Enhanced codebase search | (optional - use Glob/Grep) | **No** |
| `playwright` | Browser automation for testing | browser_navigate, browser_click, browser_screenshot | **No** |

### 2.2 If Available - Claude Code Indexer

When available, provides enhanced capabilities:

| Tool | Purpose |
|------|---------|
| `index_codebase` | Index project files for fast search |
| `search_code` | Search for code patterns across codebase |
| `get_project_stats` | Get project statistics and insights |
| `query_important_code` | Find important code entities |

### 2.3 If Available - Playwright

When available, provides browser testing:

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to URLs for testing |
| `browser_click` | Click elements for interaction testing |
| `browser_screenshot` | Capture screenshots for verification |

### 2.4 MCP Server Check Results

```markdown
## MCP Server Status (Optional)

| Server | Status | Impact if Missing |
|--------|--------|-------------------|
| Code indexing | [Optional] | Use built-in Glob/Grep tools |
| playwright | [Available/Missing] | Manual browser testing required |

**Note**: Workflow continues regardless of MCP server availability.
```

---

## Step 3: Check Plugins

### 3.1 Required Plugins (7 core + language-specific)

These plugins are required for core workflow functionality:

#### Core Workflow Plugins (7 - Always Required)

| Plugin ID | Purpose | Required |
|-----------|---------|----------|
| `frontend-design@claude-plugins-official` | UI component generation | **YES** |
| `github@claude-plugins-official` | GitHub integration | **YES** |
| `context7@claude-plugins-official` | Context management | **YES** |
| `code-review@claude-plugins-official` | Code review automation | **YES** |
| `commit-commands@claude-plugins-official` | Git commit helpers | **YES** |
| `feature-dev@claude-plugins-official` | 7-phase feature development workflow | **YES** |
| `pr-review-toolkit@claude-plugins-official` | Comprehensive PR analysis with 6 specialized agents | **YES** |

#### Code Intelligence Plugins (Language-Specific - REQUIRED)

**Why Required**: Enables precise symbol navigation, type checking, error detection, "go to definition", and "find references" capabilities.

Choose based on your primary language(s):

| Plugin ID | Language | Features | Required If |
|-----------|----------|----------|-------------|
| `typescript@claude-plugins-official` | TypeScript/JavaScript | Type checking, symbol navigation, error detection | TS/JS project |
| `python@claude-plugins-official` | Python | Type hints, imports, symbol navigation | Python project |
| `go@claude-plugins-official` | Go | Type system, symbol navigation | Go project |
| `rust@claude-plugins-official` | Rust | Type system, borrow checker integration | Rust project |

**Auto-Detection**: Pre-flight check automatically detects project language(s) and verifies appropriate code intelligence plugin is installed.

**Multi-Language Projects**: Install code intelligence plugin for each language in your stack.

### 3.2 Optional Plugins (8 plugins)

These plugins enhance the workflow but are not required:

| Plugin ID | Purpose | Required |
|-----------|---------|----------|
| `linear@claude-plugins-official` | Issue tracking integration | No |
| `agent-sdk-dev@claude-plugins-official` | Agent SDK support | No |
| `serena@claude-plugins-official` | Code analysis | No |
| `hookify@claude-plugins-official` | Dynamic rule creation without coding | No |
| `ralph-loop@claude-plugins-official` | Autonomous TDD-driven development loops | No |
| `plugin-dev@claude-plugins-official` | Plugin development toolkit | No |
| `learning-output-style@claude-plugins-official` | Educational mode with active participation | No |
| `explanatory-output-style@claude-plugins-official` | Code explanation and insights mode | No |

### 3.3 Plugin Check Results

```markdown
## Plugin Verification Results

### Required Core Plugins (7)
| Plugin | Status |
|--------|--------|
| frontend-design | [✓/✗] |
| github | [✓/✗] |
| context7 | [✓/✗] |
| code-review | [✓/✗] |
| commit-commands | [✓/✗] |
| feature-dev | [✓/✗] |
| pr-review-toolkit | [✓/✗] |

### Required Code Intelligence Plugins (Language-Specific)
| Language Detected | Plugin Required | Status |
|-------------------|-----------------|--------|
| TypeScript/JavaScript | typescript | [✓/✗] |
| Python | python | [✓/✗] |
| Go | go | [✓/✗] |
| Rust | rust | [✓/✗] |

### Optional Plugins (8)
| Plugin | Status | Impact if Missing |
|--------|--------|-------------------|
| linear | [✓/✗] | Manual issue tracking |
| agent-sdk-dev | [✓/✗] | Limited agent SDK support |
| serena | [✓/✗] | Use standard code analysis |
| hookify | [✓/✗] | Use JS hooks only |
| ralph-loop | [✓/✗] | Manual TDD iteration |
| plugin-dev | [✓/✗] | Manual plugin setup |
| learning-output-style | [✓/✗] | Standard output mode |
| explanatory-output-style | [✓/✗] | Standard output mode |

**Required**: [X]/7 installed
**Optional**: [X]/8 installed
```

### 3.4 Missing Required Plugin Remediation

If any required plugin is missing:

- Stop the workflow and capture missing plugin IDs.
- Resolve availability via your standard plugin provisioning process.
- See `rules/common/mandatory-plugins.md` for managing required plugins.

---

## Step 4: Present Results

### 4.1 All Checks Passed

```markdown
# ✓ Pre-Flight Check Complete

**Required Components:**
- Knowledge Base: ✓ Initialized
- Required Plugins: 7/7 installed ✓

**Optional Enhancements:**
- MCP Servers: [X] available
- Optional Plugins: [X]/8 installed

---

**Proceeding to Workspace Detection...**
```

### 4.2 Required Component Missing (BLOCKS WORKFLOW)

```markdown
# ✗ Pre-Flight Check Failed

**Missing Required Components:**

## Knowledge Base
- Status: [Initialized/Missing]
- Action: Run `cd .aicodepath && ./scripts/init-knowledge-base.sh`

## Required Plugins ([X]/7 installed)
| Plugin | Status |
|--------|--------|
| frontend-design | ✗ |
| github | ✗ |
| context7 | ✗ |
| code-review | ✗ |
| commit-commands | ✗ |
| feature-dev | ✗ |
| pr-review-toolkit | ✗ |

---

Resolve missing required plugins via your standard provisioning process. See `rules/common/mandatory-plugins.md`.
```

### 4.3 Optional Components Missing (WORKFLOW CONTINUES)

```markdown
# ✓ Pre-Flight Check Complete (with notes)

**Required Components:**
- Knowledge Base: ✓ Initialized
- Required Plugins: 7/7 installed ✓

**Optional Enhancements (not available):**
- MCP Servers: playwright (optional, will use built-in tools otherwise)
- Optional Plugins: linear, hookify, ralph-loop, plugin-dev, etc.

---

**Proceeding to Workspace Detection...**
```

---

## Step 5: Log Results

### 5.1 Log in audit.md

All pre-flight check results MUST be logged in `aicodepath-docs/audit.md`:

```markdown
## Pre-Flight Check
**Timestamp**: [ISO 8601 timestamp]
**Status**: [PASSED/FAILED]

**Required:**
- Knowledge Base: [Initialized/Missing]

**Optional:**
- MCP Servers: [list of available servers]
- Plugins: [list of installed plugins]

**Result**: [Proceeding/Blocked - reason]

---
```

---

## Integration with Workflow

### Position in Workflow

```
┌─────────────────────────────────────────┐
│           PRE-FLIGHT PHASE              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      Pre-Flight Check           │   │ ← ALWAYS FIRST
│  │  (Knowledge Base required)      │   │
│  │  (MCP/Plugins optional)         │   │
│  └─────────────────────────────────┘   │
│                  ↓                       │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│           INCEPTION PHASE               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │      Workspace Detection        │   │
│  └─────────────────────────────────┘   │
│                  ↓                       │
│            (continues...)               │
└─────────────────────────────────────────┘
```

### Decision Logic

- If Knowledge Base exists AND Required Plugins installed: **PROCEED** to Workspace Detection
- If Knowledge Base missing: **STOP** and remediate
- If Required Plugins missing: **STOP** and remediate
- If MCP servers missing: **PROCEED** (note in audit log)
- If Optional Plugins missing: **PROCEED** (note in audit log)

---

## Configuration

### Project-Specific Overrides

Projects can customize in `.aicodepath-overrides/config.json`:

```json
{
  "preflight": {
    "knowledgeBase": {
      "required": true
    },
    "mcpServers": {
      "required": [],
      "optional": ["playwright"]
    },
    "plugins": {
      "required": [],
      "optional": ["frontend-design", "github"]
    }
  }
}
```

### Disable Pre-Flight Check

To skip pre-flight checks entirely (not recommended):

```json
{
  "preflight": {
    "enabled": false
  }
}
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Knowledge base not found | Run `./scripts/init-knowledge-base.sh` |
| MCP server not responding | Check server logs, or proceed without it |
| better-sqlite3 not installed | Run `npm install` in `.aicodepath/` |

### Manual Verification

```bash
# Check knowledge base
ls -la aicodepath-docs/aicodepath.db

# Test knowledge base query
node .aicodepath/lib/kb-query.js get-stats
```

---

## References

- Knowledge Base: `lib/knowledge-base.js`
- Query Interface: `lib/kb-query.js`
- Initialization Script: `scripts/init-knowledge-base.sh`
