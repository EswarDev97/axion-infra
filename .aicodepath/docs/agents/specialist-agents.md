# Agents — Specialist Agents

Covers: `aicodepath-ml-engineer`, `aicodepath-data-scientist`, `aicodepath-ux-designer`, `aicodepath-ui-designer`, `aicodepath-compliance-auditor`, `aicodepath-cost-optimizer`, `aicodepath-sre-engineer`, `aicodepath-technical-writer`, `aicodepath-communication-coach`, `aicodepath-swarm-lead`, `aicodepath-codebase-pattern-finder`

---

## aicodepath-ml-engineer

**File:** `.aicodepath/agents/aicodepath-ml-engineer.md`
**Description:** Design and implement production ML systems with robust MLOps pipelines, model serving infrastructure, and monitoring.

**Key capabilities:**
- Model training pipeline design
- MLOps (experiment tracking with MLflow/W&B, model registry)
- Model serving (TorchServe, TensorFlow Serving, Triton)
- Feature store design
- A/B testing and model evaluation frameworks
- Data drift and model drift monitoring
- Batch vs real-time inference tradeoffs

---

## aicodepath-data-scientist

**File:** `.aicodepath/agents/aicodepath-data-scientist.md`
**Description:** Design, develop, and evaluate machine learning models with proper feature engineering, validation strategies, and bias considerations.

**Key capabilities:**
- Feature engineering and selection
- Cross-validation strategy design
- Model selection and hyperparameter tuning
- Bias and fairness analysis
- Statistical significance testing
- Data exploration and visualization recommendations
- Experiment documentation

**Difference from ml-engineer:** `aicodepath-data-scientist` focuses on model development and experimentation; `aicodepath-ml-engineer` focuses on production deployment and MLOps.

---

## aicodepath-ux-designer

**File:** `.aicodepath/agents/aicodepath-ux-designer.md`
**Description:** Create user-centered design solutions through research, wireframing, and accessibility-focused responsive interfaces that deliver excellent user experiences.

**Key capabilities:**
- User research methods (interviews, surveys, usability testing)
- Information architecture
- Wireframe and prototype specification
- Accessibility design (WCAG 2.1 AA compliance)
- Responsive design principles
- User journey mapping
- Interaction design patterns

**Deliverables:** `aicodepath-docs/construction/{unit}/web-ux-design/` or `mobile-ux-design/`

---

## aicodepath-ui-designer

**File:** `.aicodepath/agents/aicodepath-ui-designer.md`
**Description:** Create cohesive, accessible visual design systems with reusable components, design tokens, and comprehensive style guidelines that ensure brand consistency and seamless developer handoff.

**Key capabilities:**
- Design token definition (colors, spacing, typography, shadows)
- Component library specification
- Style guide creation
- Design system documentation for developer handoff
- Brand consistency enforcement
- Dark/light theme design

**Difference from ux-designer:** `aicodepath-ui-designer` is visual/implementation focused; `aicodepath-ux-designer` is research/flow focused.

---

## aicodepath-compliance-auditor

**File:** `.aicodepath/agents/aicodepath-compliance-auditor.md`
**Description:** Ensure regulatory compliance, maintain audit trails, and verify adherence to GDPR, SOC 2, HIPAA, and PCI-DSS standards.

**Key capabilities:**
- GDPR compliance (data minimization, consent, right to erasure, DPA)
- SOC 2 Type II controls (security, availability, confidentiality)
- HIPAA safeguards (PHI handling, BAA requirements)
- PCI-DSS requirements (card data handling, tokenization)
- Audit trail design
- Data retention policy implementation
- Privacy impact assessment

---

## aicodepath-cost-optimizer

**File:** `.aicodepath/agents/aicodepath-cost-optimizer.md`
**Description:** Analyze and optimize cloud infrastructure costs while maintaining performance and reliability through FinOps practices.

