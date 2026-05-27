# AICodePath Statusline Dashboard

## Overview

The AICodePath Statusline Dashboard provides real-time visibility into your Claude Code session directly in the terminal. It displays context token usage, workflow phase, git branch, and project information without interrupting your workflow.

## Display Format

```
[ Claude: Opus ] [ ████████░░ 78% ] [ CONSTRUCTION ] [ feature/auth ] [ my-project ]
  ↑ Cyan          ↑ Color-coded      ↑ Phase color   ↑ Purple         ↑ Orange
```

### Elements

| Element | Description | Color |
|---------|-------------|-------|
| Model | Active Claude model (Sonnet, Opus, etc.) | Cyan |
| Context Bar | Visual progress bar + percentage | Green/Yellow/Red |
| Phase | Current AICodePath workflow phase | White/Cyan/Blue/Green |
| Branch | Current git branch | Purple |
| Project | Project folder name | Orange |

## Context Token Thresholds

| Usage | Color | Meaning |
|-------|-------|---------|
| 0-59% | Green | Healthy - plenty of context remaining |
| 60-79% | Yellow | Warning - context getting full |
| 80-100% | Red | Critical - context nearly exhausted |

**Why this matters:** When context reaches 100%, Claude triggers `compact` which summarizes the conversation, potentially losing important context like architectural decisions or constraints.

### Context Percentage Calculation

The statusline uses the CLI's pre-calculated `used_percentage` field (input tokens only), which matches the CLI's own context display. If `used_percentage` is not available, it falls back to manual calculation from `current_usage` token counts.

**Important:** Use `printf '%b'` (not `echo -e`) in Bash statusline scripts for reliable ANSI escape code rendering across shells.

## AICodePath Phase Colors

| Phase | Color | Description |
|-------|-------|-------------|
| PRE-FLIGHT | White | Environment verification |
| INCEPTION | Cyan | Requirements and planning |
| CONSTRUCTION | Blue | Design and implementation |
| OPERATIONS | Green | Deployment and tracking |

## Setup

### Quick Setup

Run the setup skill:

```
/aicodepath-statusline
```

This will:
1. Detect your operating system
2. Check for dependencies (jq, Python)
3. Recommend the appropriate script
4. Generate Claude Code settings

### Manual Setup

1. **Add to `.claude/settings.json`:**

```json
{
  "statusLine": {
    "type": "command",
    "command": "/path/to/aicodepath/scripts/statusline.sh",
    "padding": 0
  }
}
```

2. **For Python fallback (no jq required):**

```json
{
  "statusLine": {
    "type": "command",
    "command": "python3 /path/to/aicodepath/scripts/statusline.py",
    "padding": 0
  }
}
```

3. **For Windows PowerShell:**

```json
{
  "statusLine": {
    "type": "command",
    "command": "powershell -File C:\\path\\to\\aicodepath\\scripts\\statusline.ps1",
    "padding": 0
  }
}
```

## Installation Options

### Hybrid Installation (Recommended)

Central scripts with per-project overrides:

```
~/.aicodepath/                    # Central installation
├── statusline.sh
├── statusline.py
├── statusline.ps1
└── statusline-config.json        # Global preferences

.aicodepath/                      # Per-project override
└── statusline-config.json        # Project-specific settings
```

Install centrally with:
```bash
node scripts/statusline-setup.js --install-central
```

### Per-Project Installation

Use the scripts directly from the AICodePath project:
```
./scripts/statusline.sh
./scripts/statusline.py
./scripts/statusline.ps1
```

## Dependencies

### Bash Script (statusline.sh)
- Requires: `jq` for JSON parsing
- Install jq:
  - macOS: `brew install jq`
  - Ubuntu/Debian: `sudo apt install jq`
  - Fedora: `sudo dnf install jq`

### Python Script (statusline.py)
- Requires: Python 3.6+
- No external dependencies (uses stdlib only)

### PowerShell Script (statusline.ps1)
- Requires: PowerShell 5.1+ or PowerShell Core 7+
- No external dependencies

## Troubleshooting

