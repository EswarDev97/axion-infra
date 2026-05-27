# Skills — Domain-Specific & Utilities

---

## Domain Skills

### /aicodepath-prompt-engg

**When:** Writing, debugging, or improving any LLM provider prompt template — wrong field values, missing keys, inconsistent scores across providers, schema non-compliance, or template variables producing unexpected results. The root cause is always in the instruction text, even when described as a bug or data error.

**Trigger symptoms:** LLM output missing required JSON fields, scores not varying with input, formula/calculation errors in generated output, provider-to-provider inconsistency, confidence scores hardcoded, output contains extra keys, boolean flags set incorrectly.

**What it covers:**
- **8-step workflow:** Domain context injection → identify target → load prompt → select framework → analyse quality → apply framework + clarification gates → validate → write + deploy
- **Symptom-based framework selection:** TIDD-EC (structural gaps), RISEN (multi-step sequences), CO-STAR (persona), Self-Refine (iterative), CAI Critique-Revise (schema compliance), Chain of Thought (reasoning chains), RPEF (cross-provider consistency)
- **5 universal clarification gates** — confirms exact schema, required vs optional fields, computed field formulas, boolean conditions, template variable semantics before any edit
- **HARD-GATE validation** — 8-item checklist blocks file write until all pass; prevents malformed prompts reaching production
- **Troubleshooting table** — 7 common failure patterns with root cause and concrete fix (score stuck at same value, extra keys persist, boolean stuck, provider drift, etc.)

**Framework references:** `references/frameworks/` — 7 framework files loaded on demand by symptom match

**Domain example:** `references/examples/vehicle-valuation/` — complete bundle (output schema, attribute risk table, TIDD-EC template) for vehicle valuation prompts

**Grade:** A — 109/120 audit, 5/5 behavioral, composite 129/140

---

### /sql-query-optimization

**When:** Slow queries, N+1 problems, missing indexes, sequential scans, OFFSET pagination issues, temp table spills, inefficient JOINs in PostgreSQL/MySQL.

**What it covers:**
- `EXPLAIN` / `EXPLAIN ANALYZE` interpretation
- Index strategy (B-tree, partial, composite, covering)
- N+1 query elimination (eager loading, DataLoader)
- Cursor-based pagination (vs OFFSET)
- Query rewriting for performance
- Connection pool configuration
- PostgreSQL/MySQL-specific optimizations

---

### /celery-worker

**When:** Configuring Celery workers, setting up task queues and routing, configuring retry strategies with backoff, optimizing worker concurrency, debugging stuck tasks or queue backlogs.

**Covers:** Redis/RabbitMQ brokers, task routing, priority queues, retry with exponential backoff, worker concurrency (prefork vs gevent vs eventlet), result backends, monitoring with Flower.

---

### /messaging

**When:** Designing or implementing message queues, event-driven architecture, or async communication between services.

**Covers:**
- **RabbitMQ:** exchanges (direct/fanout/topic), binding, dead letter queues, message acknowledgment
- **Apache Kafka:** topics, partitions, consumer groups, offset management, event streaming
- **Redis Pub/Sub:** publish/subscribe patterns, Redis Streams
- **AWS SQS:** standard vs FIFO queues, visibility timeout, DLQ configuration
- Choosing between brokers (throughput, ordering, retention, at-least-once vs exactly-once)

---

### /aicodepath-solid-principles

**When:** Asked about SOLID principles, "single responsibility", "open/closed", "Liskov substitution", "interface segregation", "dependency inversion", or reviewing class/module design for violations.

**Covers each principle with:**
- Definition
- Violation patterns (what bad code looks like)
- Refactoring strategies
- Code examples

---

### /aicodepath-git-monorepo-config

**When:** Setting up Git for a monorepo with multiple services and environments (dev/staging/prod).

**What it sets up:**
- Branch strategy (trunk-based or git flow)
- Branch protection rules
- Git hooks (pre-commit, pre-push, commit-msg)
- Service change detection (`scripts/detect-services.sh`)
- Service-specific build triggers
- Team collaboration workflows

**Templates:** `skills/aicodepath-git-monorepo-config/templates/`

---

### /aicodepath-gcp-monorepo-deploy

**When:** Deploying monorepo services to GCP.

