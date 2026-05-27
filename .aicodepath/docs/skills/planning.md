# Skills — Planning & Design (PRE-FLIGHT / INCEPTION)

---

## /aicodepath-preflight

**When:** Start of every session, or before writing any code.

**What it checks:**
- Required plugins installed (7 plugins + language-specific)
- MCP servers configured and accessible
- Database initialized (42 tables)
- `.claude/settings.json` exists with correct hook paths
- `.claude/skills/` symlinks exist for all 70 skills
- `.claude/agents/` symlinks exist for all 24 agents
- `.env.aicodepath` exists

**HARD-GATE:** If environment is invalid, blocks proceeding to implementation.

**Output:** Pass/fail status per check with remediation instructions.

**Difference from pre-flight-check.js hook:** The hook is non-blocking (informs only). The skill is blocking (gates on result). Use the skill for explicit environment validation.

---

## /aicodepath-requirements

**When:** Starting any new feature or story — transforms vague requests into approved PRDs.

**What it produces:**
- Structured PRD with 90/100 clarity score before design begins
- Acceptance criteria (measurable, testable)
- Out-of-scope declaration (what's explicitly excluded)
- Success metrics
- Technical constraints
- Open questions log

**Clarity scoring (100-point scale):**
- Problem statement (20 pts)
- User personas (15 pts)
- Acceptance criteria (25 pts)
- Success metrics (20 pts)
- Constraints (10 pts)
- Edge cases (10 pts)

**Gate:** PRD must score ≥ 90 before proceeding to brainstorm. Iterates with user until score achieved.

---

## /aicodepath-classify-component

**When:** Automatically invoked at the start of `/aicodepath-brainstorm` and `/aicodepath-write-plan`. Can also be invoked manually.

**What it does:**
1. Classifies the feature/topic into component types: `frontend`, `backend`, `mobile`, `data`, `security`, `devops`, `ml`, `api`, `test`, or `all`
2. Loads matching design-phase guidelines for that component type
3. Returns a validation checklist that must pass before design approval

**Component classification drives:**
- Which guidelines are loaded during GICL validation
- Which agents are suggested for gaps
- Which workflow rules apply

---

## /aicodepath-brainstorm

**When:** Before any new feature, component, API, or significant code change.

**Rigid skill** — follow exactly.

**Process:**
1. Classify component type (`/aicodepath-classify-component`)
2. Present at least 3 design alternatives
3. Evaluate each on: complexity, maintainability, performance, testability, security
4. Recommend one with clear rationale
5. Check against design-phase guidelines for the component type
6. Present to user for approval
7. On approval: write to `aicodepath-docs/adr-log.md`

**HARD-GATE:** No code until design approved.

---

## /aicodepath-write-plan

**When:** After brainstorm design is approved.

**What it produces:**
- Ordered implementation tasks (dependency-aware)
- Each task specifies: failing test to write, code to make it pass
- Time estimate per task
- Risk flags for complex tasks
- Written to the active task file in `aicodepath-docs/task/`

---

## /aicodepath-c4-architecture

**When:** Creating architecture documentation, system context diagrams, container or component diagrams, or deployment views.

**What it produces:** C4 model diagrams in Mermaid format:
- **Level 1:** System Context — how the system fits into the world
- **Level 2:** Container — the high-level technical components
- **Level 3:** Component — the internals of a container
- **Level 4:** Code — class/module level (optional)

**References:** `skills/aicodepath-c4-architecture/references/c4-syntax.md`

---

## /aicodepath-diagrams

**When:** Creating any visual representation of system structure or behavior.

**Diagram types:**
- ER diagrams (entity-relationship)
- Sequence diagrams
- Flow charts
- Component diagrams
- State machine diagrams
- Class diagrams

All output in Mermaid format for version control compatibility.

---

## /aicodepath-mental-model

**When:** Reverse-engineering brownfield codebases, understanding large diffs or PRs, onboarding to unfamiliar code.

**What it does:**
1. Splits changes into logical chunks with dependency ordering
2. Provides ordered explanations so changes can be understood incrementally
3. Identifies "gotchas" and non-obvious details
4. Does NOT judge — describes what exists objectively

**Output:** Ordered mental model with chunk 1 (foundation) → chunk N (surface behavior). Each chunk includes file references with line numbers.

**Triggers from hooks:** `inception-skill-suggester.js` suggests this when git diff/log operations detected.

---

## /aicodepath-visual-memory

**When:** Generating or updating visual diagrams for the codebase.

**Diagram types:** ER, Class, Sequence, C4, Journey, Flowchart

**Two generator paths:**
1. Python generators (85-95% accuracy) — requires `pip install -r .aicodepath/generators/requirements.txt`
2. JavaScript fallbacks (60-70% accuracy) — always available

**Storage:** `aicodepath-docs/memory/` — indexed by `index.json` for relevance-based loading

**Auto-loaded:** Relevant diagrams are loaded at session start via `visual-memory-loader.js` hook.

---

## /aicodepath-codebase-pattern-finder

**When:** Analyzing brownfield codebases, finding how features are currently implemented, discovering conventions.

**What it finds:**
- Similar implementations for the feature you're building
- How tests are structured in this codebase
- Integration patterns between services
- Naming and structural conventions

**Output:** Concrete code examples with `file:line` references. Acts as documentarian — describes, doesn't judge.

---

## /aicodepath-research-mode

**When:** PRE-FLIGHT (unfamiliar tech stack), OPERATIONS debugging (complex root cause).

**What it does:**
1. Identifies knowledge gaps before drawing conclusions
2. Uses Context7 (library docs), WebSearch (broader research), and code reading
3. Maintains evidence log — cites sources for each conclusion
4. Requires multiple confirming sources before confident recommendations
5. Flags uncertainty explicitly

**Integration:** Triggers Context7 MCP (`resolve-library-id` → `query-docs`) to verify library APIs before using them.

---

## /aicodepath-codebase-onboarding

**When:** First contact with an unfamiliar or brownfield codebase — before brainstorm or RE on a new project.

**What it does:**
1. Stack detection (runtime, language, frameworks, build system from manifest files)
2. Entry point identification (main files, bootstrapping flow)
3. Key flow tracing (1-2 primary user flows end-to-end)
4. Convention cataloging (naming, file structure, test patterns)
5. Gotcha inventory (known pitfalls, anti-patterns, undocumented assumptions)

**Output file:** `aicodepath-docs/onboarding-guide.md` — persistent across sessions.

**Why persistent:** Reading this file in future sessions restores codebase context without re-exploring from scratch.

---

## /aicodepath-reverse-engineer

**When:** Brownfield INCEPTION phase — structured reverse engineering of any existing codebase.

**HARD-GATE:** All 11 documents must be produced. If a concern does not apply (e.g., no UI), write "N/A — no UI layer detected" rather than omitting it.

**Three routes:**
- **greenfield** — tech-agnostic docs for teams planning a migration or rebuild
- **brownfield-shallow** — tech-prescriptive quick survey (hours, not days)
- **brownfield-deep** — full 11-document analysis for AI-assisted feature work

**The 11 documents produced:**
1. Functional specification
2. Data architecture
3. Integration points
4. Technical debt inventory
5. Security posture
6. Performance baseline
7. Test coverage map
8. Deployment and ops
9. Module dependency map
10. UI/UX surface inventory
11. Recommended RE summary

**Output:** `aicodepath-docs/inception/reverse-engineering/` directory.

---

## /aicodepath-write-design

**When:** After brainstorm approval — synthesize the design conversation into a structured document before writing the implementation plan.

**Position in chain:**
```
/aicodepath-brainstorm → /aicodepath-write-design → /aicodepath-write-plan
```

**What it captures:**
- Exploration findings (approaches considered and why they were rejected)
- Decision rationale (the "why" behind the chosen design)
- Constraints (technical, organizational, performance)
- Open questions and assumptions

**Output:** `aicodepath-docs/adr-log.md` section with structured design document.

**Why it exists:** Without this step, only the final spec survives. The rationale and rejected alternatives are lost, causing future sessions to re-debate already-settled decisions.

---

## /aicodepath-specify

**When:** After brainstorm or reverse-engineer — generate structured feature specifications for use by `/aicodepath-gap-analysis`, `/aicodepath-write-plan`, and `/aicodepath-acceptance`.

**Output:** `.specify/` directory with:
- Individual feature spec files (one per feature)
- Status markers: `COMPLETE`, `PARTIAL`, `STUB`, `MISSING`
- `CHANGELOG.md` tracking spec evolution
- `CONSTITUTION.md` defining acceptance criteria format

**Three source types:**
- Design docs (from brainstorm)
- RE docs (from reverse-engineer)
- User stories / requirements

**Status markers:** Never downgrade a `COMPLETE` status without evidence. Contradictions between sources become `[NEEDS CLARIFICATION]` markers.

---

## /aicodepath-discover

**When:** Discovering the full ecosystem of related repositories, services, and dependencies from a single starting point.

**10 signal types scanned:**
1. Workspace configs (package.json workspaces, Turborepo, etc.)
2. Docker Compose service names
3. Import references to `@org/` scoped packages
4. OpenAPI / gRPC service clients
5. CI/CD pipeline job names
6. Environment variable references to service URLs
7. Database cross-schema references
8. Message queue topic names
9. Shared library references
10. GitHub org repository listing

**Confidence scoring:** Each signal assigned LOW/MEDIUM/HIGH confidence. Output groups discoveries by confidence tier.

**Output:** `aicodepath-docs/discovery-report.md` with ecosystem map.
