# Code Generation (Per-Unit)

**Purpose**: Generate code based on all design artifacts

**Always Executes**: This stage runs for every unit

## Prerequisites
- All applicable design stages complete
- Tech stack decisions made
- Unit scope defined

---

## PART 0: GUIDELINE LOADING (BEFORE Code Generation)

**MANDATORY**: Load and verify guidelines before any code generation.

### Step 0.1: Load Guideline Files

Load all guideline JSON files from `guidelines/` directory:
- `coding-standards.json` - Naming, structure, style rules
- `architecture-rules.json` - Layering, dependencies, patterns
- `security-rules.json` - Input validation, secrets, injection prevention
- `testing-standards.json` - Coverage, naming, assertions

### Step 0.2: Create Compliance Checklist

Add to the code generation plan:

```markdown
## Guideline Compliance Checklist

### Guidelines Loaded
- [x] coding-standards.json (loaded, [X] rules)
- [x] architecture-rules.json (loaded, [X] rules)
- [x] security-rules.json (loaded, [X] rules)
- [x] testing-standards.json (loaded, [X] rules)

### Applicable Rules for This Unit

Based on unit type **[Controller/Service/Repository/etc.]**, these rules apply:

**Naming Conventions**:
- [ ] Classes use PascalCase
- [ ] Methods use camelCase
- [ ] Constants use SCREAMING_SNAKE_CASE
- [ ] Files match class names

**Architecture**:
- [ ] Controllers don't access database directly
- [ ] Services don't depend on request objects
- [ ] Repositories contain only data access logic
- [ ] Dependencies flow inward

**Security**:
- [ ] No hardcoded secrets
- [ ] All user input validated
- [ ] No SQL string concatenation
- [ ] Proper error handling (no stack traces exposed)

**Testing**:
- [ ] Test files use .test. or .spec. naming
- [ ] Each public method has tests
- [ ] Error cases covered
- [ ] Mocks for external dependencies

**Database** (if applicable):
- [ ] Use lookup tables, NOT ENUMs
- [ ] Foreign keys indexed
- [ ] Transactions for multi-step operations
```

### Step 0.3: Commitment Statement

Include in plan:

```markdown
### Commitment

I will follow all [X] loaded guidelines during this code generation.
Any violations detected during generation will be flagged and fixed before completion.
```

---

## PART 1: PLANNING

### Step 1: Load All Design Context

Load all available design artifacts:
- Functional design (domain-entities.md, business-rules.md, business-logic-model.md)
- NFR requirements (nfr-requirements.md, tech-stack-decisions.md)
- NFR design (nfr-design-patterns.md, logical-components.md)
- Infrastructure design (infrastructure-design.md, deployment-architecture.md)
- Database design (schema-design.md, migrations/) - if available
- AI implementation (model-selection.md, prompt-templates/) - if available

### Step 2: Create Code Generation Plan

Create `aicodepath-docs/construction/plans/{unit-name}-code-generation-plan.md`:

```markdown
# Code Generation Plan: [Unit Name]

## Unit Context
- **Unit ID**: [ID]
- **Unit Name**: [Name]
- **Tech Stack**: [Language/Framework]
- **Stories Covered**: [Story IDs]

## Code Structure
```
src/
├── {unit-name}/
│   ├── entities/           # Domain entities
│   ├── services/           # Business logic
│   ├── repositories/       # Data access
│   ├── controllers/        # API endpoints
│   ├── middleware/         # Cross-cutting concerns
│   ├── dto/                # Data transfer objects
│   ├── validators/         # Input validation
│   ├── utils/              # Utilities
│   └── tests/              # Unit tests
```

## Generation Steps

### Core Implementation
- [ ] Generate domain entities from domain-entities.md
- [ ] Generate DTOs for API input/output
- [ ] Generate validators from business-rules.md
- [ ] Generate repository interfaces
- [ ] Generate repository implementations
- [ ] Generate service layer from business-logic-model.md
- [ ] Generate API controllers/handlers
- [ ] Generate middleware (auth, logging, error handling)

### Database (if applicable)
- [ ] Generate database migrations
- [ ] Generate ORM models/mappings
- [ ] Generate seed data scripts

### AI Components (if applicable)
- [ ] Generate AI service wrapper
- [ ] Generate prompt templates
- [ ] Generate RAG components
- [ ] Generate agent implementations

### Infrastructure (if applicable)
- [ ] Generate IaC (CDK/Terraform)
- [ ] Generate Docker/container configs
- [ ] Generate CI/CD pipeline configs

### Testing
- [ ] Generate unit tests for entities
- [ ] Generate unit tests for services
- [ ] Generate unit tests for validators
- [ ] Generate integration tests
- [ ] Generate API tests

### Configuration
- [ ] Generate configuration files
- [ ] Generate environment templates
- [ ] Generate README/documentation

## Quality Checklist
- [ ] All business rules implemented
- [ ] All validation rules implemented
- [ ] Error handling in place
- [ ] Logging implemented
- [ ] Tests cover happy path
- [ ] Tests cover error cases
```

### Step 3: Request Plan Approval

```markdown
# Code Generation Plan Ready: [Unit Name]

Code generation plan has been created with [X] steps.

Key Components:
- Core Implementation: [X] items
- Database: [X] items
- AI Components: [X] items
- Testing: [X] items

> **REVIEW REQUIRED:**
> Please examine the plan at: `aicodepath-docs/construction/plans/{unit-name}-code-generation-plan.md`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Modify the code generation plan
> **Approve Plan** - Approve and begin code generation
```