**What it covers:**
- Cloud Build configuration per service
- Cloud Run deployment
- Secret Manager integration
- Environment-specific configs (dev/staging/prod)
- Monitoring and alerting setup
- Rollback procedures

**Templates:** `skills/aicodepath-gcp-monorepo-deploy/templates/`

---

### /aicodepath-dependency-updater

**When:** During MAINTENANCE when dependencies are outdated, have vulnerabilities, or need auditing.

**What it does:**
- Audits PATCH/MINOR versions for safety
- Applies PATCH/MINOR updates automatically
- Prompts explicitly for MAJOR version updates
- Runs tests after each update to catch regressions
- Generates update report

**Supports:** npm, pip, go.mod, Cargo.toml, Gemfile (7 package managers)

---

## Infrastructure Skills

### /aicodepath-git-monorepo-config

**When:** Setting up Git for a monorepo with multiple environments, configuring branch strategy, adding branch protection, installing Git hooks, or generating team workflow documentation.

**Branch strategy (develop → staging → main):**

| Branch | Infrastructure | Cost | aicodepath-docs |
|--------|---------------|------|-----------------|
| `develop` | Local machine | Free | Committed — team sees AIDLC progress |
| `staging` | Docker Compose | ~$0-20/mo | BLOCKED — never promoted |
| `main` | GCP production | Pay-per-use | BLOCKED — never promoted |

**`develop` is the default branch** — all PRs target it. No direct commits to any environment branch.

**aicodepath-docs isolation:**
- `aicodepath-docs/` is tracked on `develop` (not in `.gitignore`)
- Blocked from staging/main by: (1) pre-push hook, (2) CI workflow, (3) PR promotion guide
- When creating promote/develop-to-staging branch, strip aicodepath-docs/ from the diff

**Key capabilities:**
1. Branch creation with `develop` as default
2. `aicodepath-docs/` isolation (committed on develop, blocked from staging/main)
3. Git hooks: pre-push (aicodepath-docs guard + prod confirmation), pre-commit (security checks), commit-msg (conventional commits)
4. Branch protection (PR required on all env branches; 1 approval for develop, 2 for staging/main)
5. CI workflow to block aicodepath-docs/ in PRs targeting staging/main
6. Docker Compose staging config (named network, named volumes, all services)
7. Service discovery → `services.yaml`
8. Team workflow docs → `docs/GIT_WORKFLOW.md`

---

### /aicodepath-gcp-monorepo-deploy

**When:** Setting up GCP deployment for a monorepo, deploying to staging or production, configuring cost controls, setting up scheduled start/stop, or managing Cloud Run/Cloud SQL infrastructure.

**Scope:** staging (via Cloud Build) and main/production (GCP) branches only. develop runs locally.

**Naming convention:** All resources prefixed `{project_name}-{env}-*` for consistent identification:

| Resource | Example name |
|----------|-------------|
| VPC Network | `myapp-prod-vpc` |
| Service Account | `myapp-prod-sa` |
| Artifact Registry | `myapp-prod-registry` |
| Cloud SQL | `myapp-prod-db` |
| Cloud Run Service | `myapp-api-prod` |
| Scheduler Job | `myapp-stg-stop` |

**Cost-saving features:**
- Scheduled Cloud Run scale-to-zero for staging (nights + weekends)
- Scheduled Cloud SQL stop for staging at night
- GCE VM start/stop scripts and resource policy scheduling
- `scripts/env-control.sh` for manual start/stop
- Cost estimate table per environment

**Named data layer (persistent across deploys):**
- Cloud SQL instances created with `--deletion-protection` on prod
- Named GCS buckets per purpose (assets, uploads, backups)
- Secrets in Secret Manager (never in env vars or substitution variables)
- Named Artifact Registry per environment (never shared across envs)

**Named networking:**
- Custom VPC per environment (never uses `default` network)
- Subnet, firewall rules, and Serverless VPC connector all named consistently
- Cloud Run connected to VPC via named connector

**Key capabilities:**
1. Named VPC network per environment
2. Dedicated least-privilege service account per environment + separate Cloud Build SA
3. Named Cloud SQL with deletion protection + backups
4. Named GCS buckets with lifecycle policies
5. Artifact Registry per environment
6. Cloud Build configs with change detection (builds only affected services)
7. Scheduled start/stop (Cloud Scheduler) for staging Cloud Run + Cloud SQL
8. VM start/stop resource policy + manual `scripts/vm-control.sh`
9. Deployment, rollback, status, and env-control scripts
10. Monitoring dashboard + alerting (error rate, latency, SQL availability)

