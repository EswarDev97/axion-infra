<!-- LEGACY: This file has been superseded by the new 11-doc RE template orchestrator.
     See reverse-engineering.md for the current version. Kept for reference. -->

# Reverse Engineering

**Purpose**: Analyze existing codebase and generate comprehensive design artifacts

**Execute when**: Brownfield project detected (existing code found in workspace)

**Skip when**: Greenfield project (no existing code)

## Step 1: Multi-Package Discovery

### 1.1 Scan Workspace
- All packages (not just mentioned ones)
- Package relationships via config files
- Package types: Application, CDK/Infrastructure, Models, Clients, Tests

### 1.2 Understand the Business Context
- The core business that the system is implementing overall
- The business overview of every package
- List of Business Transactions that are implemented in the system

### 1.3 Infrastructure Discovery
- CDK packages (package.json with CDK dependencies)
- Terraform (.tf files)
- CloudFormation (.yaml/.json templates)
- Deployment scripts

### 1.4 Database Discovery
- Database schemas and migrations
- ORM configurations
- Connection strings and config
- Stored procedures and functions

### 1.5 AI Component Discovery
- LLM integrations
- Prompt templates
- RAG implementations
- Agent configurations
- Model endpoints

### 1.6 Code Quality Analysis
- Programming languages and frameworks
- Test coverage indicators
- Linting configurations
- CI/CD pipelines

## Step 2: Generate Business Overview Documentation

Create `aicodepath-docs/inception/reverse-engineering/business-overview.md`:

```markdown
# Business Overview

## Business Context Diagram
[Mermaid diagram showing the Business Context]

## Business Description
- **Business Description**: [Overall Business description of what the system does]
- **Business Transactions**: [List of Business Transactions that the system implements]
- **Business Dictionary**: [Business dictionary terms and their meaning]

## Component Level Business Descriptions
### [Package/Component Name]
- **Purpose**: [What it does from the business perspective]
- **Responsibilities**: [Key responsibilities]
```

## Step 3: Generate Architecture Documentation

Create `aicodepath-docs/inception/reverse-engineering/architecture.md`:

```markdown
# System Architecture

## System Overview
[High-level description of the system]

## Architecture Diagram
[Mermaid diagram showing all packages, services, data stores, relationships]

## Component Descriptions
### [Package/Component Name]
- **Purpose**: [What it does]
- **Responsibilities**: [Key responsibilities]
- **Dependencies**: [What it depends on]
- **Type**: [Application/Infrastructure/Model/Client/Test]

## Data Flow
[Mermaid sequence diagram of key workflows]

## Database Components
- **Databases**: [List with types and purposes]
- **Data Models**: [Key entities and relationships]

## AI Components
- **Models Used**: [List with purposes]
- **Integration Points**: [Where AI is used]
```

## Step 4: Generate Code Structure Documentation

Create `aicodepath-docs/inception/reverse-engineering/code-structure.md`

## Step 5: Generate API Documentation

Create `aicodepath-docs/inception/reverse-engineering/api-documentation.md`

## Step 6: Generate Component Inventory

Create `aicodepath-docs/inception/reverse-engineering/component-inventory.md`

## Step 7: Generate Technology Stack Documentation

Create `aicodepath-docs/inception/reverse-engineering/technology-stack.md`:

```markdown
# Technology Stack

## Programming Languages
- [Language] - [Version] - [Usage]

## Frameworks
- [Framework] - [Version] - [Purpose]

## Databases
- [Database] - [Version] - [Purpose]

## AI/ML Components
- [Model/Service] - [Provider] - [Purpose]

## Infrastructure
- [Service] - [Purpose]

## Build Tools
- [Tool] - [Version] - [Purpose]
```

## Step 8: Generate Dependencies Documentation

Create `aicodepath-docs/inception/reverse-engineering/dependencies.md`

## Step 9: Generate Code Quality Assessment

Create `aicodepath-docs/inception/reverse-engineering/code-quality-assessment.md`

## Step 10: Generate Codebase Statistics Report

Create `aicodepath-docs/inception/reverse-engineering/codebase-statistics.md`:

