# Central Installation

**Purpose**: Enable single AICodePath installation serving multiple projects with project-specific overrides

**Approach**: Hybrid - Central rules + Project overrides

---

## Overview

The Central Installation approach allows a single AICodePath installation to serve multiple projects while supporting project-specific customizations. This reduces maintenance overhead and ensures consistent workflow across projects.

---

## Installation Methods

### Method 1: Global Installation (Recommended)

Install AICodePath centrally and configure Claude Code to use it:

```bash
# Clone to a central location
git clone https://github.com/your-org/aicodepath.git ~/.aicodepath

# Run installation script
~/.aicodepath/scripts/install-central.sh
```

This creates:
- Symlinks from `~/.claude/` to AICodePath configuration
- Environment variables for AICodePath paths
- Global settings for Claude Code

### Method 2: Project-Embedded Installation

Include AICodePath directly in a project:

```bash
# From project root
git clone https://github.com/your-org/aicodepath.git .aicodepath

# Link configuration
ln -s .aicodepath/.claude .claude
```

---

## Directory Structure

### Central Installation

```
~/.aicodepath/                      # Central AICodePath installation
├── .claude/
│   ├── settings.local.json    # Central settings
│   ├── hooks.json             # Central hooks
│   └── skills.json            # Central skills
├── rules/                     # All workflow rules
├── guidelines/                # Central guidelines
├── hooks/                     # Hook scripts
├── lib/                       # Library functions
├── scripts/                   # Utility scripts
└── state-templates/           # State file templates
```

### Project Override Structure

```
/path/to/project/
├── .claude/
│   └── settings.local.json    # Project-specific settings
├── .aicodepath-overrides/          # Project customizations
│   ├── config.json            # Override configuration
│   ├── guidelines/            # Guideline overlays (rule-level merge by id)
│   │   └── coding-standards.json
│   ├── rules/                 # Rule file overrides (file-level replacement)
│   │   └── core/
│   │       └── construction.md
│   └── hooks/                 # Hook overrides (applied at init time)
│       └── guideline-validator.js
├── aicodepath-docs/                # Project documentation
│   ├── context-state.json     # Session state
│   └── ...
└── ...
```

---

## Configuration Hierarchy

### Loading Order

1. **Central Configuration** (base)
   - `~/.aicodepath/rules/` - Base workflow rules
   - `~/.aicodepath/guidelines/` - Base coding guidelines
   - `~/.aicodepath/.claude/hooks.json` - Base hooks

2. **Project Overrides** (extends/overrides)
   - `.aicodepath-overrides/guidelines/` - Guideline overlays — rule-level merge by `id`; applied at **runtime** on every validator execution
   - `.aicodepath-overrides/rules/` - Rule file overrides — file-level replacement; applied at **runtime** on every rule load
   - `.aicodepath-overrides/hooks/` - Hook overrides — file-level replacement; applied at **init time** (`acp init` re-run required after changes)
   - `.aicodepath-overrides/config.json` - Override settings

3. **Project Settings** (final)
   - `.claude/settings.local.json` - Project Claude settings

### Override Config Format

`.aicodepath-overrides/config.json`:

```json
{
  "extends": "central",
  "project": "my-project",
  "version": "1.0.0",

  "rules": {
    "include": ["*"],
    "exclude": [],
    "override": {
      "construction/code-generation": {
        "enabled": true,
        "customizations": {
          "skipTests": false,
          "testFramework": "jest"
        }
      }
    }
  },

  "guidelines": {
    "extends": ["coding-standards", "security-rules"],
    "override": {
      "coding-standards": {
        "disabled": ["no-console-log"]
      }
    }
  },

  "hooks": {
    "pre-flight-check": { "enabled": true },
    "guideline-validator": { "enabled": true },
    "pre-commit-validator": { "enabled": true }
  },

  "git": {
    "autoCommit": true,
    "commitPrefix": "PROJ-",
    "requireSignoff": false
  },

  "preferences": {
    "cloud": "aws",
    "techStack": "managed",
    "storageFirst": true
  }
}
```

---

## Claude Code Integration

### Global Settings

`~/.claude/settings.json` (or `~/.config/claude-code/settings.json`):

```json
{
  "aicodepath": {
    "centralPath": "~/.aicodepath",
    "enabled": true,
    "version": "1.0.0"
  }
}
```

### Project Settings

`.claude/settings.local.json`:

```json
{
  "aicodepath": {
    "usesCentral": true,
    "overridesPath": ".aicodepath-overrides",
    "projectType": "greenfield"
  },
  "permissions": {
    "allow": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    "deny": []
  }
}
```

### CLAUDE.md Integration

