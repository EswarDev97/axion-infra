# Claude Code CLI Specification Reference

> Comprehensive specification reference sourced from official documentation at code.claude.com (February 2026).

---

## Table of Contents

1. [Hooks Specification](#1-hooks-specification)
2. [Skills Specification](#2-skills-specification)
3. [Sub-Agent Specification](#3-sub-agent-specification)
4. [MCP Specification](#4-mcp-specification)
5. [Plugin Specification](#5-plugin-specification)
6. [Settings Specification](#6-settings-specification)
7. [Checkpointing Specification](#7-checkpointing-specification)
8. [CLI Modes Specification](#8-cli-modes-specification)
9. [Integration Matrix](#9-integration-matrix)

---

## 1. Hooks Specification

**Source**: https://code.claude.com/docs/en/hooks

Hooks are user-defined shell commands or LLM prompts that execute automatically at specific points in Claude Code's lifecycle.

### 1.1 Lifecycle Events

| Event                | When It Fires                                    | Can Block? |
|:---------------------|:-------------------------------------------------|:-----------|
| `SessionStart`       | When a session begins or resumes                 | No         |
| `UserPromptSubmit`   | When user submits a prompt, before processing    | Yes        |
| `PreToolUse`         | Before a tool call executes                      | Yes        |
| `PermissionRequest`  | When a permission dialog appears                 | Yes        |
| `PostToolUse`        | After a tool call succeeds                       | No         |
| `PostToolUseFailure` | After a tool call fails                          | No         |
| `Notification`       | When Claude Code sends a notification            | No         |
| `SubagentStart`      | When a subagent is spawned                       | No         |
| `SubagentStop`       | When a subagent finishes                         | Yes        |
| `Stop`               | When Claude finishes responding                  | Yes        |
| `PreCompact`         | Before context compaction                        | No         |
| `SessionEnd`         | When a session terminates                        | No         |

### 1.2 Hook Types

There are three hook handler types:

| Type      | Field    | Description                                                |
|:----------|:---------|:-----------------------------------------------------------|
| `command` | `command`| Runs a shell command. Receives JSON on stdin, returns via exit codes + stdout |
| `prompt`  | `prompt` | Sends a prompt to a Claude model for single-turn yes/no evaluation |
| `agent`   | `prompt` | Spawns a subagent with tool access (Read, Grep, Glob) for multi-turn verification |

### 1.3 Configuration Schema (settings.json)

```json
{
  "hooks": {
    "<EventName>": [
      {
        "matcher": "<regex-pattern>",
        "hooks": [
          {
            "type": "command" | "prompt" | "agent",
            "command": "<shell-command>",
            "prompt": "<prompt-text-with-$ARGUMENTS>",
            "model": "<model-override>",
            "timeout": <seconds>,
            "statusMessage": "<spinner-text>",
            "async": true | false,
            "once": true | false
          }
        ]
      }
    ]
  }
}
```

**Common Handler Fields (all types)**:

| Field           | Required | Default                              | Description                                    |
|:----------------|:---------|:-------------------------------------|:-----------------------------------------------|
| `type`          | Yes      | --                                   | `"command"`, `"prompt"`, or `"agent"`          |
| `timeout`       | No       | 600 (cmd), 30 (prompt), 60 (agent)   | Seconds before canceling                       |
| `statusMessage` | No       | --                                   | Custom spinner message                         |
| `once`          | No       | false                                | Run only once per session (skills only)        |

**Command-specific Fields**:

| Field     | Required | Description                                          |
|:----------|:---------|:-----------------------------------------------------|
| `command` | Yes      | Shell command to execute                             |
| `async`   | No       | If true, runs in background without blocking         |

**Prompt/Agent-specific Fields**:

| Field    | Required | Description                                                      |
|:---------|:---------|:-----------------------------------------------------------------|
| `prompt` | Yes      | Prompt text. `$ARGUMENTS` placeholder for hook input JSON       |
| `model`  | No       | Model override. Defaults to a fast model                        |

### 1.4 Matcher Patterns (per event)

| Event                                                        | Matches Against        | Example Values                                              |
|:-------------------------------------------------------------|:-----------------------|:------------------------------------------------------------|
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest` | Tool name     | `Bash`, `Edit\|Write`, `mcp__.*`                            |
| `SessionStart`                                               | Session source         | `startup`, `resume`, `clear`, `compact`                     |
| `SessionEnd`                                                 | Exit reason            | `clear`, `logout`, `prompt_input_exit`, `other`             |
| `Notification`                                               | Notification type      | `permission_prompt`, `idle_prompt`, `auth_success`          |
| `SubagentStart`, `SubagentStop`                              | Agent type             | `Bash`, `Explore`, `Plan`, custom agent names               |
| `PreCompact`                                                 | Trigger type           | `manual`, `auto`                                            |
| `UserPromptSubmit`, `Stop`                                   | No matcher support     | Always fires                                                |

### 1.5 Exit Codes

| Exit Code | Meaning              | JSON Parsed? | Behavior                                    |
|:----------|:---------------------|:-------------|:--------------------------------------------|
| 0         | Success              | Yes          | Proceeds; stdout parsed for JSON output     |
| 2         | Blocking error       | No           | Blocks the action; stderr shown as error    |
| Other     | Non-blocking error   | No           | Continues; stderr shown in verbose mode     |

### 1.6 Common Input Fields (JSON via stdin)

| Field             | Description                                            |
|:------------------|:-------------------------------------------------------|
| `session_id`      | Current session identifier                             |
| `transcript_path` | Path to conversation JSON                              |
| `cwd`             | Current working directory                              |
| `permission_mode` | `"default"`, `"plan"`, `"acceptEdits"`, `"dontAsk"`, `"bypassPermissions"` |
| `hook_event_name` | Name of the event that fired                           |

### 1.7 JSON Output Fields (stdout on exit 0)

**Universal Fields**:

| Field            | Default | Description                                        |
|:-----------------|:--------|:---------------------------------------------------|
| `continue`       | `true`  | If false, stops Claude entirely                    |
| `stopReason`     | --      | Shown to user when continue is false               |
| `suppressOutput` | `false` | Hides stdout from verbose mode                     |
| `systemMessage`  | --      | Warning message shown to user                      |

**Decision Control Patterns**:

| Events                                                   | Pattern              | Key Fields                                                  |
|:---------------------------------------------------------|:---------------------|:------------------------------------------------------------|
| UserPromptSubmit, PostToolUse, PostToolUseFailure, Stop, SubagentStop | Top-level `decision` | `decision: "block"`, `reason`                               |
| PreToolUse                                               | `hookSpecificOutput` | `permissionDecision` (allow/deny/ask), `permissionDecisionReason`, `updatedInput`, `additionalContext` |
| PermissionRequest                                        | `hookSpecificOutput` | `decision.behavior` (allow/deny), `updatedInput`, `updatedPermissions` |

### 1.8 Hook File Locations

| Location                                    | Scope                        | Shareable                    |
|:--------------------------------------------|:-----------------------------|:-----------------------------|
| `~/.claude/settings.json`                   | All your projects            | No                           |
| `.claude/settings.json`                     | Single project               | Yes (commit to repo)         |
| `.claude/settings.local.json`               | Single project               | No (gitignored)              |
| Managed policy settings                     | Organization-wide            | Admin-controlled             |
| Plugin `hooks/hooks.json`                   | When plugin is enabled       | Bundled with plugin          |
| Skill or agent frontmatter                  | While component is active    | Defined in component file    |

### 1.9 MCP Tool Hook Matching

MCP tools follow the naming pattern `mcp__<server>__<tool>`:
- `mcp__memory__create_entities` -- Memory server's create_entities tool
- `mcp__filesystem__read_file` -- Filesystem server's read_file tool

Regex examples:
- `mcp__memory__.*` -- all tools from the memory server
- `mcp__.*__write.*` -- any write tool from any server

### 1.10 Environment Variables Available to Hooks

| Variable              | Description                                      |
|:----------------------|:-------------------------------------------------|
| `$CLAUDE_PROJECT_DIR` | Project root directory                           |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin's root directory (for plugin hooks)     |
| `$CLAUDE_CODE_REMOTE` | Set to `"true"` in remote web environments       |
| `$CLAUDE_ENV_FILE`    | Path to write persistent env vars (SessionStart only) |

### 1.11 Prompt/Agent Hook Response Schema

```json
{
  "ok": true | false,
  "reason": "Explanation (required when ok is false)"
}
```

---

## 2. Skills Specification

**Source**: https://code.claude.com/docs/en/skills

Skills extend what Claude can do via `SKILL.md` files with YAML frontmatter and Markdown instructions. Follows the Agent Skills open standard (agentskills.io).

### 2.1 SKILL.md Format

```yaml
---
name: my-skill
description: What this skill does and when to use it
argument-hint: "[issue-number]"
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob
model: sonnet
context: fork
agent: Explore
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/check.sh"
---

Markdown instructions for Claude to follow when this skill is invoked.

Use $ARGUMENTS for user-provided arguments.
Use $ARGUMENTS[0], $ARGUMENTS[1] or $0, $1 for positional arguments.
Use ${CLAUDE_SESSION_ID} for session tracking.
Use !`shell-command` for dynamic context injection (preprocessed).
```

### 2.2 Frontmatter Fields

| Field                      | Required    | Type    | Description                                                                       |
|:---------------------------|:------------|:--------|:----------------------------------------------------------------------------------|
| `name`                     | No          | string  | Display name and `/` command. Defaults to directory name. Lowercase + hyphens, max 64 chars |
| `description`              | Recommended | string  | What the skill does. Claude uses this for auto-invocation decisions               |
| `argument-hint`            | No          | string  | Autocomplete hint, e.g. `[issue-number]`                                          |
| `disable-model-invocation` | No          | boolean | If true, only user can invoke via `/name`. Default: false                         |
| `user-invocable`           | No          | boolean | If false, hidden from `/` menu (background knowledge). Default: true              |
| `allowed-tools`            | No          | string  | Comma-separated tools Claude can use without permission                           |
| `model`                    | No          | string  | Model override for this skill                                                     |
| `context`                  | No          | string  | Set to `fork` to run in a forked subagent context                                 |
| `agent`                    | No          | string  | Subagent type when `context: fork`. Options: `Explore`, `Plan`, `general-purpose`, or custom agent name |
| `hooks`                    | No          | object  | Lifecycle hooks scoped to this skill                                              |

### 2.3 String Substitutions

| Variable               | Description                                                  |
|:-----------------------|:-------------------------------------------------------------|
| `$ARGUMENTS`           | All arguments passed when invoking the skill                 |
| `$ARGUMENTS[N]`        | Specific argument by 0-based index                           |
| `$N`                   | Shorthand for `$ARGUMENTS[N]`                                |
| `${CLAUDE_SESSION_ID}` | Current session ID                                           |

### 2.4 Dynamic Context Injection

The `` !`command` `` syntax runs shell commands before skill content is sent to Claude:

```yaml
---
name: pr-summary
context: fork
agent: Explore
---

## PR Context
- PR diff: !`gh pr diff`
- Changed files: !`gh pr diff --name-only`
```

### 2.5 File Locations

| Location   | Path                                          | Applies To                     |
|:-----------|:----------------------------------------------|:-------------------------------|
| Enterprise | Managed settings path                         | All users in organization      |
| Personal   | `~/.claude/skills/<skill-name>/SKILL.md`      | All your projects              |
| Project    | `.claude/skills/<skill-name>/SKILL.md`        | This project only              |
| Plugin     | `<plugin>/skills/<skill-name>/SKILL.md`       | Where plugin is enabled        |
| Legacy     | `.claude/commands/<name>.md`                  | Backward compatible            |

**Skill directory structure**:
```
my-skill/
  SKILL.md           # Main instructions (required)
  template.md        # Template for Claude to fill in (optional)
  examples/
    sample.md        # Example output (optional)
  scripts/
    validate.sh      # Script Claude can execute (optional)
```

### 2.6 Invocation Control Matrix

| Frontmatter                      | User Can Invoke | Claude Can Invoke | Description Loaded Into Context |
|:---------------------------------|:----------------|:------------------|:--------------------------------|
| (default)                        | Yes             | Yes               | Yes                             |
| `disable-model-invocation: true` | Yes             | No                | No                              |
| `user-invocable: false`          | No              | Yes               | Yes                             |

### 2.7 Automatic Discovery

- Claude Code discovers skills from nested `.claude/skills/` directories (supports monorepos)
- Skill descriptions loaded into context (budget: 15,000 chars, configurable via `SLASH_COMMAND_TOOL_CHAR_BUDGET`)
- Full skill content loads only when invoked

---

## 3. Sub-Agent Specification

**Source**: https://code.claude.com/docs/en/sub-agents

Subagents are specialized AI assistants that handle specific tasks in their own context window.

### 3.1 Built-in Agent Types

| Agent             | Model    | Tools               | Purpose                                      |
|:------------------|:---------|:---------------------|:---------------------------------------------|
| **Explore**       | Haiku    | Read-only only       | File discovery, code search, codebase exploration |
| **Plan**          | Inherits | Read-only only       | Codebase research for plan mode              |
| **General-purpose** | Inherits | All tools          | Complex research, multi-step operations      |
| **Bash**          | Inherits | Terminal commands    | Running terminal commands in separate context |
| **statusline-setup** | Sonnet | --                | `/statusline` configuration                  |
| **Claude Code Guide** | Haiku | --               | Questions about Claude Code features         |

### 3.2 Agent File Format (Markdown + YAML Frontmatter)

```yaml
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep, Bash
disallowedTools: Write, Edit
model: sonnet
permissionMode: default
skills:
  - api-conventions
  - error-handling-patterns
memory: user
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
---

You are a code reviewer. Analyze the code and provide
specific, actionable feedback on quality, security, and best practices.
```

### 3.3 Frontmatter Fields

| Field             | Required | Description                                                                      |
|:------------------|:---------|:---------------------------------------------------------------------------------|
| `name`            | Yes      | Unique identifier (lowercase + hyphens)                                          |
| `description`     | Yes      | When Claude should delegate to this subagent                                     |
| `tools`           | No       | Allowlist of tools. Inherits all if omitted                                      |
| `disallowedTools` | No       | Denylist of tools (removed from inherited/specified list)                        |
| `model`           | No       | `sonnet`, `opus`, `haiku`, or `inherit`. Default: `inherit`                      |
| `permissionMode`  | No       | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`                |
| `skills`          | No       | Skills to preload into subagent context at startup                               |
| `hooks`           | No       | Lifecycle hooks scoped to this subagent                                          |
| `memory`          | No       | Persistent memory scope: `user`, `project`, or `local`                           |

### 3.4 Scope and File Locations (priority order)

| Priority | Location                     | Scope                   | How to Create                         |
|:---------|:-----------------------------|:------------------------|:--------------------------------------|
| 1        | `--agents` CLI flag          | Current session         | Pass JSON when launching Claude Code  |
| 2        | `.claude/agents/`            | Current project         | Interactive or manual                 |
| 3        | `~/.claude/agents/`          | All your projects       | Interactive or manual                 |
| 4        | Plugin's `agents/` directory | Where plugin is enabled | Installed with plugins                |

### 3.5 CLI-Defined Agents (JSON format)

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer.",
    "prompt": "You are a senior code reviewer.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

### 3.6 Foreground vs Background Execution

| Mode       | Behavior                                                                           |
|:-----------|:-----------------------------------------------------------------------------------|
| Foreground | Blocks main conversation. Permission prompts passed through to user               |
| Background | Runs concurrently. Pre-approves tool permissions upfront. Auto-denies anything not pre-approved. No MCP tools. |

- Press `Ctrl+B` to background a running task
- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` to disable

### 3.7 Persistent Memory

| Scope     | Location                                      | Use When                                    |
|:----------|:----------------------------------------------|:--------------------------------------------|
| `user`    | `~/.claude/agent-memory/<name>/`              | Learnings should persist across all projects |
| `project` | `.claude/agent-memory/<name>/`                | Knowledge is project-specific, shareable    |
| `local`   | `.claude/agent-memory-local/<name>/`          | Project-specific, not version controlled    |

When memory is enabled:
- System prompt includes instructions for reading/writing to memory directory
- First 200 lines of `MEMORY.md` are included in prompt
- Read, Write, Edit tools automatically enabled

### 3.8 Disabling Specific Subagents

```json
{
  "permissions": {
    "deny": ["Task(Explore)", "Task(my-custom-agent)"]
  }
}
```

Or via CLI: `claude --disallowedTools "Task(Explore)"`

---

## 4. MCP Specification

**Source**: https://code.claude.com/docs/en/mcp

Model Context Protocol (MCP) connects Claude Code to external tools, databases, and APIs.

### 4.1 Transport Types

| Transport          | Command                                                      | Use Case                  |
|:-------------------|:-------------------------------------------------------------|:--------------------------|
| **HTTP**           | `claude mcp add --transport http <name> <url>`               | Recommended for remote    |
| **SSE** (deprecated) | `claude mcp add --transport sse <name> <url>`             | Legacy remote connections |
| **stdio**          | `claude mcp add --transport stdio <name> -- <command> [args]` | Local processes           |

### 4.2 MCP Installation Scopes

| Scope   | Storage Location                            | Purpose                              |
|:--------|:--------------------------------------------|:-------------------------------------|
| `local` | `~/.claude.json` (under project path)       | Personal, current project (default)  |
| `project` | `.mcp.json` (project root)                | Team-shared, committed to VCS        |
| `user`  | `~/.claude.json` (global section)           | Personal, all projects               |

Precedence: local > project > user

### 4.3 `.mcp.json` Configuration Schema

```json
{
  "mcpServers": {
    "<server-name>": {
      "type": "http" | "stdio" | "sse",
      "command": "<executable>",
      "args": ["<arg1>", "<arg2>"],
      "env": {
        "KEY": "value",
        "EXPANDED": "${ENV_VAR:-default}"
      },
      "url": "https://...",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      },
      "cwd": "<working-directory>"
    }
  }
}
```

**Environment variable expansion** in `.mcp.json`:
- `${VAR}` -- expands to env var value
- `${VAR:-default}` -- expands with fallback default
- Supported in: `command`, `args`, `env`, `url`, `headers`

### 4.4 CLI Management Commands

```bash
claude mcp add --transport http <name> <url>           # Add HTTP server
claude mcp add --transport stdio <name> -- <cmd> [args] # Add stdio server
claude mcp add --transport http <name> --scope project <url>  # Project scope
claude mcp add-json <name> '<json>'                     # Add from JSON
claude mcp add-from-claude-desktop                      # Import from Desktop
claude mcp list                                         # List all servers
claude mcp get <name>                                   # Get server details
claude mcp remove <name>                                # Remove server
claude mcp reset-project-choices                        # Reset .mcp.json approvals
```

### 4.5 OAuth Authentication

```bash
# Add server requiring OAuth
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# Pre-configured OAuth credentials
claude mcp add --transport http \
  --client-id <id> --client-secret --callback-port 8080 \
  my-server https://mcp.example.com/mcp

# Authenticate in Claude Code
/mcp   # Then follow browser login flow
```

### 4.6 Managed MCP Configuration

**File locations**:
- macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`
- Linux/WSL: `/etc/claude-code/managed-mcp.json`
- Windows: `C:\Program Files\ClaudeCode\managed-mcp.json`

Provides **exclusive control** -- users cannot add, modify, or use other MCP servers.

**Policy-based control** (in managed settings):

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverCommand": ["npx", "-y", "@company/mcp-server"] },
    { "serverUrl": "https://mcp.company.com/*" }
  ],
  "deniedMcpServers": [
    { "serverName": "dangerous-server" },
    { "serverUrl": "https://*.untrusted.com/*" }
  ]
}
```

### 4.7 MCP Tool Search

Auto-enabled when MCP tool descriptions exceed 10% of context window.

```bash
ENABLE_TOOL_SEARCH=auto      # Default (activates at 10% threshold)
ENABLE_TOOL_SEARCH=auto:5    # Custom 5% threshold
ENABLE_TOOL_SEARCH=true      # Always enabled
ENABLE_TOOL_SEARCH=false     # Disabled
```

### 4.8 MCP Resources and Prompts

- **Resources**: Reference with `@server:protocol://resource/path` syntax
- **Prompts**: Available as `/mcp__<server>__<prompt>` commands

### 4.9 Environment Variables

| Variable               | Description                                  | Default |
|:-----------------------|:---------------------------------------------|:--------|
| `MCP_TIMEOUT`          | Server startup timeout (ms)                  | --      |
| `MCP_TOOL_TIMEOUT`     | Tool execution timeout (ms)                  | --      |
| `MAX_MCP_OUTPUT_TOKENS` | Max tokens in MCP responses                 | 25000   |
| `MCP_CLIENT_SECRET`    | Pre-configured OAuth client secret           | --      |
| `ENABLE_TOOL_SEARCH`   | Tool search mode                             | `auto`  |

---

## 5. Plugin Specification

**Source**: https://code.claude.com/docs/en/plugins, https://code.claude.com/docs/en/plugins-reference

Plugins extend Claude Code with skills, agents, hooks, MCP servers, and LSP servers.

### 5.1 Plugin Directory Structure

```
my-plugin/
  .claude-plugin/             # Metadata directory (required)
    plugin.json               # Plugin manifest (required)
  commands/                   # Slash command Markdown files
    status.md
  skills/                     # Agent Skills with SKILL.md
    code-review/
      SKILL.md
  agents/                     # Subagent definitions
    security-reviewer.md
  hooks/                      # Hook configurations
    hooks.json
  .mcp.json                   # MCP server definitions
  .lsp.json                   # LSP server configurations
  scripts/                    # Hook and utility scripts
    format.sh
```

**Important**: All component directories must be at the plugin root, NOT inside `.claude-plugin/`.

### 5.2 plugin.json Manifest Schema

```json
{
  "name": "plugin-name",
  "version": "1.2.0",
  "description": "Brief plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com/plugin",
  "repository": "https://github.com/author/plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "commands": ["./custom/commands/special.md"],
  "agents": "./custom/agents/",
  "skills": "./custom/skills/",
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "outputStyles": "./styles/",
  "lspServers": "./.lsp.json"
}
```

**Required fields**:

| Field  | Type   | Description                                |
|:-------|:-------|:-------------------------------------------|
| `name` | string | Unique identifier (kebab-case, no spaces)  |

**Metadata fields (optional)**:

| Field         | Type   | Description                 |
|:------------- |:-------|:----------------------------|
| `version`     | string | Semantic version            |
| `description` | string | Plugin purpose              |
| `author`      | object | `{name, email, url}`        |
| `homepage`    | string | Documentation URL           |
| `repository`  | string | Source code URL              |
| `license`     | string | License identifier          |
| `keywords`    | array  | Discovery tags              |

**Component path fields (optional)**:

| Field          | Type           | Description                           |
|:---------------|:---------------|:--------------------------------------|
| `commands`     | string/array   | Additional command files/directories  |
| `agents`       | string/array   | Additional agent files                |
| `skills`       | string/array   | Additional skill directories          |
| `hooks`        | string/object  | Hook config path or inline config     |
| `mcpServers`   | string/object  | MCP config path or inline config      |
| `outputStyles` | string/array   | Output style files/directories        |
| `lspServers`   | string/object  | LSP server configuration              |

### 5.3 Plugin Components

| Component      | Default Location           | Format                           |
|:---------------|:---------------------------|:---------------------------------|
| Skills         | `skills/`                  | `<name>/SKILL.md` directories    |
| Commands       | `commands/`                | `.md` files (legacy)             |
| Agents         | `agents/`                  | `.md` files with frontmatter     |
| Hooks          | `hooks/hooks.json`         | JSON config                      |
| MCP Servers    | `.mcp.json`                | MCP JSON config                  |
| LSP Servers    | `.lsp.json`                | LSP JSON config                  |

### 5.4 Plugin Hooks Configuration (hooks/hooks.json)

```json
{
  "description": "Automatic code formatting",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### 5.5 Plugin MCP Configuration

In `.mcp.json` at plugin root:
```json
{
  "database-tools": {
    "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
    "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
    "env": {
      "DB_URL": "${DB_URL}"
    }
  }
}
```

Or inline in `plugin.json`:
```json
{
  "name": "my-plugin",
  "mcpServers": {
    "plugin-api": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/api-server",
      "args": ["--port", "8080"]
    }
  }
}
```

### 5.6 Plugin LSP Configuration

In `.lsp.json`:
```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": {
      ".go": "go"
    }
  }
}
```

**Required LSP fields**: `command`, `extensionToLanguage`

**Optional LSP fields**: `args`, `transport` (`stdio`/`socket`), `env`, `initializationOptions`, `settings`, `workspaceFolder`, `startupTimeout`, `shutdownTimeout`, `restartOnCrash`, `maxRestarts`

### 5.7 Installation Scopes

| Scope     | Settings File                 | Use Case                                  |
|:----------|:------------------------------|:------------------------------------------|
| `user`    | `~/.claude/settings.json`     | Personal plugins, all projects (default)  |
| `project` | `.claude/settings.json`       | Team plugins, version controlled          |
| `local`   | `.claude/settings.local.json` | Project-specific, gitignored              |
| `managed` | `managed-settings.json`       | Org-wide, read-only                       |

### 5.8 Plugin CLI Commands

```bash
claude plugin install <plugin> [--scope user|project|local]
claude plugin uninstall <plugin> [--scope user|project|local]
claude plugin enable <plugin> [--scope user|project|local]
claude plugin disable <plugin> [--scope user|project|local]
claude plugin update <plugin> [--scope user|project|local|managed]
```

### 5.9 Marketplace Source Types

| Source      | Configuration Example                                              |
|:------------|:-------------------------------------------------------------------|
| `github`    | `{ "source": "github", "repo": "owner/repo", "ref": "main" }`    |
| `git`       | `{ "source": "git", "url": "https://...", "ref": "branch" }`     |
| `url`       | `{ "source": "url", "url": "https://..." }`                       |
| `npm`       | `{ "source": "npm", "package": "@scope/package" }`                |
| `file`      | `{ "source": "file", "path": "/absolute/path/marketplace.json" }` |
| `directory`  | `{ "source": "directory", "path": "/absolute/path" }`            |
| `hostPattern` | `{ "source": "hostPattern", "hostPattern": "^github\\.example\\.com$" }` |

### 5.10 Plugin Namespacing

Plugin skills are namespaced: `/plugin-name:skill-name`
- Prevents conflicts between plugins
- Plugin name from `plugin.json` becomes the namespace prefix

### 5.11 Environment Variable

| Variable                 | Description                                   |
|:-------------------------|:----------------------------------------------|
| `${CLAUDE_PLUGIN_ROOT}`  | Absolute path to plugin directory             |

---

## 6. Settings Specification

**Source**: https://code.claude.com/docs/en/settings, https://code.claude.com/docs/en/memory

### 6.1 Settings Hierarchy (highest to lowest precedence)

| Priority | Scope      | Location                                                   | Shareable |
|:---------|:-----------|:-----------------------------------------------------------|:----------|
| 1        | Managed    | `/Library/Application Support/ClaudeCode/` (macOS), `/etc/claude-code/` (Linux), `C:\Program Files\ClaudeCode\` (Windows) | Admin-controlled |
| 2        | CLI Args   | Command line flags                                         | Session only |
| 3        | Local      | `.claude/settings.local.json`                              | No (gitignored) |
| 4        | Project    | `.claude/settings.json`                                    | Yes (committed) |
| 5        | User       | `~/.claude/settings.json`                                  | No |

### 6.2 settings.json Complete Schema

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",

  "permissions": {
    "allow": ["Bash(npm run *)", "Read(src/**)"],
    "ask": ["Bash(git push *)"],
    "deny": ["Read(./.env)", "Bash(curl *)"],
    "additionalDirectories": ["../docs/"],
    "defaultMode": "acceptEdits",
    "disableBypassPermissionsMode": "disable"
  },

  "env": {
    "NODE_ENV": "development"
  },

  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "./check.sh" }]
      }
    ]
  },

  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["git"],
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org"],
      "allowAllUnixSockets": false,
      "allowLocalBinding": true
    }
  },

  "attribution": {
    "commit": "Co-Authored-By: AI <ai@example.com>",
    "pr": "Generated with Claude Code"
  },

  "model": "claude-sonnet-4-5-20250929",
  "outputStyle": "Explanatory",
  "language": "english",
  "autoUpdatesChannel": "stable",
  "cleanupPeriodDays": 30,
  "alwaysThinkingEnabled": false,
  "showTurnDuration": true,
  "respectGitignore": true,
  "disableAllHooks": false,
  "allowManagedHooksOnly": false,
  "allowManagedPermissionRulesOnly": false,

  "enabledPlugins": {
    "formatter@team-tools": true
  },
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": { "source": "github", "repo": "org/plugins" }
    }
  },
  "strictKnownMarketplaces": [],

  "enableAllProjectMcpServers": false,
  "enabledMcpjsonServers": [],
  "disabledMcpjsonServers": [],
  "allowedMcpServers": [],
  "deniedMcpServers": [],

  "spinnerVerbs": { "mode": "append", "verbs": ["Pondering"] },
  "spinnerTipsEnabled": true,
  "terminalProgressBarEnabled": false,
  "prefersReducedMotion": false,

  "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" },
  "fileSuggestion": { "type": "command", "command": "~/.claude/file-suggest.sh" },

  "companyAnnouncements": ["Welcome!"],
  "forceLoginMethod": "claudeai",
  "forceLoginOrgUUID": "uuid-string",
  "apiKeyHelper": "/bin/generate_api_key.sh",
  "plansDirectory": "./plans"
}
```

### 6.3 Permission Rule Syntax

Format: `Tool` or `Tool(specifier)`

| Rule                              | Effect                                |
|:----------------------------------|:--------------------------------------|
| `Bash`                            | All bash commands                     |
| `Bash(npm run *)`                 | Commands starting with `npm run`      |
| `Read(./.env)`                    | Reading specific file                 |
| `Edit(src/*)`                     | Editing files in src/                 |
| `WebFetch(domain:example.com)`    | Fetches to specific domain            |
| `MCP(memory)`                     | MCP memory tool                       |
| `Task(*)`                         | All background tasks                  |
| `Task(Explore)`                   | Specific subagent type                |
| `Skill(commit)`                   | Specific skill                        |
| `Skill(review-pr *)`             | Skill prefix match                    |

Evaluation order: Deny -> Ask -> Allow (first match wins)

### 6.4 CLAUDE.md Memory Specification

**File Locations**:

| Type              | Location                                                                    | Purpose                          |
|:------------------|:----------------------------------------------------------------------------|:---------------------------------|
| Managed policy    | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS), `/etc/claude-code/CLAUDE.md` (Linux) | Organization-wide instructions |
| Project memory    | `./CLAUDE.md` or `./.claude/CLAUDE.md`                                      | Team-shared instructions         |
| Project rules     | `./.claude/rules/*.md`                                                      | Modular topic-specific rules     |
| User memory       | `~/.claude/CLAUDE.md`                                                       | Personal global preferences      |
| User rules        | `~/.claude/rules/*.md`                                                      | Personal rules, all projects     |
| Local memory      | `./CLAUDE.local.md`                                                         | Personal project-specific (gitignored) |

**Format**: Plain Markdown. No special syntax required.

**Import syntax**: `@path/to/file` imports other files. Supports:
- Relative paths (resolved from containing file)
- Absolute paths
- Home directory: `@~/.claude/my-instructions.md`
- Max recursion depth: 5 hops
- Not evaluated inside code spans/blocks
- First-time import shows approval dialog

**Path-specific rules** (`.claude/rules/*.md`):
```yaml
---
paths:
  - "src/api/**/*.ts"
  - "src/**/*.{ts,tsx}"
---

# API Development Rules
- All endpoints must include input validation
```

**Automatic discovery**:
- Recurses up from cwd to root, reading CLAUDE.md at each level
- Discovers nested CLAUDE.md in subtrees when reading files in those subtrees
- `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` loads from `--add-dir` directories

### 6.5 Key Environment Variables

**Authentication**: `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_CUSTOM_HEADERS`

**Model**: `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL`

**Backend**: `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `CLAUDE_CODE_USE_FOUNDRY`

**Execution**: `BASH_DEFAULT_TIMEOUT_MS`, `BASH_MAX_TIMEOUT_MS`, `BASH_MAX_OUTPUT_LENGTH`, `CLAUDE_CODE_SHELL`

**MCP**: `MCP_TIMEOUT`, `MCP_TOOL_TIMEOUT`, `MAX_MCP_OUTPUT_TOKENS`, `ENABLE_TOOL_SEARCH`

**Thinking**: `MAX_THINKING_TOKENS`, `CLAUDE_CODE_MAX_OUTPUT_TOKENS`

**Context**: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, `SLASH_COMMAND_TOOL_CHAR_BUDGET`

**UI**: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`, `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION`, `DISABLE_COST_WARNINGS`

**Directories**: `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_TMPDIR`

---

## 7. Checkpointing Specification

**Source**: https://code.claude.com/docs/en/checkpointing

### 7.1 How Auto-Tracking Works

- Every user prompt creates a new checkpoint
- Tracks all changes made by Claude's file editing tools (Write, Edit)
- Checkpoints persist across sessions (available in resumed conversations)
- Automatically cleaned up after 30 days (configurable via `cleanupPeriodDays`)

### 7.2 Rewind Capabilities

**Access**: Press `Esc` twice (`Esc + Esc`) or use `/rewind` command

**Rewind modes**:

| Mode                      | Effect                                                    |
|:--------------------------|:----------------------------------------------------------|
| Conversation only         | Rewind to a user message while keeping code changes       |
| Code only                 | Revert file changes while keeping the conversation        |
| Both code and conversation | Restore both to a prior point in the session             |

### 7.3 Limitations

| Limitation                     | Detail                                                          |
|:-------------------------------|:----------------------------------------------------------------|
| Bash commands not tracked      | `rm`, `mv`, `cp`, `sed` and other bash file modifications are NOT tracked |
| External changes not tracked   | Manual edits outside Claude Code not captured                   |
| Session scope only             | Only tracks files edited within the current session              |
| Not a VCS replacement          | Complements but does not replace Git                            |

---

## 8. CLI Modes Specification

**Source**: https://code.claude.com/docs/en/headless, https://code.claude.com/docs/en/interactive-mode

### 8.1 Interactive Mode (default)

Standard REPL mode launched with `claude` command.

**Features**:
- Multi-turn conversation with context persistence
- Permission prompts for tool approvals
- Keyboard shortcuts (Ctrl+C, Ctrl+O, Ctrl+B, Esc+Esc, etc.)
- Built-in commands (`/clear`, `/compact`, `/rewind`, `/mcp`, `/memory`, `/hooks`, `/agents`, etc.)
- Vim editor mode (`/vim`)
- Background task management (`Ctrl+B`, `/tasks`)
- `!command` bash mode (prefix with `!` for direct shell execution)
- `@file` mentions for file path autocomplete
- `/command` for skills and built-in commands
- Prompt suggestions (auto-generated, Tab to accept)
- Task list tracking for multi-step work

### 8.2 Headless / Print Mode (`-p` flag)

Non-interactive mode for scripts, CI/CD, and automation.

```bash
claude -p "Find and fix the bug in auth.py" --allowedTools "Read,Edit,Bash"
```

**Key flags**:

| Flag                        | Description                                          |
|:----------------------------|:-----------------------------------------------------|
| `-p, --print`               | Run non-interactively                                |
| `--output-format text`      | Plain text output (default)                          |
| `--output-format json`      | Structured JSON with result, session_id, metadata    |
| `--output-format stream-json` | Newline-delimited JSON for real-time streaming     |
| `--json-schema '<schema>'`  | Enforce output schema (used with `--output-format json`) |
| `--allowedTools "T1,T2"`    | Auto-approve specific tools                          |
| `--continue`                | Continue most recent conversation                    |
| `--resume <session-id>`     | Resume specific conversation                         |
| `--append-system-prompt`    | Add to default system prompt                         |
| `--system-prompt`           | Replace entire system prompt                         |
| `--verbose`                 | Enable verbose output (with stream-json)             |
| `--include-partial-messages` | Include token-level streaming events                |

### 8.3 SDK Mode

Full programmatic control via Python and TypeScript packages:
- Python: `from anthropic import Agent`
- TypeScript: `import { Agent } from '@anthropic-ai/agent'`
- Structured outputs, tool approval callbacks, native message objects

### 8.4 Output Format Details

**JSON output** (`--output-format json`):
```json
{
  "result": "The text response from Claude",
  "session_id": "abc123",
  "structured_output": { ... },
  "usage": { ... }
}
```

**Stream JSON** (`--output-format stream-json`):
```json
{"type": "stream_event", "event": {"delta": {"type": "text_delta", "text": "..."}}}
```

### 8.5 Common Patterns

```bash
# Create a commit
claude -p "Look at staged changes and create a commit" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git commit *)"

# Code review with custom prompt
gh pr diff "$1" | claude -p \
  --append-system-prompt "You are a security engineer." \
  --output-format json

# Extract structured data
claude -p "Extract function names from auth.py" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}}}'

# Continue conversation
session_id=$(claude -p "Start review" --output-format json | jq -r '.session_id')
claude -p "Continue review" --resume "$session_id"
```

---

## 9. Integration Matrix

This matrix shows how specifications integrate with each other.

### 9.1 Cross-Specification Integration Points

| Feature A | Feature B | Integration Point |
|:----------|:----------|:------------------|
| **Hooks** | **Skills** | Skills can define hooks in frontmatter; hooks scoped to skill lifecycle |
| **Hooks** | **Subagents** | Subagents define hooks in frontmatter; `SubagentStart`/`SubagentStop` events in settings |
| **Hooks** | **Plugins** | Plugins bundle hooks in `hooks/hooks.json`; `${CLAUDE_PLUGIN_ROOT}` for paths |
| **Hooks** | **MCP** | MCP tools matched via `mcp__<server>__<tool>` pattern in PreToolUse/PostToolUse |
| **Hooks** | **Settings** | Hooks configured in settings.json; `disableAllHooks`, `allowManagedHooksOnly` |
| **Skills** | **Subagents** | Skills use `context: fork` + `agent:` to run in subagent; Subagents preload skills via `skills:` field |
| **Skills** | **Plugins** | Plugins provide skills in `skills/` directory, namespaced as `/plugin:skill` |
| **Skills** | **Settings** | `SLASH_COMMAND_TOOL_CHAR_BUDGET` controls description budget; permission rules with `Skill()` |
| **Subagents** | **Plugins** | Plugins provide agents in `agents/` directory |
| **Subagents** | **MCP** | MCP tools available to subagents (except background agents); subagents inherit MCP config |
| **Subagents** | **Settings** | `Task()` permission rules; `CLAUDE_CODE_SUBAGENT_MODEL` env var |
| **MCP** | **Plugins** | Plugins bundle MCP servers in `.mcp.json` or inline in `plugin.json` |
| **MCP** | **Settings** | `allowedMcpServers`, `deniedMcpServers`, `enableAllProjectMcpServers` in settings |
| **Plugins** | **Settings** | `enabledPlugins`, `extraKnownMarketplaces`, `strictKnownMarketplaces` in settings |
| **CLAUDE.md** | **Skills** | Both provide context; CLAUDE.md loaded at startup, skills loaded on invocation |
| **CLAUDE.md** | **Subagents** | Subagents load CLAUDE.md; memory field creates persistent MEMORY.md |
| **Checkpoints** | **All** | Checkpoints track Write/Edit tool changes regardless of source (skill, hook, agent) |

### 9.2 File Location Summary

| File/Directory                     | Purpose                                    |
|:-----------------------------------|:-------------------------------------------|
| `~/.claude/settings.json`          | User settings                              |
| `~/.claude/CLAUDE.md`              | User memory                                |
| `~/.claude/rules/*.md`             | User rules                                 |
| `~/.claude/skills/*/SKILL.md`      | User skills                                |
| `~/.claude/agents/*.md`            | User subagents                             |
| `~/.claude/agent-memory/*/`        | User-scoped agent memory                   |
| `~/.claude.json`                   | MCP servers (user + local scope)           |
| `.claude/settings.json`            | Project settings                           |
| `.claude/settings.local.json`      | Local settings (gitignored)                |
| `.claude/CLAUDE.md`                | Project memory (alt location)              |
| `.claude/rules/*.md`               | Project rules                              |
| `.claude/skills/*/SKILL.md`        | Project skills                             |
| `.claude/agents/*.md`              | Project subagents                          |
| `.claude/agent-memory/*/`          | Project-scoped agent memory                |
| `.claude/agent-memory-local/*/`    | Local-scoped agent memory (gitignored)     |
| `CLAUDE.md`                        | Project memory (root location)             |
| `CLAUDE.local.md`                  | Local project memory (gitignored)          |
| `.mcp.json`                        | Project MCP servers (committed)            |
| `.claude-plugin/plugin.json`       | Plugin manifest                            |

### 9.3 Managed/Enterprise File Locations

| File                        | macOS Path                                      | Linux/WSL Path                | Windows Path                        |
|:----------------------------|:------------------------------------------------|:------------------------------|:------------------------------------|
| `managed-settings.json`    | `/Library/Application Support/ClaudeCode/`      | `/etc/claude-code/`           | `C:\Program Files\ClaudeCode\`      |
| `managed-mcp.json`          | `/Library/Application Support/ClaudeCode/`      | `/etc/claude-code/`           | `C:\Program Files\ClaudeCode\`      |
| `CLAUDE.md` (managed)       | `/Library/Application Support/ClaudeCode/`      | `/etc/claude-code/`           | `C:\Program Files\ClaudeCode\`      |

---

## Sources

All specifications sourced from official Claude Code documentation (February 2026):

- Hooks: https://code.claude.com/docs/en/hooks
- Skills: https://code.claude.com/docs/en/skills
- Sub-Agents: https://code.claude.com/docs/en/sub-agents
- MCP: https://code.claude.com/docs/en/mcp
- Plugins: https://code.claude.com/docs/en/plugins
- Plugins Reference: https://code.claude.com/docs/en/plugins-reference
- Settings: https://code.claude.com/docs/en/settings
- Memory: https://code.claude.com/docs/en/memory
- Checkpointing: https://code.claude.com/docs/en/checkpointing
- Headless/SDK Mode: https://code.claude.com/docs/en/headless
- Interactive Mode: https://code.claude.com/docs/en/interactive-mode
