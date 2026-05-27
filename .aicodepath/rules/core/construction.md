# CONSTRUCTION PHASE

**Purpose**: Detailed design, NFR implementation, and code generation

**Focus**: Determine HOW to build it

**Stages in CONSTRUCTION PHASE**:
- Gap Analysis (OPTIONAL, per-module - brownfield only)
- Environment Strategy (CONDITIONAL, once per project - before units)
- Per-Unit Loop (executes for each unit):
  - Functional Design (CONDITIONAL, per-unit)
  - NFR Requirements (CONDITIONAL, per-unit)
  - NFR Design (CONDITIONAL, per-unit)
  - Infrastructure Design (CONDITIONAL, per-unit)
  - Database Design (CONDITIONAL, per-unit)
  - Docker Design (CONDITIONAL, per-unit)
  - Kubernetes Design (CONDITIONAL, per-unit)
  - Mobile Design (CONDITIONAL, per-unit)
  - Web UI/UX Design (CONDITIONAL, per-unit)
  - Mobile UI/UX Design (CONDITIONAL, per-unit)
  - AI Implementation Design (CONDITIONAL, per-unit)
  - Code Generation (ALWAYS, per-unit)
- CI/CD Design (CONDITIONAL, once per project - after all units)
- Build and Test (ALWAYS - after all units complete)

**Note**: Each unit is completed fully (design + code) before moving to the next unit.

---

## Gap Analysis (OPTIONAL, per-module - Brownfield Only)

**Purpose**: Targeted pre-construction analysis to identify gaps, reuse opportunities, and conflicts

**Execute IF**:
- Brownfield project (existing codebase)
- User accepts gap analysis prompt
- Related construction module is planned

**Skip IF**:
- Greenfield project (unless explicitly requested)
- User declines gap analysis prompt
- Full reverse engineering was recently completed

**Trigger Points**:
| Before Module | Gap Analysis Focus |
|---------------|-------------------|
| Database Design | Schema gaps, existing tables, ORM patterns |
| API/Backend Design | Endpoint coverage, existing routes, middleware |
| Auth Design | Security gaps, existing auth flows, token patterns |
| Caching Design | Cache candidates, hot paths, existing cache |
| Search/AI Design | Search requirements, AI readiness, data availability |

**Prompt Format**:
```markdown
**Gap Analysis Available for {Module}**

Before proceeding with {Module} construction, would you like to run gap analysis?

This will:
- Scan existing code for reuse opportunities
- Identify gaps between current and required functionality
- Check for potential conflicts with existing implementations
- Generate implementation recommendations

**Options**:
1. **Yes - Full Analysis** (recommended for complex modules, ~2-5 min)
2. **Yes - Quick Scan** (basic compatibility check, ~30 sec)
3. **No - Skip** (proceed directly to construction with warning)
```

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Gap Analysis" in_progress
   ```
2. **MANDATORY**: Log gap analysis prompt and user response in audit.md
3. **IF user accepts**:
   - Load all steps from `construction/gap-analysis.md`
   - Execute targeted analysis for the specific module
   - Generate gap report in `aicodepath-docs/construction/{unit}/gap-analysis/`
   - Inject findings into construction context
3. **IF user declines**:
   - Log skip decision with warning
   - Proceed to construction with context note about skipped analysis
4. **MANDATORY**: Log completion or skip in audit.md
5. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Gap Analysis" completed

   # Create artifacts (if analysis was run)
   node .aicodepath/lib/artifact-writer.js create design "Gap Analysis" construction \
     --file=aicodepath-docs/construction/{unit}/gap-analysis/{module}-gaps.md
   ```

**Output Location**:
```
aicodepath-docs/construction/{unit}/gap-analysis/
├── {module}-gaps.md              # Identified gaps
├── {module}-recommendations.md   # Suggested approaches
├── {module}-reuse.md            # Code to leverage
└── {module}-conflicts.md        # Potential conflicts
```

---

## Environment Strategy (CONDITIONAL, once per project)

**Execute IF**:
- Multi-environment deployment needed (dev/staging/prod)
- Repository structure strategy required
- Branching strategy needs definition
- Feature flags implementation planned

