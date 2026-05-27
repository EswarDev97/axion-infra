# INCEPTION PHASE

**Purpose**: Planning, requirements gathering, and architectural decisions

**Focus**: Determine WHAT to build and WHY

**Stages in INCEPTION PHASE**:
- Workspace Detection (ALWAYS)
- Product Discovery (CONDITIONAL - Greenfield new product only)
- Reverse Engineering (CONDITIONAL - Brownfield only)
- Requirements Analysis (ALWAYS - Adaptive depth)
- User Stories (CONDITIONAL)
- Sprint Planning (CONDITIONAL - NEW)
- Write Design (ALWAYS — after brainstorm/application design)
- Workflow Planning (ALWAYS)
- Application Design (CONDITIONAL)
- Units Generation (CONDITIONAL)
- Plan Review (ALWAYS — after write-plan)

---

## Workspace Detection (ALWAYS EXECUTE)

1. **MANDATORY**: Log initial user request in audit.md with complete raw input
2. Load all steps from `inception/workspace-detection.md`
3. **DB Integration**: Update workflow state
   ```bash
   # Mark stage as in progress
   node .aicodepath/lib/kb-writer.js update inception "Workspace Detection" in_progress
   ```
4. Execute workspace detection:
   - Check for existing aicodepath-state.md (resume if found)
   - Scan workspace for existing code
   - Determine if brownfield or greenfield
   - Check for existing reverse engineering artifacts
5. Determine next phase: Reverse Engineering (if brownfield and no artifacts) OR Requirements Analysis
6. **MANDATORY**: Log findings in audit.md
7. **DB Integration**: Mark stage complete and create artifact
   ```bash
   # Mark stage as completed
   node .aicodepath/lib/kb-writer.js update inception "Workspace Detection" completed

   # Create artifact for workspace analysis
   node .aicodepath/lib/artifact-writer.js create requirement "Workspace Analysis" inception \
     --file=aicodepath-docs/inception/workspace-analysis.md
   ```
8. Present completion message to user (see workspace-detection.md for message formats)
9. Automatically proceed to next phase
10. **Set RE_ROUTE**: After workspace detection completes, persist the route decision:
    ```bash
    node -e "const {SessionStateManager} = require('./.aicodepath/lib/session-state-manager'); const ssm = new SessionStateManager(); ssm.setState('re_route', process.argv[1])" -- <route>
    ```
    - Greenfield: `re_route = 'greenfield'`
    - Brownfield with existing RE artifacts: `re_route = 'brownfield_shallow'`
    - Brownfield without RE artifacts: `re_route = 'brownfield_deep'`

## GF/BF Route Branching

After workspace detection, the `re_route` key determines the RE path:

| Route | Condition | RE Depth |
|-------|-----------|----------|
| `greenfield` | No existing code detected | Skip RE — proceed to Requirements Analysis |
| `brownfield_shallow` | Existing code + RE artifacts present | Shallow RE (~5 min overview) |
| `brownfield_deep` | Existing code + no RE artifacts | Deep RE (~15 min full analysis) |

The route is stored in session state (`re_route` key) and gates RE template selection in the reverse engineering orchestrator.

## Product Discovery (CONDITIONAL — Greenfield New Product Only)

**Execute IF**:
- `re_route = 'greenfield'` (new project, no existing codebase)
- User request describes building a new product, service, or platform (not adding to an existing one)
- No existing `aicodepath-docs/pm/hypothesis-personas.md` or `aicodepath-docs/pm/competitive-awareness.md`

**Skip IF**:
- Brownfield project (`re_route` is `brownfield_shallow` or `brownfield_deep`)
- Feature-level request (references specific file paths, existing modules, or existing system context)
- PM artifacts already exist in `aicodepath-docs/pm/` and are <90 days old
- User has already described defined users and a clear problem statement