**Key capabilities:**
- Cloud cost analysis (AWS, GCP, Azure)
- FinOps practices (tagging, showback, chargeback)
- Reserved instance and savings plan analysis
- Right-sizing recommendations
- Spot/preemptible instance strategy
- Data transfer cost optimization
- Storage tier optimization (hot/warm/cold)
- Cost alerting and budget setup

---

## aicodepath-sre-engineer

**File:** `.aicodepath/agents/aicodepath-sre-engineer.md`
**Description:** Ensure system reliability, manage incidents effectively, and balance feature velocity with stability through SLO/SLI frameworks.

**Key capabilities:**
- SLI/SLO/SLA definition and measurement
- Error budget management
- Incident response playbook design
- Runbook creation
- Chaos engineering practices
- Capacity planning
- Alerting strategy (symptom-based vs cause-based)
- On-call rotation design

---

## aicodepath-technical-writer

**File:** `.aicodepath/agents/aicodepath-technical-writer.md`
**Description:** Create clear, comprehensive technical documentation for developers, operators, and end users.

**Key capabilities:**
- API documentation (OpenAPI/Swagger, Postman collections)
- Developer guides and tutorials
- Architecture decision records (ADRs)
- Runbooks and operational guides
- User-facing documentation
- README authoring
- Changelog management

**Invocation triggers:**
- `/aicodepath-readme-crafter` skill invoked
- Documentation files being written

---

## aicodepath-communication-coach

**File:** `.aicodepath/agents/aicodepath-communication-coach.md`
**Description:** Communication Coach — improve technical communication clarity, precision, and impact.

**Key capabilities:**
- Technical writing review for clarity and conciseness
- Presentation structure for technical audiences
- PR description and commit message quality
- Code comment and JSDoc quality
- Documentation readability improvement

---

## aicodepath-swarm-lead

**File:** `.aicodepath/agents/aicodepath-swarm-lead.md`
**Description:** Use when orchestrating parallel implementation across multiple specialist agents — parallel CONSTRUCTION phase, swarm execution, multi-agent task delegation, pipeline coordination, or any plan where tasks have explicit Agent field assignments that must be routed to named specialists.

**Purpose:** Orchestration-only agent — never writes application code. Delegates all implementation to specialist agents via the `Task` tool based on the `Agent` field in the active task file in `aicodepath-docs/task/`.

**Key responsibilities:**
- Read `Agent` field on each task; if set (not `—`), delegate to named agent via Task tool
- Map file ownership boundaries per teammate to prevent merge conflicts
- Track task status in tasks.md: `TODO` → `WIP` → `DONE [hash]`
- Enforce quality gate (DoD command exits 0 + assertion count) before marking DONE
- Identify dependency order — do not start tasks whose `Depends` target is not DONE
- Escalate blocked tasks with `BLOCKED [reason]`
- Disband team when all tasks.md rows reach DONE/BLOCKED

**Orchestration patterns:**

| Pattern | When | Lead Behavior |
|---------|------|---------------|
| Parallel | Independent tasks | Assign all ready units simultaneously |
| Pipeline | Sequential dependencies | Hand off T{N} output to T{N+1} |
| Swarm | >10 tasks | Maintain task pool, rebalance when idle |
| Review | Post-implementation | Research agent reads, implementation agent applies |

**Quality gates (all required for DONE):**
- DoD command exits 0
- No new test failures
- File ownership respected
- Task row updated to `DONE [git-hash]`

**Requires:** `swarm` feature flag enabled (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`)

---

## aicodepath-codebase-pattern-finder

**File:** `.aicodepath/agents/aicodepath-codebase-pattern-finder.md`
**Description:** Codebase Pattern Finder — find similar implementations, usage examples, and existing patterns in the codebase.

**Key capabilities:**
- Finding how specific features are currently implemented
- Discovering test patterns and conventions
- Locating integration patterns between services
- Understanding structural conventions
- Identifying naming patterns

**Output style:** Returns concrete code examples with `file:line` references. Acts as a documentarian, not a critic — describes what exists without judgement.

**Invocation triggers:**
- `inception-skill-suggester.js` when brownfield project detected
- `/aicodepath-codebase-pattern-finder` skill invoked
