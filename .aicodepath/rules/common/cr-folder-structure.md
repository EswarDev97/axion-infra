# CR-Based Folder Structure Convention

**Purpose**: Organize all AICodePath artifacts by Change Request (CR) for better maintainability and traceability

**Effective Date**: 2025-12-28
**Status**: Active Convention

---

## Folder Structure Pattern

All AICodePath artifacts for a specific Change Request should be grouped under a CR-specific folder:

```
aicodepath-docs/
├── inception/
│   ├── cr-{number}-{short-name}/
│   │   ├── README.md                      # CR overview and status
│   │   ├── requirements/                  # All requirements documents
│   │   │   ├── requirements.md
│   │   │   ├── requirement-verification-questions.md
│   │   │   ├── requirement-clarification-questions.md
│   │   │   └── database-schema-revised.md (if applicable)
│   │   ├── plans/                         # Planning documents
│   │   │   ├── user-stories-assessment.md
│   │   │   ├── story-generation-plan.md
│   │   │   ├── functional-design-plan.md
│   │   │   └── implementation-plan.md
│   │   ├── user-stories/                  # User stories artifacts
│   │   │   ├── personas.md
│   │   │   ├── stories.md
│   │   │   └── story-summary.md
│   │   └── designs/                       # Design documents (optional)
│   │       ├── api-design.md
│   │       ├── ui-design.md
│   │       └── architecture-design.md
│   └── reverse-engineering/               # Shared across all CRs
│       ├── architecture.md
│       ├── component-inventory.md
│       └── technology-stack.md
├── construction/
│   └── cr-{number}-{short-name}/
│       ├── functional-design/
│       ├── database-design/
│       ├── nfr-design/
│       ├── mobile-design/
│       ├── web-design/
│       └── code/
└── operations/
    └── cr-{number}-{short-name}/
        ├── deployment-plan.md
        └── monitoring-setup.md
```

---

## CR Naming Convention

**Format**: `cr-{number}-{short-name}`

**Examples**:
- `cr-001-partner-onboarding`
- `cr-002-multi-tenant-support`
- `cr-003-self-inspection`
- `cr-004-ai-damage-detection`

**Rules**:
1. **Number**: 3-digit zero-padded (001, 002, etc.)
2. **Short Name**: Kebab-case, descriptive (2-4 words max)
3. **Uniqueness**: Each CR gets unique number
4. **Consistency**: Use same CR number across all phases (inception, construction, operations)

---

## CR README.md Template

Every CR folder MUST contain a README.md with:

```markdown
# CR-{number}: {Full Feature Name}

**Change Request ID**: CR-{number}
**Feature Name**: {Full Name}
**Status**: {In Progress | Complete | On Hold}
**Start Date**: YYYY-MM-DD
**Target Completion**: Sprint X or Date

## Overview
{Brief description}

## Folder Structure
{List of subfolders and key files}

## Key Documents
{Links to important documents with descriptions}

## Status
- [x] Requirements Analysis
- [ ] User Stories
- [ ] Functional Design
- [ ] Implementation
- [ ] Testing
- [ ] Deployment

## Timeline
{Sprint breakdown or timeline}

## Dependencies
{External and internal dependencies}

## Success Criteria
{Acceptance criteria at CR level}

**Last Updated**: YYYY-MM-DD
**Current Phase**: {Phase name}
```

---

## Path References in Workflow Files

When workflow files reference paths, use this pattern:

**Old Pattern** (deprecated):
```markdown
- Save to: `aicodepath-docs/inception/requirements/requirements.md`
- Load from: `aicodepath-docs/inception/user-stories/stories.md`
```

**New Pattern** (recommended):
```markdown
- Save to: `aicodepath-docs/inception/cr-{number}-{short-name}/requirements/requirements.md`
- Load from: `aicodepath-docs/inception/cr-{number}-{short-name}/user-stories/stories.md`
```

**Dynamic Path Construction**:
```
CR_FOLDER="cr-{number}-{short-name}"
BASE_PATH="aicodepath-docs/inception/${CR_FOLDER}"
REQUIREMENTS_PATH="${BASE_PATH}/requirements"
PLANS_PATH="${BASE_PATH}/plans"
USER_STORIES_PATH="${BASE_PATH}/user-stories"
```