```markdown
# Codebase Statistics Report

## Code Metrics
| Metric | Value |
|--------|-------|
| Total files | [count] |
| Lines of code | [count] (excluding blanks/comments) |
| Test files | [count] |
| Configuration files | [count] |

## Language Breakdown
| Language | Files | Lines | Percentage |
|----------|-------|-------|------------|
| [language] | [count] | [lines] | [%] |

## Complexity Metrics
| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Avg cyclomatic complexity | [value] | <10 | [OK/Warning] |
| Files with high complexity (>10) | [count] | 0 | [OK/Warning] |
| Deeply nested code (>4 levels) | [count] | 0 | [OK/Warning] |
| Functions >50 lines | [count] | <5% | [OK/Warning] |

## Technical Debt Indicators
| Indicator | Count | Priority |
|-----------|-------|----------|
| TODO/FIXME comments | [count] | Medium |
| Deprecated API usage | [count] | High |
| Outdated dependencies | [count] | Medium |
| Console.log/print statements | [count] | Low |

## Architecture Analysis
| Issue | Occurrences | Severity |
|-------|-------------|----------|
| Circular dependencies | [count] | High |
| Layer violations | [count] | High |
| God classes (>500 lines) | [count] | Medium |
| Orphan code (unreachable) | [count] | Low |
```

## Step 11: Database Introspection

### 11.1 Request Database Credentials (User Choice)

Present to user:

```markdown
## Database Analysis Options

To perform database analysis, I need database connection details.

**What level of analysis would you like?**

A) **Schema Only** - Analyze tables, columns, indexes, relationships
   - No data access required
   - Safe for production databases
   - Generates ERD and schema documentation

B) **Schema + Sample Data** - Include data profiling and patterns
   - Reads sample records (limit 100 per table)
   - Identifies data patterns and common values
   - Estimates row counts and data distributions

C) **Full Analysis** - Schema + data + performance + optimization
   - Analyzes query patterns and index usage
   - Identifies slow queries and missing indexes
   - Provides optimization recommendations
   - Requires read access to query statistics

D) **Skip Database Analysis** - Continue without database introspection
   - Use when credentials not available
   - Will document database based on code analysis only

---

**If you choose A, B, or C, please provide:**

| Field | Value |
|-------|-------|
| Database Type | [PostgreSQL/MySQL/MongoDB/DynamoDB/etc.] |
| Host | [hostname or endpoint] |
| Port | [port number] |
| Database Name | [database name] |
| Username | [username] |
| Password | [will not be stored after analysis] |

> **Security Note**: Credentials are used only for this analysis session and are not stored in any files or logs.
```

### 11.2 Generate Database Analysis

Based on user choice, create `aicodepath-docs/inception/reverse-engineering/database-analysis.md`:

```markdown
# Database Analysis

## Analysis Level: [Schema Only / Schema + Sample / Full / Code-Based Only]

## Relational Database Analysis (if applicable)

### Tables Overview
| Table | Columns | Rows (Est.) | Primary Key | Purpose |
|-------|---------|-------------|-------------|---------|
| [table] | [count] | [estimate] | [pk] | [purpose] |

### Entity Relationship Diagram
[Mermaid ERD diagram]

### Index Analysis
| Table | Index Name | Columns | Type | Usage |
|-------|------------|---------|------|-------|
| [table] | [index] | [cols] | [type] | [used/unused] |

### Foreign Key Relationships
| From Table | Column | To Table | Column | On Delete |
|------------|--------|----------|--------|-----------|
| [from] | [col] | [to] | [col] | [action] |

## NoSQL Database Analysis (if applicable)

### Collections/Tables
| Collection | Est. Documents | Avg Doc Size | Indexes |
|------------|----------------|--------------|---------|
| [name] | [count] | [size] | [count] |

### Document Structure Samples
[Sample document structures with field types]

### Access Pattern Analysis
| Pattern | Frequency | Current Support |
|---------|-----------|-----------------|
| [pattern] | [freq] | [has index/needs index] |
```

## Step 12: Request Additional Artifacts

Present to user:

```markdown
## Additional Artifacts Request

To perform thorough reverse engineering, please provide any available artifacts:

### API Documentation
- [ ] OpenAPI/Swagger specifications (provide path or URL)
- [ ] Postman collections (provide path)
- [ ] API documentation URLs

### Design Artifacts
- [ ] Figma design files/URLs
- [ ] Wireframes or mockups
- [ ] Style guides or design systems

### Architecture Documents
- [ ] Architecture diagrams (C4, UML, or other)
- [ ] Infrastructure diagrams
- [ ] Data flow diagrams
- [ ] Sequence diagrams

### Technical Documents
- [ ] Existing technical documentation
- [ ] Runbooks or playbooks
- [ ] Architecture Decision Records (ADRs)
- [ ] Previous design decisions

### Other
- [ ] Business requirements documents
- [ ] User research or personas
- [ ] Compliance documentation

---

**You can provide:**
- File paths to local documents
- URLs to online resources
- "Skip" to proceed without additional artifacts
```

## Step 13: Generate Refactoring Recommendations

Create `aicodepath-docs/inception/reverse-engineering/refactoring-recommendations.md`:

```markdown
# Refactoring Recommendations

## Purpose
These recommendations improve code quality for AI-assisted development and future maintenance.

## High Priority (Recommended before new development)

| Issue | Location | Recommendation | Impact |
|-------|----------|----------------|--------|
| Magic numbers | [files] | Extract to constants | High |
| Complex conditionals | [files] | Use strategy pattern | High |
| God classes (>500 lines) | [files] | Split by responsibility | High |
| Missing types | [files] | Add TypeScript/type hints | Medium |
| Inconsistent error handling | [files] | Standardize pattern | High |

## Medium Priority (Address during development)

| Issue | Location | Recommendation | Impact |
|-------|----------|----------------|--------|
| Inconsistent naming | [files] | Apply naming conventions | Medium |
| Dead code | [files] | Remove unused code | Low |
| Missing JSDoc/docstrings | [files] | Document public APIs | Medium |
| Hardcoded values | [files] | Move to configuration | Medium |
| Duplicate code | [files] | Extract shared functions | Medium |

## Low Priority (Nice to have)

| Issue | Location | Recommendation | Impact |
|-------|----------|----------------|--------|
| Outdated dependencies | package.json | Update to latest | Low |
| Missing tests | [files] | Add unit tests | Medium |
| Inconsistent logging | [files] | Use structured logger | Low |

## AI Agent Compatibility Score

| Criterion | Score | Notes |
|-----------|-------|-------|
| Type safety | [1-5] | [notes] |
| Code organization | [1-5] | [notes] |
| Naming clarity | [1-5] | [notes] |
| Documentation | [1-5] | [notes] |
| Test coverage | [1-5] | [notes] |
| **Overall** | [avg] | [summary] |

## Quick Wins
Top 5 refactorings with highest impact-to-effort ratio:
1. [Refactoring 1]
2. [Refactoring 2]
3. [Refactoring 3]
4. [Refactoring 4]
5. [Refactoring 5]
```

## Step 14: Code and Database Duplication Analysis

**Purpose**: Identify duplicate code, similar patterns, and redundant database structures to improve reusability.

Create `aicodepath-docs/inception/reverse-engineering/duplication-analysis.md`:

```markdown
# Code and Database Duplication Analysis

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Overall Duplication Score** | [X]/100 | [PASS/REVIEW/FAIL] |
| **Code Duplication** | [X]% | [Status] |
| **Database Schema Duplication** | [X]% | [Status] |
| **Files Analyzed** | [Count] | - |
| **Duplicates Found** | [Count] | - |

---

## Code Duplication Report

### Exact Duplicates (Must Fix)

Identical code blocks found in multiple locations:

| Source File | Lines | Target File | Lines | Size |
|-------------|-------|-------------|-------|------|
| [file1.ts] | [10-25] | [file2.ts] | [45-60] | [15 lines] |
| [file3.ts] | [100-120] | [file4.ts] | [200-220] | [20 lines] |

**Impact**: High - maintainability risk, bug propagation
**Recommendation**: Extract to shared utility module

### Near Duplicates (Should Review)

Similar code blocks (>70% similar):

| Source File | Target File | Similarity | Pattern |
|-------------|-------------|------------|---------|
| [service1.ts] | [service2.ts] | [85%] | [CRUD operations] |
| [validator1.ts] | [validator2.ts] | [78%] | [Validation logic] |

**Recommendation**: Consider generic abstraction or parameterization

### Duplicate Functions

Similar function implementations found:

| Function | Location 1 | Location 2 | Similarity | Recommendation |
|----------|------------|------------|------------|----------------|
| [validateUser] | [auth/validate.ts:15] | [user/check.ts:42] | [92%] | Extract to shared validator |
| [formatDate] | [utils/date.ts:10] | [helpers/format.ts:25] | [88%] | Consolidate in utils |

### Duplicate Classes/Components

Similar class structures found:

| Class | Location 1 | Location 2 | Similarity | Recommendation |
|-------|------------|------------|------------|----------------|
| [UserRepository] | [user/repo.ts] | [admin/repo.ts] | [80%] | Use generic repository |
| [ApiController] | [v1/controller.ts] | [v2/controller.ts] | [75%] | Base controller class |

---

## Database Duplication Report

### Similar Table Structures

Tables with highly similar column structures:

| Table 1 | Table 2 | Similarity | Common Columns | Recommendation |
|---------|---------|------------|----------------|----------------|
| [users] | [admin_users] | [85%] | [id, email, name, created_at] | Consider single table with role |
| [orders] | [archived_orders] | [95%] | [all columns] | Use soft delete instead |

### Redundant Indexes

Indexes that may be redundant:

| Index | Table | Columns | Redundant With | Recommendation |
|-------|-------|---------|----------------|----------------|
| [idx_user_email] | users | [email] | [idx_user_email_status] | Keep composite only |
| [idx_order_date] | orders | [created_at] | [idx_order_date_status] | Remove single column |

### Duplicate Migrations

Similar migration logic found:

| Migration 1 | Migration 2 | Similarity | Issue |
|-------------|-------------|------------|-------|
| [20240101_add_status] | [20240315_add_state] | [75%] | Similar column additions |

### Duplicate Queries/Views

Similar query patterns found:

| Location 1 | Location 2 | Pattern | Recommendation |
|------------|------------|---------|----------------|
| [userService:45] | [reportService:120] | User aggregation | Create shared view |
| [orderRepo:30] | [analyticsRepo:55] | Order statistics | Create stored procedure |

---

## Reusable Patterns Identified

### Existing Utilities to Reuse

Before implementing new code, check these existing utilities:

| Pattern | Location | Usage |
|---------|----------|-------|
| Date formatting | `src/utils/dateFormat.ts` | Use `formatDate()` |
| Validation | `src/validators/common.ts` | Use existing validators |
| Error handling | `src/middleware/errorHandler.ts` | Use standard error handler |
| Pagination | `src/utils/pagination.ts` | Use `paginate()` helper |

### Common Patterns Already Implemented

| Pattern | Implementation | Files Using |
|---------|----------------|-------------|
| Repository | `src/core/BaseRepository.ts` | [X] files |
| Controller | `src/core/BaseController.ts` | [X] files |
| Validator | `src/core/BaseValidator.ts` | [X] files |
| Service | `src/core/BaseService.ts` | [X] files |

---

## Recommendations Summary

### Immediate Actions (Before New Development)

1. **Extract Shared Utilities**: [List of code to extract]
   - Priority: HIGH
   - Files affected: [X]
   - Estimated effort: [Low/Medium/High]

2. **Consolidate Duplicate Validators**: [Details]
   - Priority: HIGH
   - Files affected: [X]
   - Estimated effort: [Low/Medium/High]

3. **Remove Redundant Indexes**: [List]
   - Priority: MEDIUM
   - Indexes affected: [X]
   - Estimated effort: Low

### During Development

1. **Use Existing Patterns**: Check `src/core/` before creating new base classes
2. **Avoid Copy-Paste**: Use these utilities instead: [List]
3. **Database Queries**: Check existing views before writing complex queries

---

## Duplication Score Breakdown

| Category | Weight | Score | Details |
|----------|--------|-------|---------|
| Exact code duplicates | 30% | [X]/100 | [count] instances |
| Near duplicates | 20% | [X]/100 | [count] instances |
| Function duplicates | 20% | [X]/100 | [count] instances |
| Table structure | 15% | [X]/100 | [count] instances |
| Index redundancy | 10% | [X]/100 | [count] instances |
| Query patterns | 5% | [X]/100 | [count] instances |
| **Overall** | 100% | **[X]/100** | [Status] |

### Score Interpretation

- **90-100**: Excellent - minimal duplication, well-factored code
- **70-89**: Good - some duplication, consider refactoring
- **50-69**: Fair - significant duplication, refactoring recommended
- **0-49**: Poor - excessive duplication, refactoring required before new development
```