**Skip IF**:
- Single environment deployment
- Repository strategy already defined
- No automated deployments planned

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Environment Strategy" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/environment-strategy.md`
3. Execute environment strategy design:
   - Define repository structure (monorepo vs multi-repo)
   - Choose branching strategy
   - Design environment promotion workflow
   - Plan feature flags strategy
   - Create ArgoCD ApplicationSet (if GitOps)
4. **Decision Logging**: If repository or branching strategy decisions were made, log them
   ```bash
   # Example: If repository structure was decided
   node .aicodepath/lib/decision-logger.js log \
     --title "Repository Structure Strategy" \
     --context "Need to manage multiple microservices with shared libraries" \
     --decision "Use monorepo with Nx/Turborepo for shared code management" \
     --alternatives '["Multi-repo with package registry", "Monolith with modular structure", "Git submodules"]' \
     --consequences "Easier code sharing, atomic cross-service changes, requires build tool setup" \
     --status accepted \
     --category devops
   ```
5. **MANDATORY**: Present standardized 2-option completion message
6. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Environment Strategy" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Environment Strategy" construction \
     --file=aicodepath-docs/construction/environment-strategy/environment-strategy.md
   ```

---

## Per-Unit Loop (Executes for Each Unit)

### Functional Design (CONDITIONAL, per-unit)

**Execute IF**:
- New data models or schemas
- Complex business logic
- Business rules need detailed design

**Skip IF**:
- Simple logic changes
- No new business logic

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Functional Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/functional-design.md`
3. Execute functional design for this unit
4. **MANDATORY**: Present standardized 2-option completion message
5. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
6. **MANDATORY**: Log user's response in audit.md with complete raw input
7. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Functional Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Functional Design" construction \
     --file=aicodepath-docs/construction/{unit}/functional-design/functional-design.md
   ```
8. **Traceability** (OPTIONAL): If this design implements specific requirements, create links
   ```bash
   # Get the design artifact ID (most recent)
   DESIGN_ID=$(sqlite3 aicodepath-docs/aicodepath.db "SELECT id FROM artifacts WHERE artifact_type='design' ORDER BY created_at DESC LIMIT 1")

   # Find requirement artifact(s) by title or ID
   REQ_ID=$(sqlite3 aicodepath-docs/aicodepath.db "SELECT id FROM artifacts WHERE artifact_type='requirement' AND title LIKE '%{requirement-keyword}%' LIMIT 1")

   # Create link: design implements requirement
   node .aicodepath/lib/link-manager.js link $REQ_ID $DESIGN_ID implements
   ```

### NFR Requirements (CONDITIONAL, per-unit)

**Execute IF**:
- Performance requirements exist
- Security considerations needed
- Scalability concerns present
- Tech stack selection required

**Skip IF**:
- No NFR requirements
- Tech stack already determined

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "NFR Requirements" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/nfr-requirements.md`
3. Execute NFR assessment for this unit
4. **Decision Logging**: If tech stack or architecture decisions were made, log them
   ```bash
   # Example: If PostgreSQL was selected
   node .aicodepath/lib/decision-logger.js log \
     --title "Technology Stack Selection" \
     --context "Performance and scalability requirements for user data" \
     --decision "Use PostgreSQL as primary database" \
     --alternatives '["MySQL", "MongoDB", "DynamoDB"]' \
     --consequences "Strong ACID guarantees, excellent query performance, mature ecosystem" \
     --status accepted \
     --category architecture
   ```