---

## Framework Management Skills

### /aicodepath-init

**When:** Setting up AICodePath for the first time, when hooks stop firing, when skills are missing, after git clone on a new machine.

**What it does:**
```
1. Symlink skills   → .claude/skills/<name> → .aicodepath/skills/<name>/
2. Symlink agents   → .claude/agents/<name> → .aicodepath/agents/<name>.md
3. Generate settings → .claude/settings.json (with absolute hook paths)
4. Generate MCP config → .mcp.json (from config.json MCP entries)
5. Create env file  → .env.aicodepath (with documented variables)
6. Init DB          → runs migrations, creates 42 tables
```

**When to re-run:** After changing paths, after git clone, when hooks stop firing.

---

### /aicodepath-diagnostics

**When:** Hooks not firing, skills not loading, GICL score always 0, DB errors, something broken.

**What it checks:**
1. `.claude/settings.json` exists and has absolute paths
2. All 22 hook files exist and are executable
3. All 71 skill symlinks exist in `.claude/skills/`
4. All 24 agent symlinks exist in `.claude/agents/`
5. DB exists and has expected tables
6. MCP servers configured in `.mcp.json`
7. Node.js version compatibility

**Output:** Pass/fail per check + specific remediation commands.

---

### /aicodepath-help

**When:** Confused about the workflow, hook silently skipping, guideline false positive, unsure which skill applies.

**Provides:**
- Context-aware skill recommendations
- Hook debugging guidance
- Guideline violation interpretation
- Phase navigation help

---

### /aicodepath-statusline

**When:** Setting up the terminal statusline, statusline showing wrong values, adding custom fields.

**What it configures:**
- Phase, stage, and unit in terminal statusline
- Context window usage percentage
- GICL score display
- Custom field support

**Important:** Statusline commands in `~/.claude/settings.json` run with `sh` (POSIX), not bash. Must use POSIX-compatible syntax.

---

### /aicodepath-naming-analyzer

**When:** Variable, function, or class names are unclear, inconsistent, or don't follow conventions.

**What it does:**
- Scans specified files for naming issues
- Identifies inconsistencies against project conventions
- Proposes specific renames with rationale
- Groups findings by severity (breaking vs stylistic)

---

### /aicodepath-reducing-entropy

**Manual-only skill** — never suggested automatically. Only activate when explicitly requested.

**What it does:**
- Measures total codebase size (LOC, file count)
- Identifies dead code, redundant abstractions, over-engineered patterns
- Proposes specific deletions/simplifications
- Success measured by final code reduction, not effort

---

### /aicodepath-readme-crafter

**When:** Creating or rewriting a README.

**Adapts to audience:**
| Type | Template |
|------|---------|
| Open Source | `templates/oss.md` |
| Internal/Team | `templates/internal.md` |
| Personal project | `templates/personal.md` |
| Config/dotfiles | `templates/xdg-config.md` |

**References:** Standard README spec, art-of-readme, make-a-readme guides.

---

### /aicodepath-command-creator

**When:** Creating a new AICodePath slash command from a documented workflow.

**What it produces:**
- SKILL.md with proper frontmatter
- Trigger conditions (description field)
- Step-by-step instructions
- Tool allowlist
- Argument hints

---

### /aicodepath-skill-creator

**When:** Creating new skills, improving existing skills, running evals to test skill performance.

**Includes sub-agents:**
- `analyzer.md` — skill gap analysis
- `comparator.md` — before/after skill comparison
- `grader.md` — skill quality scoring

**Scripts:** `scripts/run_eval.py`, `scripts/run_loop.py`, `scripts/generate_report.py`

---

### /aicodepath-skill-audit

**When:** Reviewing, auditing, or improving a SKILL.md quality.

**8-dimension scoring (120 points total):**
1. Trigger precision (15 pts)
2. Instruction clarity (20 pts)
3. Output specification (15 pts)
4. Tool allowlist accuracy (10 pts)
5. Argument hints (5 pts)
6. HARD-GATE usage (10 pts)
7. Integration with workflow chain (15 pts)
8. Description field format (10 pts) — must be "Use when..."