**Execution**:
1. Ask the binary detection question (one message, no preamble):
   > "Before we design — do you have a clear picture of who your users are and what problem they have today? [Yes, I know my users / No, not yet defined]"

2. If **Yes**: skip this phase entirely — proceed to Requirements Analysis
3. If **No**: present the three-path choice menu:
   > "To ground the design in real product context, choose one:
   > **[A] Research it now** (~5–10 min) — I'll search the web for user personas and competitive landscape
   > **[B] You describe it** (~2–3 min) — I'll ask you 3 structured questions and synthesize the artifacts
   > **[C] Quick AI hypotheses** (~1 min) — I'll generate working assumptions labeled as unvalidated; you validate before architecture locks"

4. **Route A — Web Research**:
   - Invoke `/aicodepath-research-mode` with query: "user personas and competitive landscape for [product domain]"
   - Synthesize findings into `aicodepath-docs/pm/hypothesis-personas.md` and `aicodepath-docs/pm/competitive-awareness.md`
   - Set `**Source:** Web Research` in both files

5. **Route B — User Description**:
   - Ask Q1: "Who is the primary user? (role, context, industry)"
   - Ask Q2: "What does the user do today without your product? (current tools/workarounds)"
   - Ask Q3: "What would make them switch? (the trigger or breaking point)"
   - Synthesize answers into both artifact files
   - Set `**Source:** User-Provided` in both files

6. **Route C — AI Hypotheses**:
   - Generate 2–3 hypothetical personas and 3–5 competitive alternatives from domain name alone
   - Prefix every artifact with: `⚠️ AI HYPOTHESIS — Not based on research. Validate before architecture locks.`
   - Set `**Source:** AI Hypothesis` in both files

7. **Create artifact directory and write files**:
   ```bash
   mkdir -p aicodepath-docs/pm/
   ```
   Write `aicodepath-docs/pm/hypothesis-personas.md` and `aicodepath-docs/pm/competitive-awareness.md`
   following schema in `.aicodepath/skills/aicodepath-pm/references/pm-artifact-schema.md`

8. Present artifacts to user — ask: "Does this capture the product context accurately? [Yes / Adjust]"
9. Proceed to Requirements Analysis with PM artifacts loaded as context

**Staleness check** (session start only):
- If `aicodepath-docs/pm/` exists and `Generated:` date is >90 days old:
  > "PM artifacts are [N] days old — still current for this product direction? [Yes / Regenerate]"

## Reverse Engineering (CONDITIONAL - Brownfield Only)

**Execute IF**:
- Existing codebase detected
- No previous reverse engineering artifacts found

**Skip IF**:
- Greenfield project
- Previous reverse engineering artifacts exist

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Reverse Engineering" in_progress
   ```
2. **MANDATORY**: Log start of reverse engineering in audit.md
3. Load all steps from `inception/reverse-engineering.md`
3. Execute reverse engineering:
   - Analyze all packages and components
   - Generate a business overview of the whole system
   - Generate architecture documentation
   - Generate code structure documentation
   - Generate API documentation
   - Generate component inventory
   - Generate technology stack documentation
   - Generate dependencies documentation
4. **Wait for Explicit Approval**: Present detailed completion message - DO NOT PROCEED until user confirms
4.5. **Suggest AI-Readiness scan**: After presenting RE completion, suggest `/aicodepath-brownfield-readiness` to produce an AI-Readiness score before proceeding to Application Design.
5. **MANDATORY**: Log user's response in audit.md with complete raw input
6. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update inception "Reverse Engineering" completed

   # Create artifacts for each generated doc
   node .aicodepath/lib/artifact-writer.js create design "Reverse Engineering Report" inception \
     --file=aicodepath-docs/inception/reverse-engineering/reverse-engineering-report.md
   ```

## Requirements Analysis (ALWAYS EXECUTE - Adaptive Depth)

**Always executes** but depth varies based on request clarity and complexity:
- **Minimal**: Simple, clear request - just document intent analysis
- **Standard**: Normal complexity - gather functional and non-functional requirements
- **Comprehensive**: Complex, high-risk - detailed requirements with traceability