5. **MANDATORY**: Present standardized 2-option completion message
6. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "NFR Requirements" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "NFR Requirements" construction \
     --file=aicodepath-docs/construction/{unit}/nfr-design/nfr-requirements.md
   ```

### NFR Design (CONDITIONAL, per-unit)

**Execute IF**:
- NFR Requirements was executed
- NFR patterns need to be incorporated

**Skip IF**:
- No NFR requirements
- NFR Requirements Assessment was skipped

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "NFR Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/nfr-design.md`
3. Execute NFR design for this unit
4. **MANDATORY**: Present standardized 2-option completion message
5. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
6. **MANDATORY**: Log user's response in audit.md with complete raw input
7. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "NFR Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "NFR Design" construction \
     --file=aicodepath-docs/construction/{unit}/nfr-design/nfr-design.md
   ```

### Infrastructure Design (CONDITIONAL, per-unit)

**Execute IF**:
- Infrastructure services need mapping
- Deployment architecture required
- Cloud resources need specification

**Skip IF**:
- No infrastructure changes
- Infrastructure already defined

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Infrastructure Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/infrastructure-design.md`
3. Execute infrastructure design for this unit
4. **Decision Logging**: If cloud or deployment architecture decisions were made, log them
   ```bash
   # Example: If deployment strategy was decided
   node .aicodepath/lib/decision-logger.js log \
     --title "Deployment Architecture" \
     --context "Need scalable, highly available infrastructure for production workloads" \
     --decision "Use Kubernetes on AWS EKS with multi-AZ setup" \
     --alternatives '["AWS ECS", "Self-managed K8s on EC2", "AWS Lambda + API Gateway"]' \
     --consequences "High scalability, managed control plane, slightly higher cost, learning curve" \
     --status accepted \
     --category infrastructure
   ```
5. **MANDATORY**: Present standardized 2-option completion message
6. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Infrastructure Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Infrastructure Design" construction \
     --file=aicodepath-docs/construction/{unit}/infrastructure-design/infrastructure-design.md
   ```

### Database Design (CONDITIONAL, per-unit)

**Execute IF**:
- New database schema required
- Data model changes needed
- Database migrations required
- Performance optimization for data layer

**Skip IF**:
- No database changes
- Database already defined

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Database Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/database-design.md`
3. Execute database design for this unit:
   - Schema design and normalization (with lookup tables best practices)
   - Index strategy
   - Migration planning
   - Audit logging design
   - Multi-schema organization (for complex systems)
   - Cost analysis for database resources
4. **Decision Logging**: If database or schema decisions were made, log them
   ```bash
   # Example: If schema approach was decided
   node .aicodepath/lib/decision-logger.js log \
     --title "Database Schema Approach" \
     --context "Complex multi-tenant application with varying data models" \
     --decision "Use multi-schema organization with tenant-specific schemas" \
     --alternatives '["Single schema with tenant_id", "Separate databases per tenant", "Shared schema with row-level security"]' \
     --consequences "Improved isolation, easier backups per tenant, slightly more complex migrations" \
     --status accepted \
     --category data-modeling
   ```
5. **MANDATORY**: Present standardized 2-option completion message
6. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Database Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Database Design" construction \
     --file=aicodepath-docs/construction/{unit}/database-design/database-design.md
   ```

### Docker Design (CONDITIONAL, per-unit)

**Execute IF**:
- Container-based deployment required
- Multi-stage build optimization needed
- Environment-specific images required
- Harbor registry management needed

**Skip IF**:
- No containerization required
- Docker already configured and unchanged
- Serverless-only deployment

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Docker Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/docker-design.md`
3. Execute Docker design for this unit:
   - Multi-stage Dockerfile (deps → builder → production → staging → development)
   - Base image strategy (distroless/alpine/full per environment)
   - Image optimization and size targets
   - Docker Compose for local development
   - Harbor registry tagging strategy
4. **Decision Logging**: If base image or containerization decisions were made, log them
   ```bash
   # Example: If base image strategy was decided
   node .aicodepath/lib/decision-logger.js log \
     --title "Docker Base Image Strategy" \
     --context "Need secure, minimal production images with fast build times" \
     --decision "Use distroless for production, alpine for development" \
     --alternatives '["Ubuntu", "Alpine only", "Debian slim", "Scratch"]' \
     --consequences "Minimal attack surface, smaller images, requires static binaries for distroless" \
     --status accepted \
     --category devops
   ```
5. **MANDATORY**: Present standardized 2-option completion message
6. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Docker Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Docker Design" construction \
     --file=aicodepath-docs/construction/{unit}/docker-design/docker-design.md
   ```

### Kubernetes Design (CONDITIONAL, per-unit)

**Execute IF**:
- Kubernetes deployment required
- Helm chart creation needed
- Multi-environment K8s configuration required
- Pod security and scaling design needed

**Skip IF**:
- No Kubernetes deployment
- Kubernetes manifests already defined and unchanged
- Non-K8s deployment target

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Kubernetes Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/kubernetes-design.md`
3. Execute Kubernetes design for this unit:
   - Base manifests (Deployment, Service, HPA, PDB)
   - Helm chart structure with environment values
   - Resource limits matrix (dev/staging/prod sizing)
   - External Secrets integration
   - Network policies and security contexts
