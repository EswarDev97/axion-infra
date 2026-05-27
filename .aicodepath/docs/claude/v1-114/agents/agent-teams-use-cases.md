# Claude Code Agent Teams: Use Cases and Prompt Templates

**Source**: https://claudefa.st/blog/guide/agents/agent-teams-use-cases
**Fetched**: 2026-04-18
**Fidelity**: [SUMMARISED BY WEBFETCH — verify against source]

## Developer Use Cases

### 1. Parallel Code Review
- Spawn three specialized reviewers (security, performance, test coverage)
- Use delegate mode so the lead synthesizes without duplicating analysis
- Delivers 2–3× coverage vs single-reviewer passes

### 2. Debugging with Competing Hypotheses
- Five agents investigate different root cause theories
- Direct inter-agent debate fights anchoring bias
- Surviving theory more likely accurate than sequential investigation

### 3. Full-Stack Feature Implementation
- Four teammates: backend, frontend, tests, documentation
- **Explicit file boundaries** prevent merge conflicts
- Directory-level ownership is critical

### 4. Architecture Decision Record
- Three agents advocate competing approaches (PostgreSQL, ClickHouse, MongoDB)
- Challenge-based deliberation beats single-agent analysis
- Lead synthesizes strongest arguments

### 5. Bottleneck Analysis
- Parallel profiling across API responses, DB queries, frontend perf
- Cross-domain communication surfaces indirect connections (missing DB index → slow API)
- Shared task list tracks findings with severity ratings

### 6. Inventory Classification
- Data-parallel work: split 500 items across four teammates (125 each)
- ~4× faster than single-session processing
- Teammates flag edge cases for human review

## Marketing Use Cases

### 7. Campaign Research Sprint
- Competitor analyst + voice-of-customer researcher + positioning stress-tester
- Output feeds directly into others' analysis
- Faster than sequential research reports

### 8. Landing Page Build with Adversarial Review
- Copywriter + CRO specialist + skeptical buyer
- Plan approval required before implementation
- Adversarial review catches holes builder-focused teammates miss

### 9. Ad Creative Exploration
- Four teammates develop competing hook angles with debate structure
- Competitive pressure raises quality floor
- Winning angle survives real challenge

### 10. Content Production Pipeline
- Researcher → Writer → Quality reviewer with task chaining
- Parallel research overlaps sequential quality gates
- Built-in QA prevents incomplete publication

## Progressive Learning Path

- **Week 1**: Parallel code review (low-risk, high-learning)
- **Week 2**: Competing hypotheses debugging
- **Week 3**: Feature implementation with file boundaries

## Key Prompt Guidelines

- Specify roles precisely ("security, performance, test coverage" beats "reviewers")
- Define file boundaries for implementation work
- Include clear success criteria
- Use delegate mode for coordination-heavy tasks
- Employ debate structures rather than consensus-seeking
- Keep team size between **3–5 members**
- Match patterns to task types (data-parallel, functional, evaluative)

## Token Considerations

Multi-agent approaches cost 2–3× more tokens than single sessions but deliver proportionally
better results.
