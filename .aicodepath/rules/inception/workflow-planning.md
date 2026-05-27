# Workflow Planning

**Purpose**: Determine which phases to execute and create comprehensive execution plan

**Always Execute**: This phase always runs after understanding requirements and scope

## Step 1: Load All Prior Context

### 1.1 Load Reverse Engineering Artifacts (if brownfield)
- architecture.md
- component-inventory.md
- technology-stack.md
- dependencies.md

### 1.2 Load Requirements Analysis
- requirements.md (includes intent analysis)
- requirement-verification-questions.md (with answers)

### 1.3 Load User Stories (if executed)
- stories.md
- personas.md

### 1.4 Load Sprint Planning (if executed)
- sprint-backlog.md
- velocity-estimates.md
- sprint-goals.md

## Step 2: Detailed Scope and Impact Analysis

### 2.1 Change Impact Assessment

#### Impact Areas
1. **User-facing changes**: Does this affect user experience?
2. **Structural changes**: Does this change system architecture?
3. **Data model changes**: Does this affect database schemas?
4. **API changes**: Does this affect interfaces or contracts?
5. **NFR impact**: Does this affect performance, security, or scalability?
6. **AI component impact**: Does this involve AI/ML changes?

#### Risk Assessment
Evaluate risk level:
1. **Low**: Isolated change, easy rollback, well-understood
2. **Medium**: Multiple components, moderate rollback, some unknowns
3. **High**: System-wide impact, complex rollback, significant unknowns
4. **Critical**: Production-critical, difficult rollback, high uncertainty

## Step 3: Phase Determination

### 3.1 User Stories - Already Executed or Skip?
**Execute IF**: Multiple user personas, user experience impact, acceptance criteria needed
**Skip IF**: Internal refactoring, bug fix, infrastructure changes

### 3.2 Sprint Planning - Already Executed or Skip?
**Execute IF**: Multiple stories, iteration tracking needed, agile methodology
**Skip IF**: Single story, one-time implementation, waterfall approach

### 3.3 Application Design - Execute IF:
- New components or services needed
- Component methods and business rules need definition
- Service layer design required

### 3.4 Units Generation - Execute IF:
- Multiple packages require changes
- System decomposition needed
- Complex system requiring structured breakdown

### 3.5 Functional Design - Execute IF:
- New data models or schemas
- Complex algorithms or business logic
- API changes or new endpoints

### 3.6 NFR Implementation - Execute IF:
- Performance requirements
- Security considerations
- Scalability concerns

### 3.7 Database Design - Execute IF:
- New database schema required
- Data model changes needed
- Database migrations required
- Audit logging needed
- **Storage-First principle applies** (see Step 3.10)

### 3.8 AI Implementation - Execute IF:
- AI/ML components required
- LLM integration needed
- RAG implementation planned
- Agent architecture design needed

### 3.9 Additional Storage Designs - Execute IF:
- **S3/Object Storage Design**: File uploads, media, backups, or unstructured data
- **Vector Database Design**: AI/ML features, semantic search, RAG, recommendations
- **NoSQL Design**: Flexible schemas, high write throughput, document storage
- **Message Queue Design**: Async processing, event-driven architecture, decoupled services

### 3.10 Storage-First Principle (Greenfield Projects)

**IMPORTANT**: For greenfield projects, apply the Storage-First principle with adaptive enforcement.

#### Enforcement Level: ADAPTIVE

**ENFORCE (block Code Generation until storage design complete) when:**
- Application is data-heavy (CRUD operations are primary focus)
- Multiple entities with complex relationships
- Data persistence is a core requirement
- API-first design approach
- Any of these storage types are needed:
  - Relational database
  - Document/NoSQL database
  - Object storage (S3/Blob)
  - Vector database

**RECOMMEND (warn but allow bypass) when:**
- Simple utilities or scripts
- Stateless processing applications
- Integration/glue code
- Prototypes/POCs explicitly marked as throwaway

#### Assessment Questions

Evaluate the project using these questions:

1. **Does this application store/retrieve persistent data?**
   - Yes → Data-heavy, consider Storage-First
   - No → May bypass

2. **Are there relationships between data entities?**
   - Yes → Schema design needed before code
   - No → Simpler storage approach

3. **Is data integrity critical?**
   - Yes → ENFORCE Storage-First
   - No → RECOMMEND only

4. **What percentage of operations are CRUD?**
   - >50% → ENFORCE Storage-First
   - <50% → Evaluate case-by-case

#### Storage-First Workflow Order

When Storage-First is enforced:

```
1. Database Design      → MUST complete before Code Generation
2. S3/Storage Design    → MUST complete if file storage needed
3. Vector DB Design     → MUST complete if AI/RAG features
4. NoSQL Design         → MUST complete if document storage needed
5. Message Queue Design → MUST complete if async/events needed
6. Code Generation      → Only after all required storage designs
```