4. **Decision Logging**: If Helm or manifest strategy decisions were made, log them
   ```bash
   # Example: If Helm vs raw manifests was decided
   node .aicodepath/lib/decision-logger.js log \
     --title "Kubernetes Configuration Strategy" \
     --context "Need to manage multiple environments with different configurations" \
     --decision "Use Helm charts with values files per environment" \
     --alternatives '["Kustomize", "Raw YAML manifests", "Jsonnet", "cdk8s"]' \
     --consequences "Templating power, easy environment management, learning curve, complex charts" \
     --status accepted \
     --category devops
   ```
5. **MANDATORY**: Present standardized 2-option completion message
6. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Kubernetes Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Kubernetes Design" construction \
     --file=aicodepath-docs/construction/{unit}/kubernetes-design/kubernetes-design.md
   ```

### Mobile Design (CONDITIONAL, per-unit)

**Execute IF**:
- Mobile application is required (iOS, Android, PWA, or hybrid)
- Mobile-specific features needed (offline, push notifications, etc.)
- Cross-platform strategy needs definition
- Mobile architecture patterns required

**Skip IF**:
- No mobile application needed
- Web-only solution
- Mobile already defined and unchanged

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Mobile Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/mobile-design.md`
3. Execute mobile design for this unit:
   - Platform selection (Native iOS/Android, PWA, Hybrid frameworks)
   - Mobile architecture (MVVM, MVI, Clean Architecture)
   - Offline strategy and data synchronization
   - Push notification design
   - Mobile performance optimization
   - Platform-specific guidelines
4. **Decision Logging**: If platform or architecture decisions were made, log them
   ```bash
   # Example: If mobile platform was selected
   node .aicodepath/lib/decision-logger.js log \
     --title "Mobile Platform Selection" \
     --context "Need cross-platform mobile app with native performance" \
     --decision "Use React Native for iOS and Android" \
     --alternatives '["Native iOS + Android", "Flutter", "Ionic", "PWA"]' \
     --consequences "Single codebase, good performance, large community, slight native limitations" \
     --status accepted \
     --category architecture
   ```
5. **MANDATORY**: Present standardized 2-option completion message
6. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Mobile Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Mobile Design" construction \
     --file=aicodepath-docs/construction/{unit}/mobile-design/mobile-design.md
   ```

### Web UI/UX Design (CONDITIONAL, per-unit - NEW)

**Execute IF**:
- Web user interface required
- Frontend application needed
- User-facing web pages required
- Admin dashboard or portal needed

**Skip IF**:
- API-only backend service
- No web UI needed
- UI already defined and unchanged

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Web UI/UX Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/web-ux-design.md`
3. Execute web UI/UX design for this unit:
   - UI structure and page templates
   - Component library (shared/uniform components)
   - User flows and navigation
   - Accessibility requirements (WCAG compliance)
   - Interaction patterns
4. **MANDATORY**: Present standardized 2-option completion message
5. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
6. **MANDATORY**: Log user's response in audit.md with complete raw input
7. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Web UI/UX Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Web UI/UX Design" construction \
     --file=aicodepath-docs/construction/{unit}/web-ux-design/web-ux-design.md
   ```

### Mobile UI/UX Design (CONDITIONAL, per-unit - NEW)

**Execute IF**:
- Mobile application UI required
- Mobile user interface patterns needed
- Mobile-specific UX design required
- Screen designs and flows needed for mobile app

**Skip IF**:
- No mobile UI needed
- Mobile design already defined and unchanged
- Mobile Design stage was skipped

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Mobile UI/UX Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/mobile-ux-design.md`
3. Execute mobile UI/UX design for this unit:
   - Mobile UI structure and screen templates
   - Mobile component library (platform-specific and shared)
   - Mobile user flows and gestures
   - Mobile accessibility (VoiceOver, TalkBack, Dynamic Type)
   - Mobile interaction patterns
