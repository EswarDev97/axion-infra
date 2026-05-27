# AICodePath Core Workflow - Phase Files

This directory contains the split core workflow files, organized by phase for optimized context loading.

## Overview

The original `core-workflow.md` file (~56 KB, ~1400 lines) has been split into phase-specific files to reduce context usage and improve Claude's focus during workflow execution.

## File Structure

### Always Loaded
- **preamble.md** (~3 KB, ~70 lines)
  - Workflow principles and mandatory rules
  - Database integration patterns
  - Content validation requirements
  - Loaded at the start of every workflow session

- **adaptive-routing.md** (~5 KB, ~120 lines)
  - Phase detection and transition logic
  - Key workflow principles
  - Checkpoint enforcement rules
  - Directory structure reference

### Phase-Specific Files
- **pre-flight.md** (~2 KB, ~50 lines)
  - Environment validation
  - Plugin and MCP server checks
  - Readiness verification

- **inception.md** (~12 KB, ~300 lines)
  - Workspace detection
  - Reverse engineering (brownfield)
  - Requirements analysis
  - User stories and sprint planning
  - Workflow planning
  - Application design
  - Units generation

- **construction.md** (~32 KB, ~850 lines)
  - Gap analysis (brownfield)
  - Environment strategy
  - Per-unit design stages:
    - Functional design
    - NFR requirements and design
    - Infrastructure design
    - Database design
    - Docker and Kubernetes design
    - Mobile and Web UI/UX design
    - AI implementation design
    - Code generation
  - CI/CD design
  - Build and test

- **operations.md** (~3 KB, ~70 lines)
  - Deployment strategies
  - Sprint tracking
  - Monitoring and operations

## Usage

### In Workflow Execution

1. **Session Start**: The `session-start-hook.js` automatically:
   - Loads `preamble.md` (always)
   - Detects current phase from `aicodepath-state.md`
   - Loads the appropriate phase file
   - Loads `adaptive-routing.md` for transition logic

2. **Phase Loading**: Claude should:
   ```markdown
   @import rules/core/preamble.md
   @import rules/core/{current-phase}.md
   @import rules/core/adaptive-routing.md
   ```

3. **Phase Transitions**: When moving to a new phase:
   - Update `aicodepath-state.md` with new phase
   - Unload previous phase file from context
   - Load new phase file

### Context Optimization

| Phase | Files Loaded | Total Size | vs Original |
|-------|--------------|------------|-------------|
| PRE-FLIGHT | preamble + pre-flight + routing | ~10 KB | 18% (82% savings) |
| INCEPTION | preamble + inception + routing | ~20 KB | 36% (64% savings) |
| CONSTRUCTION | preamble + construction + routing | ~40 KB | 71% (29% savings) |
| OPERATIONS | preamble + operations + routing | ~11 KB | 20% (80% savings) |

**Average Context Savings**: ~64% reduction in loaded workflow rules per phase

## Benefits

1. **Reduced Token Usage**: Load only relevant phase context
2. **Better Focus**: Claude sees only current phase stages
3. **Faster Loading**: Smaller files load and parse faster
4. **Easier Maintenance**: Changes to one phase don't affect others
5. **Clearer Organization**: Each phase is self-contained

## Index File

The `core-workflow.md` file in the parent directory now serves as an index/router:
- Explains the split structure
- Provides phase file mapping
- Documents routing logic
- ~2.5 KB vs original ~56 KB

## Session Hook Integration

The `session-start-hook.js` has been updated with:
- `detectCurrentPhase()`: Reads phase from state file
- `loadPhaseRules()`: Loads preamble + phase file + routing
- Displays loaded rules in startup message
- Tracks loaded files in session context

## Verification

Run the verification script to ensure all files are present and correctly structured:

```bash
bash .aicodepath/scripts/verify-workflow-split.sh
```

## Migration Notes

### For Existing Workflows
- Existing `aicodepath-state.md` files will work as-is
- Phase detection is automatic based on "Current Phase" field
- No manual migration needed

### For New Workflows
- Fresh workflows start with PRE-FLIGHT phase
- Phase progression follows original workflow order
- All phase files are loaded on-demand

## Maintenance

When updating workflow rules:
1. Identify which phase(s) the change affects
2. Update only the relevant phase file(s)
3. Keep preamble.md updated for cross-phase rules
4. Update adaptive-routing.md for transition logic changes
5. Update index (parent core-workflow.md) only for structural changes

## Future Enhancements

Potential improvements:
- Per-stage file splitting for even finer granularity
- Dynamic rule loading based on project complexity
- Phase-specific validation rules
- Per-phase hook integration

---

**Version**: 2.0
**Last Updated**: 2025-02-05
**Split From**: core-workflow.md (v1.0, ~56 KB)