---

## Step 15: Generate Visual Memory Diagrams

**Purpose**: Create visual diagrams to aid understanding and context

Execute visual memory generation for key architecture views:

### 15.1 Generate Database ER Diagram (if database exists)

- **Input**: Database schema files, migrations, ORM models
- **Output**: `aicodepath-docs/memory/global/er/database-schema.md`
- **Method**: Static analysis of schema
- **Sync Strategy**: Eager (critical for data integrity)

### 15.2 Generate Class Diagrams (if OOP codebase)

- **Input**: Source code files (classes, interfaces)
- **Output**: `aicodepath-docs/memory/global/class/domain-model.md`
- **Method**: AST-based static analysis
- **Sync Strategy**: Lazy (can tolerate staleness)

### 15.3 Generate System Flowchart

- **Input**: Main entry points, controllers, services
- **Output**: `aicodepath-docs/memory/global/flowcharts/system-flow.md`
- **Method**: Pattern-based analysis
- **Sync Strategy**: Eager (critical for understanding flow)

### 15.4 Generate Sequence Diagrams (for key APIs)

- **Input**: API endpoints, service interactions
- **Output**: `aicodepath-docs/memory/global/sequence/{business-transaction}.md`
- **Method**: LLM-based analysis (analyze code flow and generate sequence)
- **Sync Strategy**: Lazy (complex to regenerate)

**Execution**:
```javascript
// Use visual-memory-generator hook
node hooks/visual-memory-generator.js --type all --scope global --files "src/**/*,db/**/*"
```

**Success Criteria**:
- At least 2-3 diagrams generated (ER, class, or flowchart)
- Diagrams stored in database and file system
- Index.json updated with diagram metadata

## Step 16: Create Timestamp File

Create `aicodepath-docs/inception/reverse-engineering/reverse-engineering-timestamp.md`

## Step 17: Update State Tracking

Update `aicodepath-docs/aicodepath-state.md`

## Step 18: Present Completion Message to User

```markdown
# Reverse Engineering Complete

[AI-generated summary of key findings from analysis in bullet points]

**Key Findings:**
- Architecture: [Summary]
- Technology Stack: [Summary]
- Code Quality: [Summary]
- **Duplication Analysis**: Score [X]/100 - [Status]
- **Visual Diagrams**: [X] diagram(s) generated for architecture context

**Duplication Highlights:**
- Exact duplicates found: [X] instances
- Similar code patterns: [X] instances
- Database redundancies: [X] instances
- Reusable patterns identified: [X]

> **REVIEW REQUIRED:**
> Please examine the reverse engineering artifacts at: `aicodepath-docs/inception/reverse-engineering/`
> Pay special attention to: `duplication-analysis.md` for code reuse opportunities.

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to the reverse engineering analysis if required
> **Approve & Continue** - Approve analysis and proceed to **Requirements Analysis**
```

## Step 19: Wait for User Approval

- **MANDATORY**: Do not proceed until user explicitly approves
- **MANDATORY**: Log user's response in audit.md with complete raw input

---

## References

- Requirements Analysis: `rules/inception/requirements-analysis.md`
- Workflow Planning: `rules/inception/workflow-planning.md`
- Database Design: `rules/construction/database-design.md`
- Code Generation: `rules/construction/code-generation.md`
