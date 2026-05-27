# Claude Code Settings Reference

**Source**: https://claudefa.st/blog/guide/settings-reference
**Fetched**: 2026-04-18
**Fidelity**: [VERBATIM]

> Third-party page, but the content here reproduces the documented Claude Code settings
> schema. Cross-check against the Anthropic-official docs at
> https://docs.anthropic.com/en/docs/claude-code/settings when using in production.

---

## The 5-Scope Hierarchy

Settings precedence, highest to lowest:

1. **Managed** — System directories (IT-deployed)
2. **Command line** — CLI flags (current session)
3. **Local** — `.claude/settings.local.json` (personal, gitignored)
4. **Project** — `.claude/settings.json` (shared in git)
5. **User** — `~/.claude/settings.json` (personal defaults)

Higher scopes override lower ones. Managed policies cannot be bypassed by any user or project setting.

## File Locations by Scope

| Feature | User | Project | Local |
|---------|------|---------|-------|
| Settings | `~/.claude/settings.json` | `.claude/settings.json` | `.claude/settings.local.json` |
| Subagents | `~/.claude/agents/` | `.claude/agents/` | N/A |
| MCP servers | `~/.claude.json` | `.mcp.json` | `~/.claude.json` |
| CLAUDE.md | `~/.claude/CLAUDE.md` | `CLAUDE.md` or `.claude/CLAUDE.md` | `CLAUDE.local.md` |

## Managed Settings Paths by OS

