# Skill Trigger Hooks Documentation

This document describes the automatic skill suggestion system integrated into AICodePath hooks.

## Overview

Skill trigger hooks automatically suggest relevant skills to the user based on:
- Current workflow phase
- File operations detected
- User message content
- Project state and history

**Important**: These hooks are **informational only** - they never force execution of skills. Users can always ignore suggestions and continue with their current task.

## Hook Files

| Hook File | Phase | Triggers |
|-----------|-------|----------|
| `inception-skill-suggester.js` | INCEPTION | Brownfield analysis, commit analysis |
| `construction-skill-suggester.js` | CONSTRUCTION | Functional design, code generation, architecture |
| `maintenance-skill-suggester.js` | MAINTENANCE/OPERATIONS | Dependency updates |
| `document-skill-suggester.js` | Cross-phase | README creation/updates |

## Skill-to-Phase Mapping

### INCEPTION Phase

**Hook**: `inception-skill-suggester.js`

| Skill | When Suggested | Trigger Conditions |
|-------|----------------|-------------------|
| `aicodepath-mental-model` | During commit/diff analysis | Git operations detected (show, diff, log) |
| `codebase-pattern-finder` | Brownfield project analysis | Existing codebase detected, no reverse-engineering docs |

**Triggering Events**:
- Tool: `Bash` with git commands
- Phase: INCEPTION
- Project Type: Brownfield (has existing code)

**Example**:
```
User runs: git show abc1234
Hook suggests: 🧠 aicodepath-mental-model
Reason: "Understanding code changes is easier with mental models"
```

### CONSTRUCTION Phase

**Hook**: `construction-skill-suggester.js`

| Skill | When Suggested | Trigger Conditions |
|-------|----------------|-------------------|
| `aicodepath-c4-architecture` | After functional design | Functional design file created, no architecture diagrams exist |
| `aicodepath-requirements` | Starting unit development | Code generation without PRD |
| `aicodepath-naming-analyzer` | Code validation | Code files being written |

**Triggering Events**:
- Tool: `Write` to `/functional-design/` directories
- Tool: `Write` to code files (`.ts`, `.js`, `.py`, etc.)
- Phase: CONSTRUCTION

**Priority Levels**:
- **High**: Requirements missing, functional design complete
- **Medium**: Naming validation for code files

**Example**:
```
User writes: aicodepath-docs/construction/user-auth/functional-design/auth-flow.md
Hook suggests (high priority): 📐 aicodepath-c4-architecture user-auth
Reason: "Functional design for user-auth is complete - visualize the architecture"
```

### MAINTENANCE/OPERATIONS Phase

**Hook**: `maintenance-skill-suggester.js`

| Skill | When Suggested | Trigger Conditions |
|-------|----------------|-------------------|
| `aicodepath-dependency-updater` | Dependency operations | Accessing package.json, requirements.txt, etc. OR mentions "dependency" in message OR 30+ days since last update |

**Triggering Events**:
- Tool: `Read`/`Write` to dependency files
- User message contains dependency keywords
- Periodic check (30+ days since last dependency update)

**Priority Levels**:
- **Medium**: Active dependency operation
- **Low**: 30+ days since last update

**Example**:
```
User reads: package.json
Hook suggests: 📦 aicodepath-dependency-updater
Reason: "Dependency-related operation detected - check for updates"
```

### Cross-Phase (DOCUMENT)

**Hook**: `document-skill-suggester.js`

| Skill | When Suggested | Trigger Conditions |
|-------|----------------|-------------------|
| `aicodepath-readme-crafter` | README operations | Accessing README files OR mentions "documentation" OR README missing/too short |

**Triggering Events**:
- Tool: `Read`/`Write` to README files
- User message contains documentation keywords
- README doesn't exist or is < 500 characters

**Priority Levels**:
- **High**: README being actively accessed or requested
- **Medium**: README doesn't exist
- **Low**: README is too short

**Example**:
```
User writes: README.md
Hook suggests (high priority): 📖 aicodepath-readme-crafter
Reason: "README detected - craft comprehensive documentation"
```

## Manual-Only Skills (Not Auto-Suggested)

These skills are intentionally **not** auto-triggered:

| Skill | Reason |
|-------|--------|
| `aicodepath-reducing-entropy` | Deep refactoring - user must explicitly request |
| `aicodepath-command-creator` | Meta-programming - user must explicitly request |
| `aicodepath-skill-audit` | Audit tool - user must explicitly request |
| `communication-coach` | Agent role - user must explicitly request |
| `writing-style-rules.json` | Passive reference - loaded by other skills |

## Hook Integration Points

Hooks integrate with Claude Code's hook system at these points:

1. **Pre-Tool Execution** (`Bash` tool)
   - Detect git operations
   - Suggest mental-model for commit analysis

2. **Post-Tool Execution** (`Write`/`Edit` tools)
   - Detect functional design completion
   - Detect code generation
   - Detect README operations
   - Suggest appropriate skills

3. **Message Analysis**
   - Parse user messages for keywords
   - Suggest skills based on intent

## Configuration

### Enabling/Disabling Suggestions

To disable all skill suggestions:
```javascript
// In .claude/hooks.json
{
  "inception-skill-suggester": { "enabled": false },
  "construction-skill-suggester": { "enabled": false },
  "maintenance-skill-suggester": { "enabled": false },
  "document-skill-suggester": { "enabled": false }
}
```

### Customizing Suggestion Thresholds

Edit individual hook files to adjust:
- Priority levels
- Time thresholds (e.g., 30 days for dependency updates)
- File size thresholds (e.g., 500 chars for README)

## Best Practices

### For Hook Developers

1. **Be Non-Intrusive**
   - Suggestions should be helpful, not annoying
   - Always allow users to continue without the skill
   - Use clear, concise messaging

2. **Context-Aware**
   - Check workflow phase before suggesting
   - Verify artifact existence to avoid duplicate suggestions
   - Consider project state (greenfield vs brownfield)

3. **Error-Resilient**
   - Never block on hook errors
   - Always return `{ proceed: true }` on errors
   - Log errors but don't interrupt workflow

4. **Performance**
   - Keep hook logic lightweight
   - Use filesystem checks, not heavy analysis
   - Cache results when possible

### For Users

1. **Suggestions are Optional**
   - You can always ignore skill suggestions
   - Continue with your current task if preferred
   - Invoke skills manually when needed

2. **Understanding Priority**
   - **High**: Strongly recommended for quality/completeness
   - **Medium**: Helpful but not critical
   - **Low**: Nice to have, consider if time permits

3. **Manual Invocation**
   - You can always run skills manually: `/skill-name`
   - No need to wait for automatic suggestions
   - Use skills proactively when you know they'll help

## Testing Hooks

Each hook can be tested standalone:

```bash
# Test inception suggester
node .aicodepath/hooks/inception-skill-suggester.js

# Test construction suggester
node .aicodepath/hooks/construction-skill-suggester.js

# Test with simulated parameters
node -e "require('./.aicodepath/hooks/construction-skill-suggester.js').hook({
  file_path: 'aicodepath-docs/construction/user-auth/functional-design/auth.md',
  tool_name: 'Write'
}).then(console.log)"
```

## Future Enhancements

Potential improvements for skill triggering:

1. **ML-Based Suggestions**: Learn user preferences over time
2. **Team Preferences**: Share skill suggestion configs across team
3. **Skill Chains**: Suggest follow-up skills based on previous invocations
4. **Context Accumulation**: Track workflow progress to suggest next logical skill
5. **Quality Metrics**: Track suggestion acceptance rate to improve triggers

## Troubleshooting

### Suggestions Not Appearing

1. Check hook is enabled in `.claude/hooks.json`
2. Verify you're in the correct workflow phase
3. Check hook logs for errors: `console.error` output
4. Test hook manually (see Testing section)

### Too Many Suggestions

1. Adjust thresholds in individual hook files
2. Disable specific hooks you don't need
3. Provide feedback to improve suggestion logic

### Wrong Skill Suggested

1. Check trigger conditions in this document
2. Review hook logic in the specific hook file
3. File an issue with context for improvement

## Related Documentation

- [Skills README](../skills/README.md) - Complete skills reference
- [Hooks README](./README.md) - Hooks system overview
- [Workflow Rules](../rules/core-workflow.md) - Phase definitions
- [CLAUDE.md](../../CLAUDE.md) - User-facing documentation

---

**Last Updated**: 2026-02-04
**Version**: 1.0.0
**Maintainer**: AICodePath Team
