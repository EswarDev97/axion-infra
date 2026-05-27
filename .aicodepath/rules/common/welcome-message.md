# Claude Code AICodePath Welcome Message

**Purpose**: This file contains the user-facing welcome message that should be displayed ONCE at the start of any AICodePath workflow.

---

# Welcome to AICodePath (AI-Driven Development Life Cycle) for Claude Code!

I'll guide you through an adaptive software development workflow that intelligently tailors itself to your specific needs.

## What is AICodePath?

AICodePath is a structured yet flexible software development process that adapts to your project's needs. Think of it as having an experienced software architect who:
- **Analyzes your requirements** and asks clarifying questions when needed
- **Plans the optimal approach** based on complexity and risk
- **Skips unnecessary steps** for simple changes while providing comprehensive coverage for complex projects
- **Documents everything** so you have a complete record of decisions and rationale
- **Guides you through each phase** with clear checkpoints and approval gates
- **Manages sprints and stories** for agile project tracking
- **Designs AI/ML implementations** with cost analysis for model selection
- **Plans database architecture** with audit logging and performance optimization

## The Three-Phase Lifecycle

```
                         User Request
                              |
                              v
        +===========================================+
        |     INCEPTION PHASE                       |
        |     Planning & Application Design         |
        +===========================================+
        | - Workspace Detection (ALWAYS)            |
        | - Reverse Engineering (COND)              |
        | - Requirements Analysis (ALWAYS)          |
        | - User Stories (CONDITIONAL)              |
        | - Sprint Planning (CONDITIONAL)           |
        | - Workflow Planning (ALWAYS)              |
        | - Application Design (CONDITIONAL)        |
        | - Units Generation (CONDITIONAL)          |
        +===========================================+
                              |
                              v
        +===========================================+
        |     CONSTRUCTION PHASE                    |
        |     Design, Implementation & Test         |
        +===========================================+
        | - Per-Unit Loop (for each unit):          |
        |   - Functional Design (COND)              |
        |   - NFR Requirements Assess (COND)        |
        |   - NFR Design (COND)                     |
        |   - Infrastructure Design (COND)          |
        |   - Database Design (COND)                |
        |   - AI Implementation (COND)              |
        |   - Code Generation (ALWAYS)              |
        | - Build and Test (ALWAYS)                 |
        +===========================================+
                              |
                              v
        +===========================================+
        |     OPERATIONS PHASE                      |
        |     Sprint Tracking & Deployment          |
        +===========================================+
        | - Sprint Tracking (CONDITIONAL)           |
        | - Operations (PLACEHOLDER)                |
        +===========================================+
                              |
                              v
                          Complete
```

### Phase Breakdown:

**INCEPTION PHASE** - *Planning & Application Design*
- **Purpose**: Determines WHAT to build and WHY
- **Activities**: Understanding requirements, analyzing existing code, planning the approach, sprint planning
- **Output**: Clear requirements, execution plan, units of work for parallel development
- **Your Role**: Answer questions, review plans, approve direction

**CONSTRUCTION PHASE** - *Detailed Design, Implementation & Test*
- **Purpose**: Determines HOW to build it
- **Activities**: Detailed design, database design, AI implementation design, code generation, testing
- **Output**: Working code, tests, build instructions
- **Your Role**: Review designs, approve implementation plans, validate results

**OPERATIONS PHASE** - *Sprint Tracking & Deployment*
- **Purpose**: How to DEPLOY and RUN it, plus sprint tracking
- **Status**: Sprint tracking available, deployment placeholder for future
- **Current State**: Build and test activities handled in CONSTRUCTION phase

## Key Features:

- **Sprint Planning & Tracking**: Full Agile/Scrum support with velocity tracking, burndown charts, retrospectives
- **Database Design**: Schema design, migrations, audit logging, index strategy, cost analysis
- **AI Implementation**: Model selection with cost analysis, prompt engineering, RAG architecture, agent design

## Key Principles:

- **Fully Adaptive**: Each stage independently evaluated based on your needs
- **Efficient**: Simple changes execute only essential stages
- **Comprehensive**: Complex changes get full treatment with all safeguards
- **Transparent**: You see and approve the execution plan before work begins
- **Documented**: Complete audit trail of all decisions and changes
- **User Control**: You can request stages be included or excluded
- **Cost-Aware**: AI model and database cost analysis included

## What Happens Next:

1. **I'll analyze your workspace** to understand if this is a new or existing project
2. **I'll gather requirements** and ask clarifying questions if needed
3. **I'll create an execution plan** showing which stages I propose to run and why
4. **You'll review and approve** the plan (or request changes)
5. **We'll execute the plan** with checkpoints at each major stage
6. **You'll get working code** with complete documentation and tests

Let's begin!
