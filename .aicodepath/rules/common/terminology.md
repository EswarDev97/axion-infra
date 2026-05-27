# AICodePath Terminology Glossary

## Core Terminology

### Phase vs Stage

**Phase**: One of the three high-level lifecycle phases in AICodePath
- **INCEPTION PHASE** - Planning & Architecture (WHAT and WHY)
- **CONSTRUCTION PHASE** - Design, Implementation & Test (HOW)
- **OPERATIONS PHASE** - Sprint Tracking & Deployment (RUN)

**Stage**: An individual workflow activity within a phase
- Examples: Workspace Detection stage, Requirements Analysis stage, Code Generation stage
- Each stage has specific prerequisites, steps, and outputs
- Stages can be ALWAYS-EXECUTE or CONDITIONAL

**Usage Examples**:
- "The CONSTRUCTION phase contains 8 stages"
- "The Code Generation stage is always executed"
- "We're in the INCEPTION phase, executing the Requirements Analysis stage"

## Three-Phase Lifecycle

### INCEPTION PHASE
**Purpose**: Planning and architectural decisions
**Focus**: Determine WHAT to build and WHY
**Location**: `inception/` directory

**Stages**:
- Workspace Detection (ALWAYS)
- Reverse Engineering (CONDITIONAL - Brownfield only)
- Requirements Analysis (ALWAYS - Adaptive depth)
- User Stories (CONDITIONAL)
- Sprint Planning (CONDITIONAL)
- Workflow Planning (ALWAYS)
- Application Design (CONDITIONAL)
- Units Generation (CONDITIONAL)

**Outputs**: Requirements, user stories, sprint plans, architectural decisions, unit definitions

### CONSTRUCTION PHASE
**Purpose**: Detailed design and implementation
**Focus**: Determine HOW to build it
**Location**: `construction/` directory

**Stages**:
- Functional Design (CONDITIONAL, per-unit)
- NFR Requirements (CONDITIONAL, per-unit)
- NFR Design (CONDITIONAL, per-unit)
- Infrastructure Design (CONDITIONAL, per-unit)
- Database Design (CONDITIONAL, per-unit)
- AI Implementation (CONDITIONAL, per-unit)
- Code Generation (ALWAYS)
- Build and Test (ALWAYS)

**Outputs**: Design artifacts, database schemas, AI designs, code, tests

### OPERATIONS PHASE
**Purpose**: Sprint tracking and operational readiness
**Focus**: How to TRACK and RUN it
**Location**: `operations/` directory

**Stages**:
- Sprint Tracking (CONDITIONAL)
- Operations (PLACEHOLDER)

**Outputs**: Velocity metrics, burndown charts, retrospectives, deployment guides

---

## Workflow Stages

### Always-Execute Stages
- **Workspace Detection**: Initial analysis of workspace state and project type
- **Requirements Analysis**: Gathering requirements (depth varies based on complexity)
- **Workflow Planning**: Creating execution plan for which phases to run
- **Code Generation**: Generating actual code based on plans and prior artifacts
- **Build and Test**: Building all units and executing comprehensive testing

### Conditional Stages
- **Reverse Engineering**: Analyzing existing codebase (brownfield projects only)
- **User Stories**: Creating user stories and personas
- **Sprint Planning**: Planning sprints, estimating story points, setting goals
- **Application Design**: Designing application components, methods, business rules
- **Units Generation**: Decomposing system into units of work
- **Functional Design**: Technology-agnostic business logic design (per-unit)
- **NFR Requirements**: Determining NFRs and selecting tech stack (per-unit)
- **NFR Design**: Incorporating NFR patterns and logical components (per-unit)
- **Infrastructure Design**: Mapping to actual infrastructure services (per-unit)
- **Database Design**: Schema design, migrations, audit logging (per-unit)
- **AI Implementation**: Model selection, prompt engineering, RAG, agents (per-unit)
- **Sprint Tracking**: Velocity metrics, burndown charts, retrospectives

## Application Design Terms

- **Component**: A functional unit with specific responsibilities
- **Method**: A function or operation within a component with defined business rules
- **Business Rule**: Logic that governs method behavior and validation
- **Service**: Orchestration layer that coordinates business logic across components
- **Component Dependency**: Relationship and communication pattern between components

## Architecture Terms

### Unit of Work
A logical grouping of user stories for development purposes.

**Usage**: "We need to decompose the system into units of work"

### Service
An independently deployable component in a microservices architecture.

**Usage**: "The Payment Service handles all payment processing"

### Module
A logical grouping of functionality within a single service or monolith.

**Usage**: "The authentication module within the User Service"

### Component
A reusable building block within a service or module.

**Usage**: "The EmailValidator component validates email addresses"

## Sprint & Agile Terms

- **Sprint**: A time-boxed iteration (typically 1-4 weeks)
- **Story Points**: Relative effort estimation for user stories
- **Velocity**: Amount of work completed per sprint (in story points)
- **Burndown Chart**: Visual representation of remaining work over time
- **Backlog**: Prioritized list of work items
- **Sprint Goal**: The objective for a sprint
- **Retrospective**: Review meeting at end of sprint

## AI Implementation Terms

- **LLM**: Large Language Model (e.g., Claude, GPT-4)
- **RAG**: Retrieval-Augmented Generation
- **Embedding**: Vector representation of text for similarity search
- **Fine-tuning**: Customizing a model for specific tasks
- **Prompt Engineering**: Designing effective prompts for AI models
- **Agent**: Autonomous AI system that can take actions
- **Token**: Unit of text processing (affects cost)

## Database Terms

- **Schema**: Structure definition for database tables
- **Migration**: Versioned database schema changes
- **Index**: Database optimization structure for faster queries
- **Audit Log**: Record of data changes for compliance
- **Normalization**: Organizing data to reduce redundancy

## Stage Terminology

### Planning vs Generation
- **Planning**: Creating a plan with questions and checkboxes for execution
- **Generation**: Executing the plan to create artifacts

Examples:
- Story Planning -> Story Generation
- Sprint Planning -> Sprint Tracking
- Code Planning -> Code Generation
- Database Planning -> Schema Generation

### Depth Levels
- **Minimal**: Quick, focused execution for simple changes
- **Standard**: Normal depth with standard artifacts for typical projects
- **Comprehensive**: Full depth with all artifacts for complex/high-risk projects

## Artifact Types

### Plans
Documents with checkboxes and questions that guide execution.
- Located in `aicodepath-docs/*/plans/`
- Examples: `story-generation-plan.md`, `sprint-planning.md`

### Artifacts
Generated outputs from executing plans.
- Located in various `aicodepath-docs/` subdirectories
- Examples: `requirements.md`, `stories.md`, `schema-design.md`

### State Files
Files tracking workflow progress and status.
- `aicodepath-state.md`: Overall workflow state
- `audit.md`: Complete audit trail of all interactions

## Common Abbreviations

- **AICodePath**: AI-Driven Development Life Cycle
- **NFR**: Non-Functional Requirements
- **UOW**: Unit of Work
- **API**: Application Programming Interface
- **LLM**: Large Language Model
- **RAG**: Retrieval-Augmented Generation
- **DB**: Database
- **SP**: Story Points
