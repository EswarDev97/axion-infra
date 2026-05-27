# Feature Flags

Feature flags control which AICodePath capabilities are active. They use a 4-tier priority system and persist to `config.json`.

---

## Priority Order

```
CLI override (in-memory, highest)
      ↓
config.json → features.flags
      ↓
Environment variable (backward compat)
      ↓
Compile-time default (fallback)
```

---

## CLI Commands

```bash
# List all flags with current state and source
node .aicodepath/bin/aicodepath.js features list

# Enable a flag (persists to config.json)
node .aicodepath/bin/aicodepath.js features enable <name>

# Disable a flag (persists to config.json)
node .aicodepath/bin/aicodepath.js features disable <name>

# Show flag metadata
node .aicodepath/bin/aicodepath.js features info <name>
```

---

## All 10 Feature Flags

| Name | Default | Description | Env Var Override |
|------|---------|-------------|-----------------|
| `gicl` | **ON** | Governed Iterative Construction Loop — quality scoring on every write | `AICODEPATH_GICL_DISABLED=true` to disable |
| `swarm` | OFF | Multi-agent orchestration via Claude Code Agent Teams | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` to enable |
| `schema_context` | **ON** | PreToolUse hook that injects DB schema into context for data-layer files | — |
| `visual_memory` | **ON** | ER diagram and visual artifact generation via SessionStart hook | — |
| `terminal` | **ON** | Multi-tab PTY terminal integration in dashboard | — |
| `duplication_checker` | **ON** | Code duplication detection with SQL-aware boilerplate filtering | — |
| `statusline` | **ON** | Real-time Claude Code statusline showing phase, token usage, progress | — |
| `mock_detection` | **ON** | Detects and blocks mock/stub implementations in production code | — |
| `frontend_designer` | **ON** | Adaptive frontend design review and validation | — |
| `ci_integration` | **ON** | CI/CD lint parity checks and pipeline validation | — |

---

## Flag Details

### gicl
- **Module:** `lib/gicl-session-manager.js`, `hooks/gicl-iteration-hook.js`
- **Effect:** When disabled, PostToolUse hook skips quality scoring entirely (silent pass-through)
- **When to disable:** Performance testing, batch migrations, or when GICL scoring causes false blocks
- **Env var:** `AICODEPATH_GICL_DISABLED=true` (note: inverted — this var disables the feature)

### swarm
- **Module:** `lib/swarm-availability-checker.js`, `hooks/settings-generator.js`
- **Effect:** When enabled, swarm hooks (SubagentStart, SubagentStop, TeammateIdle, TaskCompleted) are registered in `settings.json`. Requires Claude Code experimental agent teams.
- **Prerequisite:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` must also be set in Claude Code environment
- **When to enable:** Complex parallel construction tasks with multiple concurrent agents

### schema_context
- **Module:** `hooks/schema-context-hook.js`
- **Effect:** PreToolUse hook on Write|Edit — detects data-layer files, injects actual DB schema into Claude's context to prevent hallucinated column names
- **Fast path:** Reads cached `.claude/rules/schema-context.md` if fresh (< 1 hour)
- **When to disable:** Non-database projects where schema detection causes false positives

### visual_memory
- **Module:** `hooks/visual-memory-loader.js`
- **Effect:** SessionStart hook reads ER diagrams and class diagrams from `aicodepath-docs/memory/` and writes them to `.claude/rules/schema-context.md` for auto-loading
- **When to disable:** Projects with no visual memory artifacts (reduces startup overhead)

### terminal
- **Module:** `lib/terminal-session-manager.js`, `lib/terminal-websocket-handler.js`
- **Effect:** Enables the multi-tab xterm.js terminal in the dashboard (max 5 PTY sessions)
- **Security:** Command blocking, path validation, and sandbox modes are always active when terminal is on

### duplication_checker
- **Module:** `hooks/duplication-checker.js`
- **Effect:** PreToolUse hook on Write|Edit — compares file content against existing code for significant duplication (>40% similarity)
- **SQL-aware:** Has boilerplate pattern filtering (12 DDL patterns) and higher minimum line length (50 chars) for `.sql` files

### statusline
- **Module:** `lib/statusline.js`, `.claude/settings.json` statusLine config
- **Effect:** Configures Claude Code statusline showing AIDLC phase, context %, GICL score, active unit
- **Skill:** `/aicodepath-statusline` to configure or troubleshoot
- **Note:** Commands must be POSIX-compatible (not bash-specific) as Claude Code runs them with `sh`

### mock_detection
- **Module:** `hooks/guideline-validator.js` → `linting-rules.json` (`no-mock-in-production` rule)
- **Effect:** Detects stubs, mocks, and fake data in production code files
- **Bypass:** Add `// aicodepath: allow-stub` or `// aicodepath: allow-mock` to the file to suppress for that file

### frontend_designer
- **Module:** Agent `aicodepath-frontend-architect.md`, skill `/aicodepath-frontend-design-review`
- **Effect:** Enables adaptive frontend design validation — adjusts depth based on user expertise level
- **When to disable:** Backend-only projects

### ci_integration
- **Module:** `hooks/guideline-validator.js` → `devops-rules.json` (ci-cd rules)
- **Effect:** Validates CI/CD pipeline files against `test-before-deploy`, `lint-before-build`, `artifact-versioning` rules
- **Applied to:** `.github/workflows/*.yml`, Dockerfile, docker-compose.yml

---

## Programmatic Usage

```javascript
const { isEnabled, getInstance } = require('./.aicodepath/lib/feature-flags');

// Simple check
if (isEnabled('gicl')) {
  // Run GICL scoring
}

// Override for testing (in-memory, not persisted)
const flags = getInstance();
flags.setOverride('swarm', true);

// Clear override
flags.clearOverride('swarm');

// Persist change to config.json
flags.setEnabled('duplication_checker', false);

// List all flags
const all = flags.list();
// → [{name, enabled, default, description, source}, ...]
```

---

## Config File Location

`.aicodepath/config.json` → `features.flags` object:

```json
{
  "features": {
    "flags": {
      "gicl": true,
      "swarm": false,
      "schema_context": true,
      "duplication_checker": false
    }
  }
}
```

Only flags that differ from default need to appear in config. Absent flags fall through to env var or default.