4. **MANDATORY**: Present standardized 2-option completion message
5. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
6. **MANDATORY**: Log user's response in audit.md with complete raw input
7. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Mobile UI/UX Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Mobile UI/UX Design" construction \
     --file=aicodepath-docs/construction/{unit}/mobile-ux-design/mobile-ux-design.md
   ```

### AI Implementation Design (CONDITIONAL, per-unit)

**Execute IF**:
- AI/ML components required
- LLM integration needed
- RAG implementation planned
- Agent architecture design needed
- Model selection and cost analysis required

**Skip IF**:
- No AI components
- AI implementation already defined

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "AI Implementation Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/ai-implementation.md`
3. Execute AI implementation design for this unit:
   - Model selection with cost analysis
   - Prompt engineering strategy
   - RAG architecture (if applicable)
   - Agent design patterns
   - Fine-tuning considerations
   - Embedding strategy
4. **Decision Logging**: If model or architecture decisions were made, log them
   ```bash
   # Example: If LLM model was selected
   node .aicodepath/lib/decision-logger.js log \
     --title "LLM Model Selection" \
     --context "Need cost-effective, high-quality text generation for chatbot" \
     --decision "Use Claude Sonnet 4.5 for production, Haiku for high-volume tasks" \
     --alternatives '["GPT-4", "GPT-3.5 Turbo", "Claude Opus", "Llama 2"]' \
     --consequences "Best quality/cost ratio, strong reasoning, API dependency, usage costs" \
     --status accepted \
     --category architecture
   ```
5. **MANDATORY**: Present standardized 2-option completion message
6. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "AI Implementation Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "AI Implementation Design" construction \
     --file=aicodepath-docs/construction/{unit}/ai-implementation/ai-implementation.md
   ```

### Code Generation (ALWAYS EXECUTE, per-unit)

**Always executes for each unit**

**Code Generation has two parts within one stage**:
1. **Part 1 - Planning**: Create detailed code generation plan with explicit steps
2. **Part 2 - Generation**: Execute approved plan to generate code, tests, and artifacts

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Code Generation" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/code-generation.md`
3. **PART 1 - Planning**: Create code generation plan with checkboxes, get user approval
4. **PART 2 - Generation**: Execute approved plan to generate code for this unit
5. **MANDATORY**: Present standardized 2-option completion message
6. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete, create artifacts, and index code
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Code Generation" completed

   # Create artifacts for generated code
   node .aicodepath/lib/artifact-writer.js create code "Generated Code" construction \
     --file=aicodepath-docs/construction/{unit}/code/

   # Index generated code entities
   node .aicodepath/lib/code-indexer.js index aicodepath-docs/construction/{unit}/code/
   ```
9. **Traceability** (OPTIONAL): Create links from code to design documents
   ```bash
   # Get the code artifact ID (most recent)
   CODE_ID=$(sqlite3 aicodepath-docs/aicodepath.db "SELECT id FROM artifacts WHERE artifact_type='code' ORDER BY created_at DESC LIMIT 1")

   # Find design artifact(s) that this code implements
   DESIGN_ID=$(sqlite3 aicodepath-docs/aicodepath.db "SELECT id FROM artifacts WHERE artifact_type='design' AND unit='{unit}' ORDER BY created_at DESC LIMIT 1")

   # Create link: code implements design
   node .aicodepath/lib/link-manager.js link $DESIGN_ID $CODE_ID implements
   ```

---

## Pre-Commit Verification Checklist (ALWAYS EXECUTE)

**MANDATORY before every `git commit` during CONSTRUCTION phase.**

Before committing any code changes, you MUST complete ALL of the following verification steps:

1. **Run Unit Tests**: Execute the project's test suite and verify all tests pass
   ```bash
   # Detect and run appropriate test command
   npm test        # Node.js projects
   pytest          # Python projects
   go test ./...   # Go projects
   ```
   If tests fail, fix the failures before committing.

2. **Verify No Import/Syntax Errors**: Attempt to start or compile the application
   ```bash
   # Node.js: check for syntax/import errors
   node -e "require('./src/index.js')" 2>&1 || echo "IMPORT ERROR DETECTED"

   # TypeScript: type-check without emitting
   npx tsc --noEmit

   # Python: check for import errors
   python -c "import main" 2>&1 || echo "IMPORT ERROR DETECTED"
   ```
   If import errors are detected, fix them before committing.

3. **Smoke Test** (when applicable): Start the application briefly to verify it boots
   ```bash
   # Start app in background, wait 5 seconds, check if still running
   timeout 10 node src/index.js &
   APP_PID=$!
   sleep 5
   if kill -0 $APP_PID 2>/dev/null; then
     echo "Smoke test PASSED - app started successfully"
     kill $APP_PID
   else
     echo "Smoke test FAILED - app crashed on startup"
     # Do NOT commit
   fi
   ```

4. **Only then commit**: After all checks pass, invoke `/aicodepath-commit` (batch boundary commit)
   - Updates `active-worktree.json` (resets `batches_since_commit`, sets `status: "clean"`)
   - Updates plan's `## Branch Lifecycle` section with commit hash