**Output:** Letter grade (A/B/C/D/F), knowledge delta ratio, ranked improvement actions.

---

### /aicodepath-skill-testing

**When:** Creating or improving a skill — applies TDD methodology to skill development.

**Red-Green-Refactor for skills:**
- Red: Write a failing skill eval (scenario where current skill fails)
- Green: Update skill instructions to pass the eval
- Refactor: Simplify instructions without losing precision

---

### /using-aicodepath

**Status:** Auto-injected at session start via `session-start-hook.js`. Not user-invocable directly.

**What it contains:** The complete AIDLC workflow, all skill activation rules, HARD-GATE enforcement, skill directory, rationalization red flags, and MCP integration patterns.

**This is the meta-skill** — all other skills and workflow rules flow from it.

---

## Authoring Lifecycle (Agents & Hooks)

These skills provide a quality ratchet for the AICodePath framework's own agents and hooks — analogous to the skill lifecycle pipeline (skill-creator → skill-audit → skill-testing → skill-improver).

### /aicodepath-agent-creator

**When:** Creating a new agent or improving an existing agent. Triggers: "create agent", "new agent", "improve agent", "add agent", "agent quality".

**Modes:**
- **Create mode (6 steps):** Fetch live spec → interview (domain, tools, model, advanced features) → research existing agents → draft agent.md → register (DOMAIN_MAPPING, VIOLATION_TYPE_MAPPING, agent-taxonomy.md) → finalize with init + symlink
- **Improve mode (hill-climbing):** Baseline audit → user config (exit strategy, validation mode, web search, model) → pressure scenario generation → state init → evaluate/judge/mutate loop → finalize best

**References (in `skills/aicodepath-agent-creator/references/`):**
- `agent-template.md` — all 12 frontmatter fields from live spec, 5-section body template
- `audit-rubric.md` — 6-dimension scoring rubric (shared with agent-audit)
- `registration-checklist.md` — 3-step registration with code snippets
- `mutation-strategies.md` — dimension-specific rewrite strategies
- `cost-model.md` — time/cost per hill-climbing cycle

**HARD-GATEs:** No agent file without completing interview; no skip registry; no skip taxonomy update; no mutation without validating frontmatter against live spec.

---

### /aicodepath-agent-audit

**When:** Evaluating agent quality, reviewing agents before commit, or batch-auditing all agents. Triggers: "audit agent", "review agent", "agent quality", "score agent".

**Modes:** Single agent or batch (all agents in `.aicodepath/agents/`)

**6 Scoring Dimensions (100 pts total):**

| Dim | Name | Max |
|-----|------|-----|
| D1 | Spec Compliance | 20 |
| D2 | Domain Expertise | 20 |
| D3 | Tool Appropriateness | 15 |
| D4 | Integration Completeness | 15 |
| D5 | Description Trigger Accuracy | 15 |
| D6 | Prompting Quality | 15 |

**Grading:** A=90+ / B=80-89 / C=70-79 / D=60-69 / F=<60

**Output:**
- Single: markdown report with dimension table, critical issues, top 3 improvements
- Batch: summary table, grade distribution, systemic issues (appear in 3+ agents)

---

### /aicodepath-hook-creator

**When:** Creating a new hook or improving an existing hook. Triggers: "create hook", "new hook", "improve hook", "add hook", "hook quality".

**Modes:**
- **Create mode (7 steps):** Fetch live spec → interview (event type, handler, matcher, blocking behavior) → research existing hooks → generate hook code → test + generate persistent test file → register in hooks.json → finalize with init
- **Improve mode (hill-climbing):** Baseline audit → user config → functional test scenario generation → state init → evaluate/judge/mutate loop → finalize best

**Persistent test generation (Step 5b):** Generates `.aicodepath/__tests__/hook-<name>.test.js` with minimum 4 test cases: happy path, block/warn path, malformed input (fail-open), hook-specific edge case.

**Code mutation constraints:** Preserve `main()` + `execute()` structure and fail-open catch blocks. Only mutate `execute()` body and helper functions.

**References (in `skills/aicodepath-hook-creator/references/`):**
- `hook-template.js` — canonical annotated structure (execute + main + fail-open)
- `audit-rubric.md` — 6-dimension scoring rubric (shared with hook-audit)
- `event-type-reference.md` — all 20+ event types with I/O schemas
- `registration-checklist.md` — 4 handler types, ordering rules
- `mutation-strategies.md` — dimension-specific strategies + code mutation constraints
- `test-template.js` — canonical test file with runHook() helper
- `cost-model.md` — dry-run vs live test time/cost per cycle

