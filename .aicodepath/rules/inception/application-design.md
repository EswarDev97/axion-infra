# Application Design

**Purpose**: Define high-level application architecture, components, and services

**Execute IF**:
- New components or services needed
- Component methods and business rules need definition
- Service layer design required
- Component dependencies need clarification

**Skip IF**:
- Changes within existing component boundaries
- No new components or methods
- Pure implementation changes

## Prerequisites
- Requirements Analysis must be complete
- User Stories recommended (provides user context)
- Workflow Planning must indicate Application Design should execute

## Step 1: Load Context

### 1.1 Load Prior Artifacts
- Load requirements.md
- Load stories.md and personas.md (if available)
- Load reverse engineering artifacts (if brownfield)

### 1.2 Identify Design Scope
- New components needed
- Existing components to modify
- Service layer requirements
- Integration points

## Step 2: Component Identification

Create `aicodepath-docs/inception/application-design/components.md`:

```markdown
# Component Design

## Component Inventory

### New Components
| Component | Purpose | Type | Priority |
|-----------|---------|------|----------|
| [Name] | [Purpose] | [Service/Module/Library] | [High/Medium/Low] |

### Modified Components (Brownfield)
| Component | Current State | Proposed Changes |
|-----------|---------------|------------------|
| [Name] | [Current description] | [What changes] |

## Component Descriptions

### [Component Name]
- **Purpose**: [What it does]
- **Responsibilities**:
  - [Responsibility 1]
  - [Responsibility 2]
- **Type**: [Service/Module/Library/Handler]
- **Dependencies**: [What it depends on]
- **Consumers**: [What depends on it]

## Component Diagram
[Mermaid diagram showing components and relationships]
```

## Step 3: Component Methods and Business Rules

Create `aicodepath-docs/inception/application-design/component-methods.md`:

```markdown
# Component Methods and Business Rules

## [Component Name]

### Methods

#### [Method Name]
- **Purpose**: [What it does]
- **Signature**: `[method signature]`
- **Parameters**:
  - [param1]: [type] - [description]
- **Returns**: [type] - [description]
- **Business Rules**:
  - [Rule 1]
  - [Rule 2]
- **Validation**:
  - [Validation 1]
- **Error Handling**:
  - [Error scenario]: [How handled]

### Business Rules Summary
| Rule ID | Description | Applied To |
|---------|-------------|------------|
| BR-001 | [Rule description] | [Methods] |
```

## Step 4: Service Layer Design

Create `aicodepath-docs/inception/application-design/services.md`:

```markdown
# Service Layer Design

## Service Inventory

| Service | Purpose | Components Orchestrated |
|---------|---------|------------------------|
| [Name] | [Purpose] | [Component list] |

## Service Descriptions

### [Service Name]
- **Purpose**: [What it orchestrates]
- **Entry Points**: [How it's triggered]
- **Components Used**:
  - [Component 1]: [How used]
  - [Component 2]: [How used]
- **Transaction Boundaries**: [Transaction scope]
- **Error Handling Strategy**: [How errors bubble up]

## Service Flow Diagrams
[Mermaid sequence diagrams for key flows]
```

## Step 5: Component Dependencies

Create `aicodepath-docs/inception/application-design/component-dependency.md`:

```markdown
# Component Dependencies

## Dependency Matrix

| Component | Depends On | Depended By |
|-----------|------------|-------------|
| [A] | [B, C] | [D] |

## Dependency Diagram
[Mermaid diagram showing dependencies]

## Dependency Types
- **Compile-time**: [List]
- **Runtime**: [List]
- **Optional**: [List]

## Circular Dependency Check
- **Status**: [None found / Issues identified]
- **Issues**: [If any, describe]
```

## Step 6: Database Component Design (if applicable)

If database is involved, add to components:

```markdown
## Database Components

### Data Access Layer
- **Pattern**: [Repository/DAO/Active Record]
- **ORM**: [If used, which one]

### Entity Definitions
| Entity | Table | Key Fields |
|--------|-------|------------|
| [Entity] | [Table] | [Fields] |

### Relationship Mapping
[Entity relationship overview - detail in Database Design phase]
```

## Step 7: AI Component Design (if applicable)

If AI is involved, add to components:

```markdown
## AI Components

### AI Integration Points
| Component | AI Capability | Model Type |
|-----------|---------------|------------|
| [Component] | [Capability] | [LLM/Embedding/etc] |

### AI Service Layer
- **Abstraction**: [How AI is abstracted from business logic]
- **Fallback Strategy**: [What happens if AI fails]

[Detail in AI Implementation phase]
```

## Step 8: Generate Visual Memory Diagrams

**Purpose**: Create visual diagrams to document the design

Execute visual memory generation for designed components:

### 8.1 Generate Component Class Diagrams

- **Input**: Designed component structures from Step 2-3
- **Output**: `aicodepath-docs/memory/global/class/components.md`
- **Method**: Create from component descriptions and methods
- **Sync Strategy**: Lazy

### 8.2 Generate Component Dependency Diagram

- **Input**: Component dependencies from Step 5
- **Output**: `aicodepath-docs/memory/global/flowcharts/component-dependencies.md`
- **Method**: Pattern-based from dependency matrix
- **Sync Strategy**: Eager (critical for architecture)

### 8.3 Generate Service Flow Sequence Diagrams

- **Input**: Service flow diagrams from Step 4
- **Output**: `aicodepath-docs/memory/global/sequence/service-flow.md`
- **Method**: LLM-based from service descriptions
- **Sync Strategy**: Lazy

**Execution**:
- Use visual-memory-generator hook or aicodepath-visual-memory skill
- Generate diagrams before code implementation begins

**Success Criteria**:
- Component class diagram created
- Dependency diagram created
- At least one service flow sequence diagram created

## Step 9: Update State Tracking

Update `aicodepath-docs/aicodepath-state.md`

## Step 10: Present Completion Message

```markdown
# Application Design Complete

Application design has defined:
- **Components**: [X] new, [Y] modified
- **Services**: [X] orchestration services
- **Methods**: [X] methods with business rules
- **Dependencies**: [Dependency summary]

Key Design Decisions:
- [Decision 1]
- [Decision 2]

> **REVIEW REQUIRED:**
> Please examine the application design at: `aicodepath-docs/inception/application-design/`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to the application design
> **Approve & Continue** - Approve design and proceed to **[Units Generation/Construction Phase]**
```

## Step 11: Wait for Explicit Approval
- Do not proceed until user explicitly approves
- Log user's response in audit.md