#### Storage-First Decision Output

Include in execution-plan.md:

```markdown
## Storage-First Assessment

**Project Type**: Greenfield
**Data-Heavy**: [Yes/No]
**Storage-First Applied**: [ENFORCED/RECOMMENDED/NOT APPLICABLE]

**Required Storage Designs**:
- [ ] Database Design - [Required/Not Required] - Rationale: [why]
- [ ] S3/Object Storage - [Required/Not Required] - Rationale: [why]
- [ ] Vector Database - [Required/Not Required] - Rationale: [why]
- [ ] NoSQL Design - [Required/Not Required] - Rationale: [why]
- [ ] Message Queue - [Required/Not Required] - Rationale: [why]

**Storage Design Order**:
1. [First storage design to execute]
2. [Second storage design to execute]
...

> **Note**: Code Generation will be blocked until all required storage designs are complete.
```

## Step 4: Generate Workflow Visualization

Create Mermaid flowchart showing:
- All phases in sequence
- EXECUTE or SKIP decision for each conditional phase
- Proper styling for each phase state

## Step 5: Create Execution Plan Document

Create `aicodepath-docs/inception/plans/execution-plan.md`:

```markdown
# Execution Plan

## Detailed Analysis Summary

### Change Impact Assessment
- **User-facing changes**: [Yes/No - Description]
- **Structural changes**: [Yes/No - Description]
- **Data model changes**: [Yes/No - Description]
- **AI changes**: [Yes/No - Description]
- **NFR impact**: [Yes/No - Description]

### Risk Assessment
- **Risk Level**: [Low/Medium/High/Critical]
- **Rollback Complexity**: [Easy/Moderate/Difficult]

## Workflow Visualization
[Mermaid diagram]

## Phases to Execute

### INCEPTION PHASE
- [x] Workspace Detection (COMPLETED)
- [x] Reverse Engineering (COMPLETED/SKIPPED)
- [x] Requirements Analysis (COMPLETED)
- [x] User Stories (COMPLETED/SKIPPED)
- [x] Sprint Planning (COMPLETED/SKIPPED)
- [x] Workflow Planning (IN PROGRESS)
- [ ] Application Design - [EXECUTE/SKIP] - **Rationale**: [Why]
- [ ] Units Generation - [EXECUTE/SKIP] - **Rationale**: [Why]

### CONSTRUCTION PHASE
- [ ] Functional Design - [EXECUTE/SKIP] - **Rationale**: [Why]
- [ ] NFR Requirements - [EXECUTE/SKIP] - **Rationale**: [Why]
- [ ] NFR Design - [EXECUTE/SKIP] - **Rationale**: [Why]
- [ ] Infrastructure Design - [EXECUTE/SKIP] - **Rationale**: [Why]
- [ ] Database Design - [EXECUTE/SKIP] - **Rationale**: [Why]
- [ ] AI Implementation - [EXECUTE/SKIP] - **Rationale**: [Why]
- [ ] Code Generation - EXECUTE (ALWAYS)
- [ ] Build and Test - EXECUTE (ALWAYS)

### OPERATIONS PHASE
- [ ] Sprint Tracking - [EXECUTE/SKIP] - **Rationale**: [Why]
- [ ] Operations - PLACEHOLDER
```

## Step 6: Update State Tracking

Update `aicodepath-docs/aicodepath-state.md`

## Step 7: Present Plan to User

```markdown
# Workflow Planning Complete

I've created a comprehensive execution plan based on:
- Your request: [Summary]
- Requirements: [Summary]
- User stories: [Summary if executed]
- Sprint plan: [Summary if executed]

**Detailed Analysis**:
- Risk level: [Level]
- Impact: [Summary of key impacts]

**Recommended Execution Plan**:

I recommend executing [X] stages:

**INCEPTION PHASE:**
1. [Stage name] - *Rationale:* [Why executing]
...

**CONSTRUCTION PHASE:**
1. [Stage name] - *Rationale:* [Why executing]
...

I recommend skipping [Y] stages:
1. [Stage name] - *Rationale:* [Why skipping]
...

> **REVIEW REQUIRED:**
> Please examine the execution plan at: `aicodepath-docs/inception/plans/execution-plan.md`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to the execution plan
> **Add Skipped Stages** - Choose to include stages currently marked as SKIP
> **Approve & Continue** - Approve plan and proceed to **[Next Stage Name]**
```

## Step 8: Handle User Response

- **If approved**: Proceed to next stage in execution plan
- **If changes requested**: Update execution plan and re-confirm
- **If user wants to force include/exclude stages**: Update plan accordingly

## Step 9: Log Interaction

Log in `aicodepath-docs/audit.md` with timestamp and complete user response