### Token percentage not updating
- **Cause:** JSON parsing error
- **Fix:** Verify jq is installed (`jq --version`)
- **Alternative:** Use Python script instead

### Percentage doesn't match CLI display
- **Behavior:** Prior to v1.1.1, the statusline showed percentage of full context window, while CLI shows percentage until auto-compact
- **Fix:** Updated in v1.1.1 to calculate against auto-compact threshold (~77% of context window)
- **Result:** Statusline percentage now aligns with CLI's "Context left until auto-compact" (100% - statusline% ≈ CLI remaining%)

### Context percentage doesn't refresh after /compact
- **Behavior:** The statusline context percentage only updates when there's conversation activity (user messages, tool calls, responses)
- **Why:** Claude Code provides statusline data on activity events, not continuously
- **Expected:** After running `/compact`, send a message or trigger any action to see the updated context percentage
- **Example:** Context shows 67% → run `/compact` → still shows 67% → send any message → now shows ~22%
- **Note:** This is normal behavior, not a bug. The compaction worked correctly; the display just needs activity to refresh.

### Wrong folder shown
- **Cause:** Path detection mismatch
- **Fix:** The script uses Claude Code's `workspace.project_dir` or `cwd`

### Colors not rendering
- **Cause:** Terminal doesn't support ANSI colors
- **Fix:** Use a modern terminal (iTerm2, Windows Terminal, etc.)

### Phase not showing
- **Cause:** AICodePath knowledge base not initialized
- **Fix:** Run `/aicodepath-init` to initialize the KB

### Script not found
- **Cause:** Path in settings.json is incorrect
- **Fix:** Use absolute path to the script

## Debug Mode

To debug statusline issues:

1. Run the script manually with test input:
```bash
echo '{"model":{"display_name":"Opus"},"context_window":{"context_window_size":200000,"current_usage":{"input_tokens":50000}}}' | ./scripts/statusline.sh
```

2. Check for errors in the output

3. Verify KB database exists:
```bash
ls -la aicodepath-docs/aicodepath.db
```

## Configuration

### Custom Configuration File

Create `statusline-config.json` in `~/.aicodepath/` or `.aicodepath/`:

```json
{
  "elements": {
    "model": true,
    "context": true,
    "phase": true,
    "branch": true,
    "project": true
  },
  "thresholds": {
    "warning": 60,
    "critical": 80
  },
  "colors": {
    "model": "cyan",
    "contextHealthy": "green",
    "contextWarning": "yellow",
    "contextCritical": "red",
    "branch": "purple",
    "project": "orange"
  }
}
```

### Hiding Elements

To hide specific elements, set them to `false` in the config:

```json
{
  "elements": {
    "phase": false
  }
}
```

## Integration with AICodePath

The statusline integrates with the AICodePath knowledge base to display:

1. **Current Phase**: Shows PRE-FLIGHT, INCEPTION, CONSTRUCTION, or OPERATIONS
2. **Current Unit**: Shows the active unit being developed (e.g., `auth-module`)
3. **Validation Mode**: Can indicate strict vs relaxed validation

This data is queried from the `workflow_state` table in the SQLite knowledge base.

## Best Practices

1. **Monitor Context Usage**: Keep an eye on the context bar. When it turns yellow (60%+), consider:
   - Completing the current task
   - Starting a new conversation
   - Using `/compact` strategically
   - Note: After using `/compact`, send any message to see the refreshed context percentage

2. **Verify Branch**: Always check the branch display before making commits to ensure you're on the correct branch

3. **Watch for Phase Changes**: The phase indicator helps track workflow progress

4. **Use Python Fallback**: If you don't want to install jq, the Python script provides identical functionality with no dependencies

## Files

| File | Purpose |
|------|---------|
| `scripts/statusline.sh` | Bash statusline script (requires jq) |
| `scripts/statusline.py` | Python statusline script (no dependencies) |
| `scripts/statusline.ps1` | PowerShell statusline script |
| `scripts/statusline-kb-query.js` | Node.js helper for KB queries |
| `scripts/statusline-setup.js` | Interactive setup script |