5. **Batch Tracking** (when applicable): After commit succeeds, verify:
   - `active-worktree.json` updated (`batches_since_commit` reset to 0)
   - Branch Lifecycle in plan ticked with commit hash for this batch

**CRITICAL**: Never commit code that:
- Has failing unit tests
- Crashes on startup (import errors, missing dependencies)
- Has unresolved TypeErrors or ReferenceErrors at runtime
- Uses undefined variables, missing properties, or incorrect function signatures

If any verification step fails, fix the issue and re-run all checks before committing.

---

## CI/CD Design (CONDITIONAL, once per project)

**Execute IF**:
- Automated build/test/deploy required
- GitHub Actions workflows needed
- Multi-environment deployment automation required
- Quality gates enforcement needed

**Skip IF**:
- Manual deployment only
- CI/CD already configured and unchanged
- No automation required

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "CI/CD Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this stage in audit.md
3. Load all steps from `construction/cicd-design.md`
3. Execute CI/CD design:
   - PR pipeline (lint → test → build → security scan)
   - Main pipeline (build → push → deploy dev → smoke test)
   - Release pipeline (tag → staging → manual gate → production)
   - Quality gates matrix (coverage >80%, no critical CVEs)
   - GitHub secrets and environments configuration
4. **MANDATORY**: Present standardized 2-option completion message
5. **Wait for Explicit Approval**: User must choose between "Request Changes" or "Continue to Next Stage"
6. **MANDATORY**: Log user's response in audit.md with complete raw input
7. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "CI/CD Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "CI/CD Design" construction \
     --file=aicodepath-docs/construction/cicd-design/cicd-design.md
   ```

---

## Build and Test (ALWAYS EXECUTE)

1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update construction "Build and Test" in_progress
   ```
2. **MANDATORY**: Log any user input during this phase in audit.md
3. Load all steps from `construction/build-and-test.md`
3. Generate comprehensive build and test instructions:
   - Build instructions for all units
   - Unit test execution instructions
   - Integration test instructions
   - Performance test instructions (if applicable)
   - Additional test instructions as needed
4. Create instruction files in build-and-test/ subdirectory
5. **Wait for Explicit Approval**: Ask: "**Build and test instructions complete. Ready to proceed to Operations stage?**"
6. **MANDATORY**: Log user's response in audit.md with complete raw input
7. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update construction "Build and Test" completed

   # Create test artifacts
   node .aicodepath/lib/artifact-writer.js create test "Build and Test Instructions" construction \
     --file=aicodepath-docs/construction/build-and-test/
   ```
8. **Traceability** (OPTIONAL): Create links from tests to code
   ```bash
   # Get the test artifact ID (most recent)
   TEST_ID=$(sqlite3 aicodepath-docs/aicodepath.db "SELECT id FROM artifacts WHERE artifact_type='test' ORDER BY created_at DESC LIMIT 1")

   # Find code artifact(s) that these tests verify
   CODE_ID=$(sqlite3 aicodepath-docs/aicodepath.db "SELECT id FROM artifacts WHERE artifact_type='code' ORDER BY created_at DESC LIMIT 1")

   # Create link: test verifies code
   node .aicodepath/lib/link-manager.js link $CODE_ID $TEST_ID tests
   ```
