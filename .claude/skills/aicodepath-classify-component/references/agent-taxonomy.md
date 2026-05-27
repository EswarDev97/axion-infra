# Agent Taxonomy

Maps component types to specialist agents with phase labels. Used by `aicodepath-classify-component` Step 5 to generate phase-aware agent recommendations.

**Maintenance rule**: Update this file whenever a new agent is added to `.aicodepath/agents/`. See CLAUDE.md Rule #6.

| Component Type | Agent | Phase | When to Invoke |
|---|---|---|---|
| database | aicodepath-database-architect | design | Schema and migration decisions |
| database | aicodepath-orm-selector | design | ORM/query builder selection, migration framework choice, monorepo migration schema design |
| database | aicodepath-performance-engineer | construction | Query optimization, indexing |
| api | aicodepath-api-designer | design | API contract and versioning |
| api | aicodepath-backend-architect | construction | Service boundary implementation |
| service | aicodepath-architect | design | Component boundaries, system design |
| service | aicodepath-refactoring-expert | construction | Complexity reduction, tech debt |
| service | aicodepath-code-reviewer | construction | Code review before commit |
| service | aicodepath-error-recovery | construction | Repeated or complex errors |
| security | aicodepath-security-engineer | design, plan | Threat modeling, auth design |
| security | aicodepath-compliance-auditor | design, plan | GDPR, SOC2, HIPAA, PCI-DSS |
| test | aicodepath-test-engineer | plan, construction | TDD strategy, coverage |
| test | aicodepath-qa | plan, construction | Quality gates, coverage enforcement |
| devops | aicodepath-devops-architect | design | Pipeline and container design |
| devops | aicodepath-ci-fixer | construction | CI/CD pipeline failures |
| devops | aicodepath-ci-fixer | construction | Local build errors and compilation failures |
| devops | aicodepath-sre-engineer | construction | Reliability and SLO definition |
| frontend | aicodepath-frontend-architect | design, construction | Component hierarchy, state |
| frontend | aicodepath-ui-designer | design | Design system, visual tokens |
| mobile | aicodepath-mobile-architect | design, construction | Platform architecture |
| mobile | aicodepath-ux-designer | design | User journeys, accessibility |
| observability | aicodepath-sre-engineer | design | Logging, metrics, alerting |
| ai | aicodepath-ml-engineer | design, construction | Model serving, MLOps |
| ai | aicodepath-data-scientist | design | Feature engineering, evaluation |
| ai | aicodepath-error-recovery | construction | PyTorch runtime errors, tensor shapes, CUDA issues |
| all | aicodepath-code-simplifier | construction | After code is written or modified — clarity pass, nesting reduction, naming improvement, project-standard enforcement |
| all | aicodepath-plan-critic | plan | Plan quality gate — clarity, feasibility, value |
| all | aicodepath-plan-analyst | plan | Effort estimation, risk, task sequencing |
| all | aicodepath-codebase-pattern-finder | design | Brownfield pattern discovery |
| all | aicodepath-technical-writer | construction | Documentation, ADRs, runbooks |
| all | aicodepath-technical-writer | construction | Library doc lookup via Context7, auto codemap generation |
| all | aicodepath-communication-coach | construction | PR descriptions, commit messages |
| all | aicodepath-swarm-lead | construction | Parallel/swarm work coordination |
| test | aicodepath-qa | construction | E2E browser testing with Playwright, flaky test quarantine |
| service | aicodepath-refactoring-expert | construction | Dead code detection with knip/vulture/deadcode, SAFE/CAREFUL/RISKY risk categorization |
| finops | aicodepath-cost-optimizer | design, construction | Cloud cost analysis, RI/SP optimization, right-sizing |
| graph_engine | aicodepath-performance-engineer | construction | When modifying BFS traversal, query optimization, or graph caching logic |
| graph_engine | aicodepath-backend-architect | construction | When modifying BFS traversal, query optimization, or graph caching logic |
| mcp_graph_server | aicodepath-api-designer | construction | When adding/modifying MCP tools, changing tool signatures or response shapes |
| mcp_graph_server | aicodepath-backend-architect | construction | When adding/modifying MCP tools, changing tool signatures or response shapes |
| graph_visualizer | aicodepath-frontend-architect | construction | When modifying D3.js visualization, HTML generation, or scope filtering |
| graph_visualizer | aicodepath-ui-designer | construction | When modifying D3.js visualization, HTML generation, or scope filtering |
| service | aicodepath-silent-failure-hunter | construction | Error observability audit — silent failures, swallowed catch blocks, fallback masking, missing logging |
| test | aicodepath-test-completeness-analyzer | construction | Test completeness audit — behavioral coverage gaps, missing edge cases, 1-10 criticality rating |
| graph-git-hook | aicodepath-sre-engineer | construction | When modifying git trigger patterns, hook performance, or fail-open behavior |
| graph-git-hook | aicodepath-devops-architect | construction | When modifying git trigger patterns, hook performance, or fail-open behavior |
| frontend | aicodepath-ui-designer | design | Fluent 2 design system: brand tokens, BrandVariants, FluentProvider theme setup, Griffel makeResetStyles/makeStyles, elevation ramp, Wait UX thresholds |
| frontend | aicodepath-frontend-architect | design, construction | Fluent UI v9 5-file component pattern, slot APIs (slot.always/slot.optional), assertSlots, JSX pragma, Field ARIA auto-wiring, usePositioning |
| frontend | skill:/aicodepath-web-design-intelligence | design, construction | Invoke skill when building, styling, or designing any web UI — landing pages, dashboards, SaaS UI, React components, or any frontend visual work; covers 84 styles, 160 palettes, motion patterns, domain→style mapping |
| frontend | skill:/aicodepath-fluent-design | design, construction | Invoke skill (not agent) when implementing any Fluent UI 2 component — covers 5-file pattern, Griffel, tokens, HARD-GATEs, troubleshooting, motion, WCAG |
| mobile | aicodepath-mobile-architect | design, construction | Fluent native mobile: fluentui-apple (iOS 12 components), fluentui-android (Android 5 components), platform gap, touch targets (44pt/48dp), capitalization rules |
| mobile | skill:/aicodepath-fluent-design | design, construction | Invoke skill when using fluentui-apple (iOS) or fluentui-android — platform component inventory, touch targets, capitalization rules |
| all | aicodepath-writing-auditor | construction | After generating documentation, READMEs, or prose — audits for AI writing patterns |
| all | aicodepath-typescript-expert | construction | When writing TypeScript code — enforces strict typing and idiomatic TS 5.x patterns |
| all | aicodepath-python-expert | construction | When writing Python code — enforces type hints, PEP compliance, and idiomatic Python 3.12+ patterns |
| frontend | aicodepath-react-expert | construction | When writing React components — enforces React 18+ patterns including Server Components and concurrent features |
| frontend | aicodepath-nextjs-expert | construction | When building Next.js applications — enforces App Router patterns and Next.js 14+ best practices |
| all | aicodepath-golang-expert | construction | When writing Go code — enforces idiomatic Go patterns, error handling, and concurrency best practices |
| ai | aicodepath-llm-architect | design, construction | When designing production LLM systems — RAG, fine-tuning, model serving, multi-model orchestration |
| devops | aicodepath-chaos-engineer | construction | When testing system resilience — controlled failure experiments, game days, blast radius management |
| all | aicodepath-idea-validator | design | When pressure-testing product ideas — competitive teardown, demand verification, go/no-go decisions |
| devops | aicodepath-incident-responder | construction | When responding to active incidents — classification, evidence preservation, post-mortem facilitation |
| all | aicodepath-legacy-modernizer | design, construction | When modernizing legacy systems — strangler fig, characterization tests, incremental migration |
| all | aicodepath-rust-expert | construction | When writing Rust code — enforces ownership patterns, lifetime annotations, and clippy::pedantic compliance |
| all | aicodepath-java-expert | construction | When writing Java code — enforces Java 21+ patterns, Spring Boot 3+ conventions, virtual threads |
| frontend | aicodepath-vue-expert | construction | When writing Vue 3 code — enforces Composition API, Pinia state, and Nuxt 3 conventions |
| all | aicodepath-django-expert | construction | When writing Django code — enforces ORM optimization, DRF patterns, security best practices |
| all | aicodepath-fastapi-expert | construction | When building FastAPI services — enforces async patterns, Pydantic v2, dependency injection |
| devops | aicodepath-kubernetes-expert | construction | When writing K8s manifests or Helm charts — RBAC, network policies, Pod Security Standards |
| devops | aicodepath-terraform-expert | construction | When writing Terraform IaC — module reusability, state management, security scanning |
| ai | aicodepath-data-engineer | design, construction | When designing data pipelines, ETL/ELT, data lake/warehouse, stream processing |
| all | skill:/aicodepath-dx-optimizer | construction | When optimizing developer experience — builds, HMR, tests, IDE, monorepo tooling |
| frontend | aicodepath-angular-expert | construction | When writing Angular code — Angular 15+ standalone components, signals, OnPush, NgRx |
| all | aicodepath-javascript-expert | construction | When writing modern JavaScript ES2024+ — async/await, ES modules, no var |
| all | aicodepath-php-expert | construction | When writing PHP code — PHP 8.3+ strict types, PSR-12, PHPStan level 9 |
| mobile | aicodepath-swift-expert | construction | When writing Swift code — Swift 5.9+ async/await, actors, SwiftUI |
| all | aicodepath-kotlin-expert | construction | When writing Kotlin code — Kotlin 2.x coroutines, sealed classes, Flow, KMP |
| all | aicodepath-csharp-expert | construction | When writing C# code — C# 12+ records, primary constructors, nullable types |
| all | aicodepath-cpp-expert | construction | When writing modern C++ — C++20/23 concepts, ranges, smart pointers, RAII |
| database | aicodepath-sql-expert | construction | When writing complex SQL — query optimization, window functions, CTEs, indexes |
| all | aicodepath-dotnet-core-expert | construction | When building .NET 8+ apps — minimal APIs, EF Core, AOT compilation |
| all | aicodepath-elixir-expert | construction | When writing Elixir code — OTP patterns, GenServer, Phoenix LiveView |
| mobile | aicodepath-flutter-expert | construction | When building Flutter apps — null safety, state management, 60fps |
| all | aicodepath-laravel-expert | construction | When writing Laravel code — Eloquent eager loading, queues, FormRequests |
| all | aicodepath-rails-expert | construction | When writing Rails code — Rails 8+ Hotwire, Active Record, service objects |
| all | aicodepath-spring-boot-expert | construction | When building Spring Boot 3+ — constructor injection, WebFlux, Resilience4j |
| all | aicodepath-symfony-expert | construction | When writing Symfony code — Doctrine, Messenger, autowiring, API Platform |
| mobile | aicodepath-expo-rn-expert | construction | When building Expo React Native — Expo Router, EAS Build, TypeScript strict |
| all | aicodepath-dotnet-framework-expert | construction | When maintaining .NET Framework 4.8 legacy — modernization with stability |
| all | aicodepath-powershell-expert | construction | When writing PowerShell — advanced functions, Pester tests, ShouldProcess |
| devops | aicodepath-azure-infra-expert | construction | When designing Azure infrastructure — Bicep, Entra ID, landing zones |
| devops | aicodepath-cloud-architect | design | When designing multi-cloud architecture — Well-Architected Framework, DR planning |
| devops | aicodepath-network-engineer | design, construction | When designing network infrastructure — VPC/subnet, micro-segmentation, zero-trust |
| devops | aicodepath-platform-engineer | design, construction | When building internal developer platforms — Backstage, golden paths, GitOps |
| devops | aicodepath-windows-infra-expert | construction | When managing Windows Server — AD, DNS, DHCP, GPO with safe automation |
| devops | aicodepath-deployment-engineer | design, construction | When designing CI/CD pipelines — blue-green, canary, GitOps, DORA metrics |
| ai | aicodepath-ai-engineer | design, construction | When integrating AI into apps — model selection, fallbacks, ethical guardrails |
| ai | aicodepath-nlp-engineer | construction | When building NLP systems — NER, classification, transformer fine-tuning |
| database | aicodepath-postgres-expert | construction | When working with PostgreSQL — JSONB, partitioning, replication, pgvector |
| ai | aicodepath-rl-engineer | construction | When designing reinforcement learning — environment design, PPO/SAC, sim-to-real |
| all | aicodepath-accessibility-tester | construction | When auditing accessibility — WCAG 2.1 AA, screen readers, keyboard navigation |
| all | aicodepath-error-detective | construction | When investigating production errors — cascade analysis, root cause, prevention |
| all | aicodepath-build-engineer | construction | When optimizing build systems — incremental compilation, caching, bundle size |
| all | aicodepath-cli-developer | construction | When building CLI tools — argument parsing, completions, < 50ms startup |
| all | aicodepath-slack-expert | construction | When building Slack apps — Bolt SDK, Block Kit, OAuth 2.0 V2 |
| all | aicodepath-tooling-engineer | construction | When building developer tools — generators, AST transforms, plugin systems |
| all | aicodepath-blockchain-developer | construction | When building smart contracts — Solidity, gas optimization, security audits |
| all | aicodepath-game-developer | construction | When building games — ECS, 60fps, multiplayer networking, performance |
| all | aicodepath-fintech-engineer | design, construction | When building financial systems — double-entry ledger, idempotency, PCI DSS |
| all | aicodepath-payment-integration | construction | When integrating payment gateways — Stripe/PayPal, webhooks, 3D Secure |
| all | aicodepath-iot-engineer | design, construction | When building IoT systems — MQTT, OTA updates, device management, edge |
| all | aicodepath-embedded-systems | construction | When developing firmware — RTOS, ISR, DMA, power optimization |
| all | aicodepath-quant-analyst | design | When developing quant trading strategies — backtesting, risk metrics, walk-forward |
| all | aicodepath-seo-specialist | construction | When optimizing for organic search — technical SEO, structured data, CWV |
| all | aicodepath-risk-manager | design | When assessing enterprise risk — financial, operational, regulatory mitigation |
| devops | aicodepath-m365-admin | construction | When administering Microsoft 365 — Exchange, Teams, SharePoint, Graph API |
| all | aicodepath-business-analyst | design | When analyzing business processes — requirements, traceability, ROI |
| all | aicodepath-customer-success-manager | design | When designing customer success programs — health scoring, churn prevention |
| all | aicodepath-legal-advisor | design | When drafting contracts and reviewing compliance — GDPR, IP, plain language |
| all | aicodepath-license-engineer | design, construction | When designing licensing systems — OSS compliance, SBOM, copyleft tracking |
| all | aicodepath-content-marketer | construction | When creating content marketing — SEO, editorial calendar, conversion tracking |
| all | aicodepath-sales-engineer | design | When supporting sales — POCs, demos, RFP responses, technical objections |
| all | aicodepath-scrum-master | design | When facilitating agile teams — ceremonies, retrospectives, impediment removal |
| all | aicodepath-wordpress-master | construction | When building WordPress sites — themes, plugins, Gutenberg, security hardening |
| all | aicodepath-competitive-analyst | design | When analyzing competitors — SWOT, feature matrices, positioning maps |
| all | aicodepath-market-researcher | design | When sizing markets — TAM/SAM/SOM, segmentation, persona research |
| all | aicodepath-trend-analyst | design | When identifying trends — weak signals, adoption curves, scenario planning |
| all | aicodepath-search-specialist | design | When finding hard-to-locate information — advanced operators, multiple sources |
| all | aicodepath-data-researcher | design | When discovering datasets — quality assessment, EDA, statistical analysis |
| devops | aicodepath-it-ops-orchestrator | construction | When orchestrating cross-domain IT ops — Windows, Azure, M365, PowerShell routing |
| framework_asset | aicodepath-skill-creator | design | Creating a new SKILL.md from scratch — intent capture, draft, eval loop, description optimization |
| framework_asset | aicodepath-skill-audit | construction | Auditing skill quality — 8-dimension scoring (triggering, instructions, output, tools, gates, testing, wiring, maintainability) |
| framework_asset | aicodepath-skill-improver | construction | Improving existing skill to Grade A — autonomous hill-climbing loop, targets score ≥ 90 |
| framework_asset | aicodepath-skill-testing | plan, construction | Writing behavioral tests for a skill — Red-Green-Refactor, test scaffolding, coverage gates |
| framework_asset | aicodepath-agent-creator | design | Creating a new agent .md file — interview, spec validation, registration, wiring |
| framework_asset | aicodepath-agent-audit | construction | Auditing agent quality — 6-dimension scoring (description, domain, standards, tools, output, wiring) |
| framework_asset | aicodepath-hook-creator | design | Creating a new hook .js file — event selection, protocol compliance, persistent test generation |
| framework_asset | aicodepath-hook-audit | construction | Auditing hook quality — 6-dimension scoring (purpose, implementation, safety, testing, registration, docs) |
| framework_asset | aicodepath-harness-eval | construction | Validating primitive compliance for any framework asset — 12 agentic harness primitives |