- **macOS**: `/Library/Application Support/ClaudeCode/`
- **Linux/WSL**: `/etc/claude-code/`
- **Windows**: `C:\Program Files\ClaudeCode\`

Files: `managed-settings.json` and `managed-mcp.json`

## All Settings Keys by Category

### General Settings

| Key | Description | Default |
|-----|-------------|---------|
| `model` | Override default model | (system default) |
| `language` | Response language preference | English |
| `outputStyle` | System prompt adjustment | (none) |
| `cleanupPeriodDays` | Inactive session deletion threshold | 30 |
| `autoUpdatesChannel` | Release channel (`"stable"` or `"latest"`) | `"latest"` |
| `showTurnDuration` | Display response timing | `true` |
| `spinnerVerbs` | Customize spinner text | (defaults) |
| `spinnerTipsEnabled` | Show tips during processing | `true` |
| `terminalProgressBarEnabled` | Terminal progress bar display | `true` |
| `alwaysThinkingEnabled` | Extended thinking default state | `false` |
| `plansDirectory` | Plan file storage location | `~/.claude/plans` |
| `respectGitignore` | File picker respects `.gitignore` | `true` |
| `companyAnnouncements` | Startup messages (random cycle) | (none) |

### Permission Settings

Located within the `"permissions"` object. Rule evaluation order: **deny → ask → allow** (first match wins).

| Key | Description | Example |
|-----|-------------|---------|
| `allow` | Auto-allow tool use rules | `["Bash(npm run lint)", "Read(~/.zshrc)"]` |
| `ask` | Rules requiring confirmation | `["Bash(git push *)"]` |
| `deny` | Block tool use entirely | `["WebFetch", "Read(./.env)"]` |
| `additionalDirectories` | Extra accessible directories | `["../docs/", "../shared/"]` |
| `defaultMode` | Default permission mode | `"acceptEdits"` |
| `disableBypassPermissionsMode` | Block permission bypass flag | `"disable"` |

Rule syntax examples:

- `Bash` — All Bash commands
- `Bash(npm run *)` — Commands starting with "npm run"
- `Read(./.env)` — Reading specific file
- `Read(./secrets/**)` — Recursive directory matching
- `WebFetch(domain:example.com)` — Domain-specific fetch requests

> **Disambiguation: `defaultMode` vs AICodePath auto-mode-detector**
>
> Claude Code's native `defaultMode` setting (`"acceptEdits"`, `"plan"`, etc.) controls the *initial* permission mode when a session starts. AICodePath's `auto-mode-detector` hook (formerly `auto-workflow-router`) dynamically *switches* the permission mode mid-session based on task complexity and workflow phase. They are complementary — `defaultMode` sets the baseline, and `auto-mode-detector` adjusts from there. If both are active, the hook's mid-session switch takes precedence over the static default.

### Sandbox Settings

Within the `"sandbox"` object. Controls bash command isolation.

| Key | Description | Default | Example |
|-----|-------------|---------|---------|
| `enabled` | Enable bash sandboxing | `false` | `true` |
| `autoAllowBashIfSandboxed` | Auto-approve sandboxed commands | `true` | `true` |
| `excludedCommands` | Commands running outside sandbox | (none) | `["git", "docker"]` |
| `allowUnsandboxedCommands` | Allow sandbox escape flag | `true` | `false` |
| `enableWeakerNestedSandbox` | Weaker sandbox for Docker (Linux/WSL2) | `false` | `true` |
| `network.allowedDomains` | Outbound domain whitelist | (none) | `["github.com", "*.npmjs.org"]` |
| `network.deniedDomains` | Block specific domains (v2.1.113+) | (none) | `["evil.example.com"]` |
| `network.allowUnixSockets` | Unix socket paths | (none) | `["~/.ssh/agent-socket"]` |
| `network.allowAllUnixSockets` | Allow all Unix sockets | `false` | `true` |
| `network.allowLocalBinding` | Localhost binding (macOS) | `false` | `true` |
| `network.httpProxyPort` | HTTP proxy port | (auto) | `8080` |
| `network.socksProxyPort` | SOCKS5 proxy port | (auto) | `8081` |

### Attribution Settings

Within the `"attribution"` object. Controls git contribution marking.

| Key | Description | Default |
|-----|-------------|---------|
| `commit` | Text appended to commit messages | `"Generated with Claude Code..."` + Co-Authored-By trailer |
| `pr` | Text appended to PR descriptions | `"Generated with Claude Code..."` |

Empty string `""` hides attribution. Legacy `includeCoAuthoredBy` still works but deprecated.

### Plugin Settings

| Key | Description | Example |
|-----|-------------|---------|
| `enabledPlugins` | Toggle plugins on/off | `{"formatter@acme-tools": true}` |
| `extraKnownMarketplaces` | Additional plugin sources | See example |
| `strictKnownMarketplaces` | (Managed only) Restrict marketplace sources | `[{"source": "github", "repo": "acme/plugins"}]` |

Marketplace source types: `github` (repo), `git` (any URL), `directory` (local), `hostPattern` (regex).

### MCP Server Settings

| Key | Description | Example |
|-----|-------------|---------|
| `enableAllProjectMcpServers` | Auto-approve all project MCP servers | `true` |
| `enabledMcpjsonServers` | Specific MCP servers to approve | `["memory", "github"]` |
| `disabledMcpjsonServers` | Specific MCP servers to reject | `["filesystem"]` |
| `allowedMcpServers` | (Managed only) MCP allowlist | `[{"serverName": "github"}]` |
| `deniedMcpServers` | (Managed only) MCP denylist | `[{"serverName": "filesystem"}]` |

### Authentication and Provider Settings

| Key | Description | Example |
|-----|-------------|---------|
| `apiKeyHelper` | Script generating auth value | `"/bin/generate_temp_api_key.sh"` |
| `forceLoginMethod` | Restrict to `claudeai` or `console` | `"claudeai"` |
| `forceLoginOrgUUID` | Auto-select organization during login | `"xxxxxxxx-xxxx-..."` |
| `awsAuthRefresh` | Script refreshing AWS credentials | `"aws sso login --profile myprofile"` |
| `awsCredentialExport` | Script outputting AWS credential JSON | `"/bin/generate_aws_grant.sh"` |
| `otelHeadersHelper` | Script generating OpenTelemetry headers | `"/bin/generate_otel_headers.sh"` |

### Hook and Advanced Settings

| Key | Description | Example |
|-----|-------------|---------|
| `hooks` | Lifecycle event hook configuration | See hooks guide |
| `disableAllHooks` | Disable all hooks | `true` |
| `allowManagedHooksOnly` | (Managed only) Block user/project hooks | `true` |
| `allowManagedPermissionRulesOnly` | (Managed only) Block user/project permission rules | `true` |
| `fileSuggestion` | Custom `@` file autocomplete script | `{"type": "command", "command": "~/.claude/file-suggestion.sh"}` |
| `statusLine` | Custom status line display | `{"type": "command", "command": "~/.claude/statusline.sh"}` |
| `env` | Session environment variables | `{"FOO": "bar"}` |

### File Suggestion Configuration

Custom command receives JSON via stdin with a `query` field, outputs newline-separated file paths (max 15 results). Available env vars include `CLAUDE_PROJECT_DIR`.

## Essential Environment Variables

### Model and Provider

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | API key for direct API access |
| `ANTHROPIC_MODEL` | Override default model |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Model name for Sonnet alias |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Model for subagents |
| `CLAUDE_CODE_USE_BEDROCK` | Route through AWS Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | Route through Google Vertex |

### Performance Tuning

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max output tokens (default: 32K, max: 64K) |
| `MAX_THINKING_TOKENS` | Extended thinking budget (default: 31,999) |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | Context capacity % (1-100) triggering auto-compaction |
| `BASH_DEFAULT_TIMEOUT_MS` | Default bash command timeout |
| `BASH_MAX_TIMEOUT_MS` | Maximum bash timeout Claude can set |
| `BASH_MAX_OUTPUT_LENGTH` | Max bash output chars before truncation |
| `ENABLE_PROMPT_CACHING_1H` | 1-hour prompt cache TTL (v2.1.108+) |
| `FORCE_PROMPT_CACHING_5M` | Force 5-minute TTL |

### Privacy and Telemetry

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Disable updates, telemetry, error reporting |
| `DISABLE_TELEMETRY` | Opt out of Statsig telemetry |
| `DISABLE_ERROR_REPORTING` | Opt out of Sentry error reporting |
| `CLAUDE_CODE_HIDE_ACCOUNT_INFO` | Hide email and org name from UI |
| `DISABLE_AUTOUPDATER` | Disable automatic version updates |
| `OTEL_LOG_RAW_API_BODIES` | Emit full API bodies as OTel log events (v2.1.111+) |

### Session Control

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_TASK_LIST_ID` | Share task list across multiple sessions |
| `CLAUDE_CODE_ENABLE_TASKS` | Set `false` to revert to old TODO list |
| `CLAUDE_CODE_SHELL` | Override automatic shell detection |
| `CLAUDE_CONFIG_DIR` | Custom config/data directory location |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Set `1` to enable native Agent Teams |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | Windows default / Linux/mac opt-in PowerShell tool |
| `MCP_TIMEOUT` | MCP server startup timeout (ms) |
| `MCP_TOOL_TIMEOUT` | MCP tool execution timeout (ms) |

## Practical Configuration Examples

### Starter Config (Personal Use)

```json
{
  "$schema": "https://json-schema.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)"
    ],
    "deny": ["Read(./.env)", "Read(./.env.*)", "Read(~/.ssh/**)"]
  },
  "showTurnDuration": true,
  "autoUpdatesChannel": "stable"
}
```

### Team Config (Project Scope)

```json
{
  "$schema": "https://json-schema.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)",
      "Bash(npx prettier --write *)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Bash(rm -rf *)",
      "Bash(git push --force *)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_TOOL_INPUT_FILE_PATH\""
          }
        ]
      }
    ]
  },
  "attribution": {
    "commit": "Generated with Claude Code\n\nCo-Authored-By: Claude <noreply>",
    "pr": "Generated with Claude Code"
  }
}
```

### Enterprise Config (Managed Scope)

```json
{
  "$schema": "https://json-schema.org/claude-code-settings.json",
  "permissions": {
    "deny": [
      "Bash(curl *)",
      "Bash(wget *)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./config/credentials.*)"
    ],
    "disableBypassPermissionsMode": "disable"
  },
  "sandbox": {
    "enabled": true,
    "allowUnsandboxedCommands": false,
    "network": {
      "allowedDomains": [
        "github.com",
        "*.npmjs.org",
        "registry.yarnpkg.com",
        "*.internal.acme.com"
      ]
    }
  },
  "allowManagedHooksOnly": true,
  "allowManagedPermissionRulesOnly": true,
  "forceLoginMethod": "console",
  "strictKnownMarketplaces": [
    {
      "source": "github",
      "repo": "acme-corp/approved-plugins"
    }
  ],
  "companyAnnouncements": [
    "All code requires review before merge. See docs.acme.com/security",
    "Report AI-related security concerns to the security team"
  ]
}
```

## Settings Precedence in Practice

- **Permission conflict**: Project scope denies, but local allows. Local wins (priority 3 > priority 4).
- **Managed override**: Team project allows a command, but managed setting denies it. Managed always wins. No override possible.
- **Local experimentation**: Add hooks to `.claude/settings.local.json` for personal testing before proposing to team. Git automatically ignores `.local.` files.
- **Settings merging**: Permission arrays merge across scopes. Both `allow` rules from different scopes apply simultaneously.
- **Environment variables**: Shell exports take precedence over `settings.json`'s `env` object.

## Config Backup Behavior

Claude Code automatically creates timestamped backups when configuration changes, retaining the five most recent versions.

## Schema Validation

```json
{
  "$schema": "https://json-schema.org/claude-code-settings.json"
}
```

Works in VS Code, Cursor, and any editor supporting JSON schema.