---

## Benefits of CR-Based Organization

### 1. **Traceability**
- All artifacts for a feature in one place
- Easy to track CR from inception to deployment
- Clear audit trail

### 2. **Maintainability**
- Easy to find all documents related to a specific CR
- No mixing of artifacts from different features
- Clean folder structure even with 100+ CRs

### 3. **Parallel Development**
- Multiple teams can work on different CRs without file conflicts
- Clear ownership boundaries
- Independent versioning per CR

### 4. **Historical Reference**
- Complete CR history preserved
- Easy to reference past decisions
- Knowledge base for similar future work

### 5. **Documentation Quality**
- Comprehensive README per CR
- Self-contained documentation
- Easy onboarding for new team members

---

## Migration Strategy

### For Existing CRs (Pre-Convention)

**Option 1**: Migrate to new structure
1. Create `cr-{number}-{short-name}` folder
2. Move all related documents
3. Update README.md
4. Update cross-references

**Option 2**: Leave as-is, apply convention forward
1. Leave old files in original locations
2. Apply CR-based structure only for new CRs
3. Document exception in aicodepath-state.md

**Recommendation**: Option 2 for simplicity

### For New CRs (Post-Convention)

**ALWAYS use CR-based folder structure:**
1. Determine CR number (next available)
2. Create CR folder: `aicodepath-docs/inception/cr-{number}-{short-name}/`
3. Create subfolders: requirements/, plans/, user-stories/, designs/
4. Create CR README.md
5. Generate all artifacts in appropriate subfolders

---

## Workflow File Updates Required

Update these workflow files to reference CR-based paths:

### Inception Phase
- `rules/inception/requirements-analysis.md`
  - Line 92: Change `aicodepath-docs/inception/requirements/` to `aicodepath-docs/inception/cr-{number}-{short-name}/requirements/`

- `rules/inception/user-stories.md`
  - Update all path references to use CR folder

### Construction Phase
- `rules/construction/functional-design.md`
- `rules/construction/database-design.md`
- `rules/construction/nfr-design.md`

### Operations Phase
- `rules/operations/deployment.md`

---

## CR Registry

Maintain a CR registry in `aicodepath-docs/CR-REGISTRY.md`:

```markdown
# Change Request Registry

| CR ID | Short Name | Full Name | Status | Start Date | Completion |
|-------|------------|-----------|--------|------------|------------|
| CR-001 | partner-onboarding | Partner Onboarding Flow | Complete | 2025-01-15 | 2025-02-28 |
| CR-002 | multi-tenant | Multi-Tenant Support | Complete | 2025-02-01 | 2025-03-15 |
| CR-003 | self-inspection | Self Inspection Flow | In Progress | 2025-12-28 | Sprint 8 |
```

---

## Examples

### Example 1: CR-003 Self Inspection

**Folder**: `aicodepath-docs/inception/cr-003-self-inspection/`

**Structure**:
```
cr-003-self-inspection/
├── README.md
├── requirements/
│   ├── requirements.md
│   ├── requirement-verification-questions.md
│   ├── requirement-clarification-questions.md
│   └── database-schema-revised.md
├── plans/
│   ├── user-stories-assessment.md
│   └── story-generation-plan.md
└── user-stories/
    ├── personas.md
    ├── stories.md
    └── story-summary.md
```

### Example 2: CR-004 AI Enhancement

**Folder**: `aicodepath-docs/inception/cr-004-ai-enhancement/`

**Structure**:
```
cr-004-ai-enhancement/
├── README.md
├── requirements/
│   └── requirements.md
└── plans/
    └── implementation-plan.md
```

---

## Enforcement

- **Mandatory for**: All new CRs starting 2025-12-28
- **Optional for**: Existing CRs (can migrate or leave as-is)
- **Tool Support**: Workflow files will guide CR folder creation automatically

---

**Convention Version**: 1.0
**Last Updated**: 2025-12-28
**Next Review**: 2026-01-28