**HARD-GATEs:** No hook code without interview; no `console.log` (use logger); no hardcoded paths (use pathResolver); no `appendToSystemPrompt`; no skip fail-open pattern; no registration without testing; no skip persistent test generation.

---

### /aicodepath-hook-audit

**When:** Evaluating hook quality, reviewing hooks before commit, or batch-auditing all hooks. Triggers: "audit hook", "review hook", "hook quality", "score hook".

**Modes:** Single hook or batch (all hooks in `.aicodepath/hooks/`)

**6 Scoring Dimensions (100 pts total):**

| Dim | Name | Max | Validation method |
|-----|------|-----|-------------------|
| D1 | Protocol Compliance | 20 | Functional: pipe sample inputs, verify exit codes |
| D2 | Error Resilience | 20 | Functional: malformed input → exit 0 |
| D3 | Library Compliance | 15 | Static: grep for console.log, hardcoded paths |
| D4 | Output Field Validity | 15 | Functional: verify no appendToSystemPrompt |
| D5 | Registration & Integration | 15 | Read hooks.json + settings.json |
| D6 | Code Quality | 15 | Static: async/await, side effects |

**Grading:** A=90+ / B=80-89 / C=70-79 / D=60-69 / F=<60

---

## Quality Assurance Skills

### /aicodepath-vapt

**When:** Auditing software for VAPT compliance (Vulnerability Assessment and Penetration Testing).

**Covers:** OWASP Top 10, PCI DSS v4.0, HIPAA, GDPR, ISO 27001, NIST 800-53, SOC 2 Type II.

**Output:** Prioritized vulnerability report with CVSS scores, compliance gap analysis, and remediation checklist.

---

### /aicodepath-web-quality

**When:** Auditing or improving web quality across performance, Core Web Vitals, accessibility, SEO, security, or best practices.

**Dimensions:**
- **Performance:** LCP, INP, CLS, TTFB, bundle size
- **Accessibility:** WCAG 2.2, ARIA, keyboard navigation, color contrast
- **SEO:** meta tags, structured data, sitemaps, crawlability
- **Security/Best Practices:** HTTPS, CSP headers, deprecated APIs

---

### /aicodepath-acceptance

**When:** Verifying sprint completion, "is everything done", "run acceptance criteria", before any checkpoint at sprint close.

**What it does:** Reads the active task file in `aicodepath-docs/task/`, checks all DoD items, runs verification commands, and produces a pass/fail acceptance report.

---

## Mobile & Platform Skills

### /aicodepath-android

**When:** Building Android applications with Kotlin 2.x and Jetpack Compose.

**Architecture:** Follows Google's official guidance (NowInAndroid patterns) — MVVM + Repository + UseCases.

**Covers:** Compose UI, navigation, ViewModel, Hilt DI, Room, DataStore, coroutines + Flow, testing (Robolectric, Espresso), ProGuard configuration.

---

## ML / Model Training Skills

### /aicodepath-model-training

**When:** User wants a hands-off autonomous experiment loop on ML training code — agent proposes changes, runs training, keeps improvements, reverts regressions, cycling indefinitely with no manual steps. Triggers: "autoresearch", "karpathy-style", "run experiments automatically", "autonomous training loop", "auto-keep improvements".

**Three-phase structure:**
- **Intake:** 9-step interview (task type, dataset, metric, noise threshold, time budget, hardware detection, scaffold generation, baseline run)
- **Loop:** Modify train.py → timeout-wrapped run → metric comparison → KEEP or DISCARD (git reset) → repeat
- **Report:** Results summary, inference test, GCP cleanup

**Key design decisions:**
- `prepare.py` (immutable, chmod 444) / `train.py` (agent-modifiable) split
- `run_model.pt` temp checkpoint → promoted to `.autoresearch/best_model.pt` on KEEP only
- `importlib.util.find_spec()` import guard prevents dependency crashes
- Noise thresholds by task type: 0.001 (loss/val_bpb), 0.002 (accuracy), 0.005 (F1), 0.01 (RMSE)
- Session recovery handles committed-but-not-run edge case