Projects can reference AICodePath in their CLAUDE.md:

```markdown
# Project Guidelines

This project uses the AICodePath workflow system.

## AICodePath Configuration

- **Central Installation**: ~/.aicodepath
- **Project Overrides**: .aicodepath-overrides/
- **Project Type**: Greenfield

## Workflow Rules

Follow the AICodePath three-phase workflow:
1. INCEPTION - Requirements and planning
2. CONSTRUCTION - Design and implementation
3. OPERATIONS - Deployment and maintenance

For detailed instructions, see ~/.aicodepath/rules/core-workflow.md
```

---

## Installation Script

### install-central.sh

The installation script performs these steps:

1. **Verify Prerequisites**
   - Check Node.js version (>=18)
   - Check Claude Code installation
   - Check git installation

2. **Configure Paths**
   - Set AICodePath_HOME environment variable
   - Add to shell profile (.bashrc, .zshrc)

3. **Setup Symlinks**
   - Link hooks.json to ~/.claude/
   - Link skills.json to ~/.claude/

4. **Install Dependencies**
   - Install required npm packages
   - Verify MCP servers

5. **Validate Installation**
   - Run pre-flight check
   - Verify all plugins installed
   - Verify MCP servers available

---

## Project Initialization

### For New Projects

```bash
# Initialize AICodePath in a new project
~/.aicodepath/scripts/init-project.sh /path/to/project

# This creates:
# - .aicodepath-overrides/ directory
# - .aicodepath-overrides/config.json with defaults
# - aicodepath-docs/ directory structure
# - .claude/settings.local.json
```

### For Existing Projects

```bash
# Add AICodePath to existing project
cd /path/to/existing/project
~/.aicodepath/scripts/init-project.sh .

# Answer prompts about project type and preferences
```

---

## Updating Central Installation

### Update Process

```bash
# Update AICodePath to latest version
cd ~/.aicodepath
git pull origin main

# Verify installation
./scripts/validate-environment.sh

# Update any changed hooks
./scripts/update-hooks.sh
```

### Version Compatibility

Projects can specify AICodePath version requirements:

```json
{
  "aicodepath": {
    "minVersion": "1.0.0",
    "maxVersion": "2.0.0"
  }
}
```

If version mismatch detected, Claude will warn during pre-flight check.

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Rules not loading | AICodePath_HOME not set | Run `source ~/.bashrc` or restart terminal |
| Hooks not triggering | hooks.json not linked | Re-run `install-central.sh` |
| Overrides not applying | Invalid config.json | Validate JSON syntax |
| Plugin errors | Plugins not installed | Run `claude plugin install [plugin]` |

### Verification Commands

```bash
# Check AICodePath installation
echo $AICodePath_HOME

# Verify symlinks
ls -la ~/.claude/

# Test pre-flight check
node ~/.aicodepath/hooks/pre-flight-check.js

# Validate environment
~/.aicodepath/scripts/validate-environment.sh
```

---

## Multi-Project Workflow

### Switching Between Projects

When switching projects, Claude Code automatically:
1. Detects `.aicodepath-overrides/` if present
2. Loads project-specific configuration
3. Merges with central rules
4. Applies project preferences

### Shared vs Project-Specific

| Aspect | Shared (Central) | Project-Specific | Override mechanism |
|--------|-----------------|------------------|--------------------|
| Workflow phases | ✓ | | — |
| Core rules | ✓ | | — |
| Base guidelines | ✓ | | — |
| Hook scripts | ✓ | | — |
| Guideline customizations | | ✓ | `.aicodepath-overrides/guidelines/` — rule-level merge, runtime |
| Rule customizations | | ✓ | `.aicodepath-overrides/rules/` — file-level replace, runtime |
| Hook customizations | | ✓ | `.aicodepath-overrides/hooks/` — file-level replace, **init-time** |
| Tech stack preferences | | ✓ | `.aicodepath-overrides/config.json` |
| Commit settings | | ✓ | `.aicodepath-overrides/config.json` |
| State files | | ✓ | `aicodepath-docs/` |

---

## Security Considerations

### Central Installation Security

- Central installation should be read-only for projects
- Hooks execute with project permissions
- No secrets stored in central installation
- Project credentials remain in project scope

### Override Restrictions

Projects can customize but not:
- Disable security rules (without explicit override flag)
- Bypass pre-commit validation
- Remove required plugins
- Disable MCP capability checks

---

## References

- Installation script: `scripts/install-central.sh`
- Project initialization: `scripts/init-project.sh`
- Environment validation: `scripts/validate-environment.sh`
- Override configuration: `.aicodepath-overrides/config.json`
- Pre-flight check: `rules/common/pre-flight-check.md`