**Execution**:
1. **MANDATORY**: Log any user input during this phase in audit.md
2. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Requirements Analysis" in_progress
   ```
3. Load all steps from `inception/requirements-analysis.md`
4. Execute requirements analysis:
   - Load reverse engineering artifacts (if brownfield)
   - Analyze user request (intent analysis)
   - Determine requirements depth needed
   - Ask clarifying questions (if needed)
   - Generate requirements document
5. Execute at appropriate depth (minimal/standard/comprehensive)
6. **DB Integration**: Create artifacts for each requirement document
   ```bash
   # For each requirement document created
   node .aicodepath/lib/artifact-writer.js create requirement "<Requirement Title>" inception \
     --file=aicodepath-docs/inception/requirements/<filename>.md
   ```
7. **Wait for Explicit Approval**: Follow approval format - DO NOT PROCEED until user confirms
8. **MANDATORY**: Log user's response in audit.md with complete raw input
9. **DB Integration**: Mark stage complete
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Requirements Analysis" completed
   ```

## User Stories (CONDITIONAL)

**INTELLIGENT ASSESSMENT**: Use multi-factor analysis to determine if user stories add value:

**ALWAYS Execute IF** (High Priority Indicators):
- New user-facing features or functionality
- Changes affecting user workflows or interactions
- Multiple user types or personas involved
- Complex business requirements with acceptance criteria needs
- Cross-functional team collaboration required

**SKIP ONLY IF** (Low Priority - Simple Cases):
- Pure internal refactoring with zero user impact
- Simple bug fixes with clear, isolated scope
- Infrastructure changes with no user-facing effects
- Technical debt cleanup with no functional changes
- Documentation-only updates

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "User Stories" in_progress
   ```
2. **MANDATORY**: Log any user input during this phase in audit.md
3. Load all steps from `inception/user-stories.md`
3. Execute at appropriate depth (minimal/standard/comprehensive)
4. **PART 1 - Planning**: Create story plan with questions, wait for user answers
5. **PART 2 - Generation**: Execute approved plan to generate stories and personas
6. **Wait for Explicit Approval**: DO NOT PROCEED until user confirms
7. **MANDATORY**: Log user's response in audit.md with complete raw input
8. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update inception "User Stories" completed

   # Create artifacts for each generated doc
   node .aicodepath/lib/artifact-writer.js create requirement "User Stories" inception \
     --file=aicodepath-docs/inception/user-stories/user-stories.md
   ```

## Sprint Planning (CONDITIONAL - NEW)

**Execute IF**:
- Multiple user stories identified
- Project spans multiple iterations
- Team velocity tracking needed
- Agile/Scrum methodology requested

**Skip IF**:
- Single story implementation
- No iteration planning needed
- Waterfall approach preferred

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Sprint Planning" in_progress
   ```
2. **MANDATORY**: Log any user input during this phase in audit.md
3. Load all steps from `inception/sprint-planning.md`
3. Execute sprint planning:
   - Define sprint duration and capacity
   - Estimate story points for user stories
   - Prioritize backlog items
   - Plan sprint goals and commitments
   - Generate sprint planning artifacts
4. **Wait for Explicit Approval**: Present sprint plan - DO NOT PROCEED until user confirms
5. **MANDATORY**: Log user's response in audit.md with complete raw input
6. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update inception "Sprint Planning" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create plan "Sprint Plan" inception \
     --file=aicodepath-docs/inception/plans/sprint-plan.md
   ```

## Workflow Planning (ALWAYS EXECUTE)