**Reference files:**
- `scaffold-contract.md` — prepare.py/train.py interface contract
- `strategy-skeleton.md` — task-specific strategy.md template
- `analysis-template.md` — Phase 3 report template
- `gcp-vm-setup.md` — GPU VM creation guide (T4/L4/A100/H100)

**Eval results:** with_skill 100% (15/15), without_skill 23% (3/15), +77pp delta

---

## Product Management Skills

### /aicodepath-pm

**When:** Any product management work — discovery, strategy, execution, market research, data analytics, go-to-market, marketing/growth.

**Triggers:** "PRD", "user story", "OKR", "roadmap", "sprint planning", "persona", "GTM", "SWOT", "competitor analysis", "A/B test", "product strategy".

**Output:** Structured artifacts per PM discipline — PRDs, OKR trees, sprint plans, persona maps, GTM plans, SWOT matrices.

---

## AI / LLM Skills

### /aicodepath-mcp-builder

**When:** Building a new MCP server or improving an existing one for any external service or API.

**Modes:**
- **`new`** — start at PRE-FLIGHT: fetch live MCP spec, interview (service, auth, tools needed), scaffold, implement, add evaluation
- **`improve`** — jump directly to hill-climbing: run `scripts/evaluation.py` → establish baseline accuracy → iterate

**Hill-climbing loop:**
```
Run evaluation → score accuracy % → if improved: keep; else: discard → mutate → repeat
```

**Quality metric:** Accuracy is measured by how well an LLM can answer realistic questions using only the server's tools — not by API coverage alone.

**Supports:** TypeScript (fastmcp / @modelcontextprotocol/sdk) and Python (FastMCP 3.x).

**References:** Live spec from `https://modelcontextprotocol.io/docs/` via WebFetch.

---

### /aicodepath-cost-aware-llm

**When:** Managing LLM API costs, selecting models by task complexity, enforcing token budgets, or configuring prompt caching.

**Model routing by complexity:**

| Complexity | Recommended model tier | Use cases |
|-----------|----------------------|-----------|
| Trivial | Small/fast (Haiku-class) | Classification, extraction, simple Q&A |
| Simple | Mid-tier (Sonnet-class) | Code generation, summarization |
| Complex | Large (Opus-class) | Architecture, multi-hop reasoning |

**Budget enforcement:** Integrates with `lib/pricing-calculator.js` — `predictBudget()`, `checkBudget()`, `classifyTaskComplexity()`.

**Prompt caching:** Identifies repeated large context blocks (system prompts, long documents) and marks them for caching to reduce cost on repeated invocations.

**Output:** Cost audit report with per-call estimates, routing recommendations, and caching opportunities.

---

### /aicodepath-pytorch-patterns

**Status:** Reference-only skill (`user-invocable: false`) — loaded by `aicodepath-model-training` and the `aicodepath-data-scientist` agent.

**Pattern categories:**
- **Device-agnostic code** — never hardcode `.cuda()`; use `torch.device(...)` variable everywhere
- **Reproducibility** — `torch.manual_seed()`, `torch.backends.cudnn.deterministic = True`
- **Mixed precision** — `torch.autocast` + `GradScaler` for AMP training
- **Checkpointing** — save/restore `model.state_dict()` + `optimizer.state_dict()` together
- **Data loading** — `DataLoader` with `num_workers`, `pin_memory`, `persistent_workers`
- **Gradient management** — `optimizer.zero_grad(set_to_none=True)`, gradient clipping

---

## Framework Visualization Skills

### /aicodepath-interconnection-diagram

**When:** Visualizing the full AICodePath component graph, exploring relationships between hooks/skills/agents/guidelines, or onboarding to the framework.

**What it generates:** A single-file, zero-dependency interactive HTML diagram at `aicodepath-docs/memory/interconnection/aicodepath-interconnection-diagram.html`.

**Node types visualized:**
- Skills (93)
- Agents (24)
- Hooks (22+)
- Guidelines (16+ JSON files)
- Rule groups

**Edge discovery:** Deep introspection — reads hook scripts and skill body text to find actual cross-references (e.g., hook calls skill, skill delegates to agent, agent enforces guideline).

**Arguments:**
```
/aicodepath-interconnection-diagram --output custom-path.html
/aicodepath-interconnection-diagram --title "My Project Components"
```