### Step 4: Wait for Plan Approval
- Do not proceed to generation until plan is approved
- Log approval in audit.md

---

## PART 2: GENERATION

### Step 4.5: Schema Verification (MANDATORY for Data-Layer Code)

**BEFORE writing ANY of the following**, you MUST read the actual schema files:
- Repository implementations
- ORM models/entities
- Database queries (raw SQL or query builder)
- DTOs mapped to database columns
- Migration files
- Seed data scripts

**Required Actions**:
1. Read `aicodepath-docs/construction/{unit}/database-design/schema-design.md`
2. Read all files in `migrations/` directory (if exists)
3. Read `schema.prisma` or equivalent ORM schema (if exists)
4. Read ER diagrams in `aicodepath-docs/memory/global/er/`
5. Cross-reference EVERY column name in your code against the actual schema
6. If a column doesn't exist in the schema, DO NOT use it

**NEVER**:
- Assume column names based on entity names
- Add columns that aren't in the migration/schema files
- Use camelCase for DB columns when schema uses snake_case (or vice versa)

### Step 5: Execute Code Generation

For each step in the plan:

1. **Read the step** from the plan
2. **Load relevant design artifacts** for that step
3. **Generate the code** following:
   - Design patterns from NFR design
   - Business logic from functional design
   - Tech stack from tech-stack-decisions
4. **Mark step complete** [x] in the plan
5. **Proceed to next step**

### Step 6: Code Quality Checks

After generation:
- [ ] Verify code compiles/parses
- [ ] Verify imports are correct
- [ ] Verify naming conventions followed
- [ ] Verify error handling in place
- [ ] Verify logging implemented

### Step 7: Update Progress

- Mark all steps complete in code-generation-plan.md
- Update aicodepath-state.md

### Step 8: Present Completion Message

```markdown
# Code Generation Complete: [Unit Name]

Code generation has produced:
- **Files Created**: [Count]
- **Lines of Code**: [Approximate]
- **Tests Created**: [Count]

Generated Components:
- Entities: [List]
- Services: [List]
- Controllers: [List]
- Tests: [List]

> **REVIEW REQUIRED:**
> Please examine the generated code at: `aicodepath-docs/construction/{unit-name}/code/`

> **WHAT'S NEXT?**
>
> **You may:**
>
> **Request Changes** - Ask for modifications to generated code
> **Continue to Next Stage** - Proceed to **[Next Unit/Build and Test]**
```

### Step 9: Wait for Explicit Approval
- User must choose between "Request Changes" or "Continue to Next Stage"
- Log user's response in audit.md

---

## PART 3: COMMIT (After Approval)

**Execute after user approves code generation.**

### Step 10: Pre-Commit Validation

Before committing generated code:

1. **Run Guideline Validator**
   - Scan all generated files
   - Check against loaded guidelines
   - Collect violations

2. **If Violations Found**:
   ```markdown
   ## Commit Blocked - Violations Found

   The following violations must be fixed before committing:

   | File | Line | Violation | Severity |
   |------|------|-----------|----------|
   | [file] | [line] | [message] | [error/warning] |

   ---

   > **WHAT'S NEXT?**
   >
   > **Fix Violations** - I'll help fix these issues
   > **Override** - Commit anyway (NOT RECOMMENDED for errors)
   ```

3. **If No Violations**:
   - Proceed to commit

### Step 11: Auto-Commit Code

After validation passes:

1. **Stage Files**
   ```bash
   git add src/{unit-path}/
   git add tests/{unit-path}/
   git add aicodepath-docs/construction/{unit}/code/
   git add aicodepath-docs/implementation-status.json
   ```

2. **Create Commit**

   Use standardized commit message:
   ```
   feat(cr-{number}/{unit}): implement {short description}

   {Brief description of what was implemented}

   Components:
   - {Component/Service 1}
   - {Component/Service 2}

   Tests:
   - {X} unit tests added
   - Coverage: {X}% (if known)

   Breaking Changes: {None/List}

   Generated by AICodePath workflow
   ```

3. **Update State Files**
   - Record commit hash in `context-state.json`
   - Update `implementation-status.json` with completion status
   - Log in `audit.md`

4. **Present Confirmation**
   ```markdown
   ## Code Committed Successfully

   **Commit**: {short-hash}
   **Message**: feat(cr-XXX/{unit}): {description}
   **Files**: {count} files, {lines} lines added

   Proceeding to next unit or Build and Test...
   ```

---

# CODE GENERATION GUIDELINES

## General Principles
- **Follow Design**: Code must match the design artifacts exactly
- **Use Tech Stack**: Use only technologies from tech-stack-decisions
- **Apply Patterns**: Implement patterns from nfr-design-patterns
- **Implement Rules**: All business rules must be in code
- **Handle Errors**: Every operation must have error handling
- **Add Logging**: Log significant operations and errors
- **Write Tests**: Every public method should have tests

## Code Style
- Follow language-specific best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small
- Avoid deep nesting

## Testing Guidelines
- Test happy path first
- Test error scenarios
- Test edge cases
- Mock external dependencies
- Assert specific outcomes

## Documentation
- Add JSDoc/docstrings to public methods
- Document configuration options
- Include usage examples where helpful
