# AICodePath Core Workflow — Index

This file is a phase router. The full workflow is split into per-phase files under `rules/core/`.

## Always Loaded
The preamble contains mandatory rules and principles that apply across all phases.

**CRITICAL**: Read `rules/core/preamble.md` at the start of every workflow session.

## Phase Selection

The workflow consists of four phases. Load the appropriate phase file based on the current workflow state:

| Current Phase | File | Description |
|---------------|------|-------------|
| PRE-FLIGHT    | rules/core/pre-flight.md | Environment validation and readiness checks |
| INCEPTION     | rules/core/inception.md | Requirements gathering and planning |
| CONSTRUCTION  | rules/core/construction.md | Detailed design and code generation |
| OPERATIONS    | rules/core/operations.md | Deployment and sprint tracking |

## Routing Logic

**CRITICAL**: Read `rules/core/adaptive-routing.md` for phase detection and transition logic.

### How to Use This Workflow

1. **Session Start**: Always read `preamble.md` first
2. **Determine Current Phase**: Check `aicodepath-docs/aicodepath-state.md` for current phase
3. **Load Phase File**: Read only the relevant phase file from `rules/core/`
4. **Execute Phase**: Follow the stages defined in the phase file
5. **Apply Routing Logic**: Use `adaptive-routing.md` for phase transitions and adaptive execution

### Phase Transitions

- **PRE-FLIGHT → INCEPTION**: After environment validation passes
- **INCEPTION → CONSTRUCTION**: After requirements and planning approved
- **CONSTRUCTION → OPERATIONS**: After all units built and tested
- **OPERATIONS → INCEPTION**: For new features or iterations

### Memory Optimization

By splitting the workflow into phase-specific files, Claude can:
- Load only the relevant phase context (reduces token usage by ~80%)
- Focus on current phase stages without distraction
- Maintain better context awareness throughout execution
- Reference preamble and routing rules as needed

### File Sizes

- `preamble.md`: ~2 KB (always loaded)
- `pre-flight.md`: ~1 KB (small, quick validation)
- `inception.md`: ~12 KB (planning and requirements)
- `construction.md`: ~20 KB (largest, design and code)
- `operations.md`: ~3 KB (deployment and tracking)
- `adaptive-routing.md`: ~2 KB (routing logic)

**Total Original Size**: ~56 KB
**Active Context per Phase**: ~5-24 KB (depending on phase)
**Context Savings**: 60-90% reduction in loaded rules per interaction