1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Workflow Planning" in_progress
   ```
2. **MANDATORY**: Log any user input during this phase in audit.md
3. Load all steps from `inception/workflow-planning.md`
3. **MANDATORY**: Load content validation rules from `common/content-validation.md`
4. Load all prior context:
   - Reverse engineering artifacts (if brownfield)
   - Intent analysis
   - Requirements (if executed)
   - User stories (if executed)
   - Sprint planning (if executed)
5. Execute workflow planning:
   - Determine which phases to execute
   - Determine depth level for each phase
   - Create multi-package change sequence (if brownfield)
   - Generate workflow visualization
6. **MANDATORY**: Validate all content before file creation
7. **Wait for Explicit Approval**: Present recommendations - DO NOT PROCEED until user confirms
8. **MANDATORY**: Log user's response in audit.md with complete raw input
9. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update inception "Workflow Planning" completed

   # Create workflow plan artifact
   node .aicodepath/lib/artifact-writer.js create plan "Workflow Plan" inception \
     --file=aicodepath-docs/inception/plans/workflow-plan.md
   ```

## Write Design (ALWAYS EXECUTE — after Application Design)

**Purpose**: Synthesize the brainstorm/application design conversation into a structured design document capturing exploration findings, decision rationale, constraints, and alternatives.

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Write Design" in_progress
   ```
2. Invoke `/aicodepath-write-design` with the topic from the brainstorm session
3. Verify the design document contains all 7 mandatory sections
4. **DB Integration**: Mark stage complete
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Write Design" completed
   ```

---

## Application Design (CONDITIONAL)

**Execute IF**:
- New components or services needed
- Component methods and business rules need definition
- Service layer design required

**Skip IF**:
- Changes within existing component boundaries
- No new components or methods
- Pure implementation changes

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Application Design" in_progress
   ```
2. **MANDATORY**: Log any user input during this phase in audit.md
3. Load all steps from `inception/application-design.md`
3. Load reverse engineering artifacts (if brownfield)
4. Execute at appropriate depth (minimal/standard/comprehensive)
5. **Wait for Explicit Approval**: Present detailed completion message - DO NOT PROCEED until user confirms
6. **MANDATORY**: Log user's response in audit.md with complete raw input
7. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update inception "Application Design" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create design "Application Design" inception \
     --file=aicodepath-docs/inception/application-design/application-design.md
   ```

## Units Generation (CONDITIONAL)

**Execute IF**:
- System needs decomposition into multiple units of work
- Multiple services or modules required
- Complex system requiring structured breakdown

**Skip IF**:
- Single simple unit
- No decomposition needed

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Units Generation" in_progress
   ```
2. **MANDATORY**: Log any user input during this phase in audit.md
3. Load all steps from `inception/units-generation.md`
3. Load reverse engineering artifacts (if brownfield)
4. Execute at appropriate depth
5. **Wait for Explicit Approval**: Present detailed completion message - DO NOT PROCEED until user confirms
6. **MANDATORY**: Log user's response in audit.md with complete raw input
7. **DB Integration**: Mark stage complete and create artifacts
   ```bash
   # Mark complete
   node .aicodepath/lib/kb-writer.js update inception "Units Generation" completed

   # Create artifacts
   node .aicodepath/lib/artifact-writer.js create plan "Units Plan" inception \
     --file=aicodepath-docs/inception/plans/units-plan.md
   ```

## Plan Review (ALWAYS EXECUTE — after Workflow Planning produces a plan)

**Purpose**: Validate the implementation plan before CONSTRUCTION begins using structured multi-lens review.

**Execution**:
1. **DB Integration**: Update workflow state
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Plan Review" in_progress
   ```
2. Invoke `/aicodepath-review plan --depth strict` (all three lenses: Critic, Analyzer, Review)
3. **Gate logic**:
   - If **APPROVED**: proceed to CONSTRUCTION
   - If **REVISE**: address conditions, re-run affected lens
   - If **REJECT**: return to Workflow Planning (`/aicodepath-write-plan`)
4. **DB Integration**: Mark stage complete
   ```bash
   node .aicodepath/lib/kb-writer.js update inception "Plan Review" completed
   ```
