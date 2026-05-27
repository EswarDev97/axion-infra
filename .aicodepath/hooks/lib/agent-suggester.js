#!/usr/bin/env node
/**
 * Agent Suggester
 *
 * Suggests appropriate agents based on validation violations,
 * incomplete requirements, and contextual analysis.
 *
 * @module hooks/lib/agent-suggester
 */

const path = require('path');
const AgentRegistry = require('../../lib/agent-registry');
const AgentLoader = require('../../lib/agent-loader');

// Module-level singleton cache for agent registry
let _registryCache = null;

/**
 * Domain to agent mapping
 * Maps requirement/violation keywords to appropriate agent roles
 */
const DOMAIN_MAPPING = {
  // Authentication & Security
  'authentication': ['security-engineer', 'backend-architect'],
  'authorization': ['security-engineer', 'backend-architect'],
  'security': ['security-engineer'],
  'jwt': ['security-engineer', 'backend-architect'],
  'token': ['security-engineer', 'backend-architect'],
  'password': ['security-engineer'],
  'encryption': ['security-engineer'],
  'csrf': ['security-engineer'],
  'cors': ['security-engineer'],
  'xss': ['security-engineer'],
  'sanitize': ['security-engineer'],
  'threat': ['security-engineer'],
  'vulnerability': ['security-engineer'],

  // Database & Storage
  'database': ['database-architect', 'backend-architect'],
  'migration': ['database-architect', 'orm-selector'],
  'migration-framework': ['orm-selector'],
  'query': ['database-architect'],
  'query-builder': ['orm-selector'],
  'sql': ['database-architect'],
  'nosql': ['database-architect'],
  'schema': ['database-architect'],
  'index': ['database-architect'],
  'cache': ['performance-engineer', 'backend-architect'],
  'redis': ['performance-engineer', 'database-architect'],
  'orm': ['database-architect', 'orm-selector'],
  'orm-selection': ['orm-selector'],
  'data-access-layer': ['orm-selector'],
  'monorepo-migration': ['orm-selector'],
  'transaction': ['database-architect'],

  // API Design & Contracts
  'api': ['api-designer', 'backend-architect'],
  'endpoint': ['api-designer', 'backend-architect'],
  'rest': ['api-designer', 'backend-architect'],
  'graphql': ['api-designer', 'backend-architect'],
  'openapi': ['api-designer'],
  'swagger': ['api-designer'],
  'contract': ['api-designer'],
  'versioning': ['api-designer'],
  'webhook': ['api-designer', 'backend-architect'],
  'validation': ['code-reviewer', 'backend-architect'],
  'middleware': ['backend-architect'],
  'routing': ['backend-architect'],

  // Testing & Quality
  'test': ['test-engineer', 'qa'],
  'unittest': ['test-engineer'],
  'integration': ['test-engineer', 'qa'],
  'e2e': ['test-engineer', 'qa'],
  'mock': ['test-engineer'],
  'coverage': ['test-engineer', 'qa'],
  'assertion': ['test-engineer'],
  'spec': ['test-engineer', 'qa'],
  'fixture': ['test-engineer'],

  // Performance
  'performance': ['performance-engineer'],
  'optimization': ['performance-engineer', 'refactoring-expert'],
  'async': ['performance-engineer', 'backend-architect'],
  'concurrent': ['performance-engineer'],
  'scalability': ['performance-engineer', 'architect'],
  'bottleneck': ['performance-engineer'],
  'profiling': ['performance-engineer'],
  'latency': ['performance-engineer', 'sre-engineer'],
  'throughput': ['performance-engineer', 'sre-engineer'],

  // Code Quality
  'refactor': ['refactoring-expert', 'code-reviewer'],
  'duplication': ['refactoring-expert'],
  'complexity': ['refactoring-expert', 'code-reviewer'],
  'cleanup': ['refactoring-expert'],
  'smell': ['refactoring-expert', 'code-reviewer'],
  'technical-debt': ['refactoring-expert'],
  'simplify': ['code-simplifier', 'refactoring-expert'],
  'readability': ['code-simplifier', 'code-reviewer'],
  'clarity': ['code-simplifier'],
  'nesting': ['code-simplifier', 'refactoring-expert'],
  'maintainability': ['code-simplifier', 'refactoring-expert'],

  // DevOps & Infrastructure
  'deployment': ['devops-architect'],
  'docker': ['devops-architect'],
  'kubernetes': ['devops-architect'],
  'ci': ['devops-architect'],
  'cd': ['devops-architect'],
  'pipeline': ['devops-architect'],
  'infrastructure': ['devops-architect', 'architect'],
  'monitoring': ['devops-architect', 'sre-engineer'],
  'logging': ['devops-architect', 'backend-architect'],
  'terraform': ['devops-architect'],
  'helm': ['devops-architect'],
  'ansible': ['devops-architect'],

  // SRE & Reliability
  'slo': ['sre-engineer'],
  'sli': ['sre-engineer'],
  'reliability': ['sre-engineer'],
  'incident': ['sre-engineer', 'incident-responder'],
  'uptime': ['sre-engineer'],
  'error-budget': ['sre-engineer'],
  'runbook': ['sre-engineer', 'technical-writer'],
  'postmortem': ['sre-engineer', 'incident-responder'],
  'alerting': ['sre-engineer', 'devops-architect'],
  'on-call': ['sre-engineer'],

  // Cloud Cost & FinOps
  'cost': ['cost-optimizer'],
  'billing': ['cost-optimizer'],
  'finops': ['cost-optimizer'],
  'rightsizing': ['cost-optimizer'],
  'reserved-instance': ['cost-optimizer'],
  'spot-instance': ['cost-optimizer'],
  'resource-waste': ['cost-optimizer'],
  'budget': ['cost-optimizer'],

  // Data Science & ML
  'dataset': ['data-scientist'],
  'feature': ['data-scientist', 'ml-engineer'],
  'model': ['data-scientist', 'ml-engineer'],
  'training': ['ml-engineer', 'data-scientist'],
  'inference': ['ml-engineer'],
  'mlops': ['ml-engineer'],
  'jupyter': ['data-scientist'],
  'pandas': ['data-scientist'],
  'sklearn': ['data-scientist'],
  'pytorch': ['ml-engineer', 'data-scientist'],
  'tensorflow': ['ml-engineer', 'data-scientist'],
  'embedding': ['ml-engineer', 'data-scientist'],
  'vector': ['ml-engineer', 'database-architect'],
  'bias': ['data-scientist'],
  'evaluation': ['data-scientist'],

  // Compliance & Regulatory
  'gdpr': ['compliance-auditor'],
  'hipaa': ['compliance-auditor'],
  'soc2': ['compliance-auditor'],
  'pci': ['compliance-auditor'],
  'audit': ['compliance-auditor'],
  'regulatory': ['compliance-auditor'],
  'compliance': ['compliance-auditor'],
  'privacy': ['compliance-auditor', 'security-engineer'],
  'data-retention': ['compliance-auditor'],

  // Documentation
  'documentation': ['technical-writer'],
  'comment': ['technical-writer', 'code-reviewer'],
  'readme': ['technical-writer'],
  'guide': ['technical-writer'],
  'changelog': ['technical-writer'],
  'adr': ['technical-writer', 'architect'],

  // Communication
  'pull-request': ['communication-coach'],
  'commit': ['communication-coach'],
  'standup': ['communication-coach'],
  'stakeholder': ['communication-coach'],
  'handoff': ['communication-coach'],
  'announcement': ['communication-coach'],

  // Swarm Orchestration
  'swarm': ['swarm-lead'],
  'parallel': ['swarm-lead', 'architect'],
  'multi-agent': ['swarm-lead'],
  'orchestrat': ['swarm-lead', 'architect'],
  'delegate': ['swarm-lead'],
  'agent-team': ['swarm-lead'],
  'tasks.md': ['swarm-lead'],

  // Plan Review & Analysis
  'plan-review': ['plan-critic'],
  'critique-plan': ['plan-critic'],
  'review-plan': ['plan-critic', 'plan-analyst'],
  'plan-quality': ['plan-critic'],
  'plan-ready': ['plan-critic'],
  'effort-estimate': ['plan-analyst'],
  'plan-analysis': ['plan-analyst'],
  'task-sequencing': ['plan-analyst'],
  'wave-planning': ['plan-analyst'],
  'swarm-mode': ['plan-analyst', 'swarm-lead'],

  // Error Recovery
  'repeated-error': ['error-recovery'],
  'same-error': ['error-recovery'],
  'gicl-regression': ['error-recovery'],
  'keeps-failing': ['error-recovery'],
  'semantic-error': ['error-recovery'],
  'root-cause': ['error-recovery'],

  // CI Fixing
  'ci-failure': ['ci-fixer', 'devops-architect'],
  'pipeline-red': ['ci-fixer'],
  'github-actions': ['ci-fixer', 'devops-architect'],
  'fix-ci': ['ci-fixer'],
  'build-failure': ['ci-fixer'],
  'test-failure-ci': ['ci-fixer'],

  // Codebase Analysis
  'pattern': ['codebase-pattern-finder', 'architect', 'refactoring-expert'],
  'brownfield': ['codebase-pattern-finder'],
  'legacy': ['codebase-pattern-finder', 'refactoring-expert'],
  'reverse-engineer': ['codebase-pattern-finder'],
  'convention': ['codebase-pattern-finder', 'code-reviewer'],

  // Architecture
  'architecture': ['architect', 'backend-architect'],
  'design': ['architect'],
  'structure': ['architect', 'refactoring-expert'],
  'boundary': ['architect'],
  'service-mesh': ['architect', 'devops-architect'],

  // Frontend & UI
  'component': ['frontend-architect', 'ui-designer'],
  'react': ['frontend-architect'],
  'vue': ['frontend-architect', 'vue-expert'],
  'angular': ['frontend-architect', 'angular-expert'],
  'svelte': ['frontend-architect'],
  'css': ['frontend-architect', 'ui-designer'],
  'style': ['ui-designer', 'frontend-architect'],
  'layout': ['ui-designer', 'ux-designer'],
  'responsive': ['frontend-architect', 'ui-designer'],
  'accessibility': ['ux-designer', 'frontend-architect'],
  'a11y': ['ux-designer', 'frontend-architect'],
  'animation': ['ui-designer', 'frontend-architect'],
  'theme': ['ui-designer', 'frontend-architect'],
  'state': ['frontend-architect'],
  'redux': ['frontend-architect'],
  'dom': ['frontend-architect'],
  'render': ['frontend-architect', 'performance-engineer'],
  'webpack': ['frontend-architect', 'devops-architect'],
  'vite': ['frontend-architect', 'devops-architect'],
  'bundler': ['frontend-architect', 'devops-architect'],
  'design-token': ['ui-designer'],
  'design-system': ['ui-designer', 'frontend-architect'],

  // Mobile
  'mobile': ['mobile-architect'],
  'ios': ['mobile-architect'],
  'android': ['mobile-architect'],
  'flutter': ['mobile-architect', 'flutter-expert'],
  'swift': ['mobile-architect', 'swift-expert'],
  'kotlin': ['mobile-architect', 'kotlin-expert'],
  'offline': ['mobile-architect'],
  'gesture': ['mobile-architect', 'ux-designer'],
  'deeplink': ['mobile-architect'],
  'push-notification': ['mobile-architect'],

  // UX
  'usability': ['ux-designer'],
  'wireframe': ['ux-designer'],
  'navigation': ['ux-designer', 'frontend-architect'],
  'form': ['ux-designer', 'frontend-architect'],
  'modal': ['ux-designer', 'ui-designer'],
  'user-journey': ['ux-designer'],
  'persona': ['ux-designer'],
  "golang": ["golang-expert"],
  "goroutine": ["golang-expert"],
  "go-module": ["golang-expert"],
  "go-concurrency": ["golang-expert"],
  "business-analysis": ["business-analyst"],
  "requirements-gathering": ["business-analyst"],
  "process-mapping": ["business-analyst"],
  "stakeholder-analysis": ["business-analyst"],
  "game-development": ["game-developer"],
  "unity": ["game-developer"],
  "unreal": ["game-developer"],
  "game-engine": ["game-developer"],
  "outage": ["incident-responder"],
  "service-down": ["incident-responder"],
  "breach-detected": ["incident-responder"],
  "war-room": ["incident-responder"],
  "python": ["python-expert"],
  "pep8": ["python-expert"],
  "pyproject": ["python-expert"],
  "type-hints": ["python-expert"],
  "react": ["react-expert"],
  "jsx": ["react-expert"],
  "react-hook": ["react-expert"],
  "react-component": ["react-expert"],
  "typescript": ["typescript-expert"],
  "tsconfig": ["typescript-expert"],
  "type-annotation": ["typescript-expert"],
  "strict-mode": ["typescript-expert"],
  "rust": ["rust-expert"],
  "cargo": ["rust-expert"],
  "ownership": ["rust-expert"],
  "borrow-checker": ["rust-expert"],
  "java": ["java-expert"],
  "spring": ["java-expert"],
  "maven": ["java-expert"],
  "gradle": ["java-expert"],
  "jvm": ["java-expert"],
  "springboot": ["java-expert"],
  "ng-signals": ["angular-expert"],
  "angular-standalone": ["angular-expert"],
  "rxjs": ["angular-expert"],
  "coroutine": ["kotlin-expert"],
  "kmp": ["kotlin-expert"],
  "kotlin-multiplatform": ["kotlin-expert"],
  "jetpack-compose": ["kotlin-expert"],
  "flow-kotlin": ["kotlin-expert"],
  "swiftui": ["swift-expert"],
  "xcode": ["swift-expert"],
  "swift-package": ["swift-expert"],
  "swift-concurrency": ["swift-expert"],
  "swiftdata": ["swift-expert"],
  "docker-compose": ["devops-architect"],
  "argocd": ["devops-architect"],
  "terraform-module": ["devops-architect"],
  "micro-frontend": ["frontend-architect"],
  "module-federation": ["frontend-architect"],
  "web-vitals": ["frontend-architect"],
  "hydration": ["frontend-architect"],
  "server-components": ["frontend-architect"],
  "zustand": ["frontend-architect"],
  "swr": ["frontend-architect"],
  "vuejs": ["vue-expert"],
  "nuxt": ["vue-expert"],
  "pinia": ["vue-expert"],
  "composition-api": ["vue-expert"],
  "vue-router": ["vue-expert"],
  "vue-sfc": ["vue-expert"],
  "elixir": ["elixir-expert"],
  "otp": ["elixir-expert"],
  "genserver": ["elixir-expert"],
  "phoenix-framework": ["elixir-expert"],
  "ecto": ["elixir-expert"],
  "phoenix-liveview": ["elixir-expert"],
  "php": ["php-expert"],
  "phpstan": ["php-expert"],
  "psr-12": ["php-expert"],
  "php-composer": ["php-expert"],
  "php-fibers": ["php-expert"],
  "php-strict": ["php-expert"],
  "csharp": ["csharp-expert"],
  "dotnet": ["csharp-expert", "dotnet-core-expert"],
  "asp-net-core": ["csharp-expert"],
  "entity-framework": ["csharp-expert"],
  "blazor": ["csharp-expert"],
  "nuget": ["csharp-expert"],
  "nextjs": ["nextjs-expert"],
  "next-js": ["nextjs-expert"],
  "app-router": ["nextjs-expert"],
  "next-server-actions": ["nextjs-expert"],
  "next-config": ["nextjs-expert"],
  "next-image": ["nextjs-expert"],
  "laravel": ["laravel-expert"],
  "eloquent": ["laravel-expert"],
  "artisan": ["laravel-expert"],
  "livewire-laravel": ["laravel-expert"],
  "filament": ["laravel-expert"],
  "laravel-horizon": ["laravel-expert"],
  "rails": ["rails-expert"],
  "ruby-on-rails": ["rails-expert"],
  "activerecord": ["rails-expert"],
  "hotwire": ["rails-expert"],
  "turbo-rails": ["rails-expert"],
  "kamal": ["rails-expert"],
  "spring-boot": ["spring-boot-expert"],
  "springboot": ["spring-boot-expert"],
  "spring-security": ["spring-boot-expert"],
  "spring-data": ["spring-boot-expert"],
  "webflux-spring": ["spring-boot-expert"],
  "testcontainers": ["spring-boot-expert"],
  "django": ["django-expert"],
  "django-rest-framework": ["django-expert"],
  "drf-django": ["django-expert"],
  "orm-django": ["django-expert"],
  "django-signals": ["django-expert"],
  "django-middleware": ["django-expert"],
  "fastapi": ["fastapi-expert"],
  "pydantic": ["fastapi-expert"],
  "pydantic-v2": ["fastapi-expert"],
  "async-python": ["fastapi-expert"],
  "uvicorn": ["fastapi-expert"],
  "starlette": ["fastapi-expert"],
  "minimal-api": ["dotnet-core-expert"],
  "efcore": ["dotnet-core-expert"],
  "dotnet-aspire": ["dotnet-core-expert"],
  "aot-dotnet": ["dotnet-core-expert"],
  "dotnet-hosted-service": ["dotnet-core-expert"],
  "webapplicationfactory": ["dotnet-core-expert"],
  "dart": ["flutter-expert"],
  "riverpod": ["flutter-expert"],
  "flutter-bloc": ["flutter-expert"],
  "pubspec": ["flutter-expert"],
  "flutter-widgets": ["flutter-expert"],
  "flutter-isolates": ["flutter-expert"],
  "javascript": ["javascript-expert"],
  "es2024": ["javascript-expert"],
  "nodejs": ["javascript-expert"],
  "esmodules": ["javascript-expert"],
  "bun-runtime": ["javascript-expert"],
  "vitest-js": ["javascript-expert"],
  "expo": ["expo-rn-expert"],
  "expo-router": ["expo-rn-expert"],
  "eas-build": ["expo-rn-expert"],
  "react-native": ["expo-rn-expert"],
  "reanimated": ["expo-rn-expert"],
  "flashlist": ["expo-rn-expert"],
  "dotnet-framework": ["dotnet-framework-expert"],
  "wcf": ["dotnet-framework-expert"],
  "webforms": ["dotnet-framework-expert"],
  "aspnet-mvc5": ["dotnet-framework-expert"],
  "ef6": ["dotnet-framework-expert"],
  "legacy-dotnet": ["dotnet-framework-expert"],
  "cpp": ["cpp-expert"],
  "cmake": ["cpp-expert"],
  "cppcore": ["cpp-expert"],
  "raii-cpp": ["cpp-expert"],
  "cpp-concepts": ["cpp-expert"],
  "clang-tidy": ["cpp-expert"],
  "sql": ["sql-expert"],
  "window-functions": ["sql-expert"],
  "cte-sql": ["sql-expert"],
  "keyset-pagination": ["sql-expert"],
  "execution-plan": ["sql-expert"],
  "ansi-sql": ["sql-expert"],
  "kubernetes": ["kubernetes-expert"],
  "k8s": ["kubernetes-expert"],
  "helm": ["kubernetes-expert"],
  "kubectl": ["kubernetes-expert"],
  "pod-security": ["kubernetes-expert"],
  "gitops": ["kubernetes-expert"],
  "terraform": ["terraform-expert"],
  "iac": ["terraform-expert"],
  "hcl": ["terraform-expert"],
  "terragrunt": ["terraform-expert"],
  "tfsec": ["terraform-expert"],
  "infracost": ["terraform-expert"],
  "symfony": ["symfony-expert"],
  "doctrine": ["symfony-expert"],
  "api-platform": ["symfony-expert"],
  "symfony-messenger": ["symfony-expert"],
  "symfony-voter": ["symfony-expert"],
  "twig-symfony": ["symfony-expert"],
  "postgres": ["postgres-expert"],
  "postgresql": ["postgres-expert"],
  "jsonb": ["postgres-expert"],
  "pg-extension": ["postgres-expert"],
  "timescaledb": ["postgres-expert"],
  "pgvector": ["postgres-expert"],
  "performance-engineering": ["performance-engineer"],
  "profiling": ["performance-engineer"],
  "n-plus-one": ["performance-engineer"],
  "caching-strategy": ["performance-engineer"],
  "memory-leak": ["performance-engineer"],
  "load-testing": ["performance-engineer"],
  "tdd": ["test-engineer"],
  "test-strategy": ["test-engineer"],
  "coverage-threshold": ["test-engineer"],
  "test-data-factory": ["test-engineer"],
  "mutation-testing": ["test-engineer"],
  "stryker": ["test-engineer"],
  "sre": ["sre-engineer"],
  "slo": ["sre-engineer"],
  "sli": ["sre-engineer"],
  "error-budget": ["sre-engineer"],
  "on-call": ["sre-engineer"],
  "reliability-engineering": ["sre-engineer"],
  "code-review": ["code-reviewer"],
  "pr-review": ["code-reviewer"],
  "bug-detection": ["code-reviewer"],
  "security-review": ["code-reviewer"],
  "review-checklist": ["code-reviewer"],
  "code-smells": ["code-reviewer"],
  "refactoring": ["refactoring-expert"],
  "cyclomatic-complexity": ["refactoring-expert"],
  "god-class": ["refactoring-expert"],
  "tech-debt": ["refactoring-expert"],
  "dead-code": ["refactoring-expert"],
  "code-smell-fix": ["refactoring-expert"],
  "legacy-migration": ["legacy-modernizer"],
  "strangler-fig": ["legacy-modernizer"],
  "characterization-tests": ["legacy-modernizer"],
  "legacy-rewrite": ["legacy-modernizer"],
  "incremental-migration": ["legacy-modernizer"],
  "modernization": ["legacy-modernizer"],
  "swarm-orchestration": ["swarm-lead"],
  "parallel-agents": ["swarm-lead"],
  "multi-agent": ["swarm-lead"],
  "agent-delegation": ["swarm-lead"],
  "swarm-execution": ["swarm-lead"],
  "agent-swarm": ["swarm-lead"],
  "api-design": ["api-designer"],
  "openapi": ["api-designer"],
  "rest-api": ["api-designer"],
  "graphql-api": ["api-designer"],
  "api-versioning": ["api-designer"],
  "api-contract": ["api-designer"],
  "system-architecture": ["architect"],
  "adr": ["architect"],
  "c4-diagram": ["architect"],
  "monolith-vs-microservices": ["architect"],
  "architecture-decision": ["architect"],
  "component-boundaries": ["architect"],
  "backend-architecture": ["backend-architect"],
  "service-layer": ["backend-architect"],
  "repository-pattern": ["backend-architect"],
  "cqrs": ["backend-architect"],
  "event-sourcing": ["backend-architect"],
  "service-decomposition": ["backend-architect"],
  "chaos-engineering": ["chaos-engineer"],
  "fault-injection": ["chaos-engineer"],
  "resilience-testing": ["chaos-engineer"],
  "game-day": ["chaos-engineer"],
  "blast-radius": ["chaos-engineer"],
  "failure-experiment": ["chaos-engineer"],
  "ci-cd": ["ci-fixer"],
  "github-actions": ["ci-fixer"],
  "pipeline-failure": ["ci-fixer"],
  "build-fix": ["ci-fixer"],
  "ci-repair": ["ci-fixer"],
  "compilation-error": ["ci-fixer"],
  "code-simplification": ["code-simplifier"],
  "nesting-reduction": ["code-simplifier"],
  "readability": ["code-simplifier"],
  "code-clarity": ["code-simplifier"],
  "coding-standards-apply": ["code-simplifier"],
  "simplify-code": ["code-simplifier"],
  "data-pipeline": ["data-engineer"],
  "etl": ["data-engineer"],
  "airflow": ["data-engineer"],
  "dbt": ["data-engineer"],
  "spark": ["data-engineer"],
  "data-warehouse": ["data-engineer"],
  "gdpr": ["compliance-auditor"],
  "soc2": ["compliance-auditor"],
  "hipaa": ["compliance-auditor"],
  "pci-dss": ["compliance-auditor"],
  "compliance-audit": ["compliance-auditor"],
  "data-retention": ["compliance-auditor"],

  // C14 — data-scientist
  "exploratory-data-analysis": ["data-scientist"],
  "eda": ["data-scientist"],
  "feature-engineering": ["data-scientist"],
  "statistical-analysis": ["data-scientist"],
  "model-selection": ["data-scientist"],
  "bias-fairness": ["data-scientist"],

  // C14 — ml-engineer
  "model-serving": ["ml-engineer"],
  "feature-store": ["ml-engineer"],
  "drift-monitoring": ["ml-engineer"],
  "ml-pipeline": ["ml-engineer"],
  "model-registry": ["ml-engineer"],
  "canary-ml": ["ml-engineer"],

  // C14 — llm-architect
  "rag-pipeline": ["llm-architect"],
  "llm-serving": ["llm-architect"],
  "vector-store": ["llm-architect"],
  "embedding-strategy": ["llm-architect"],
  "fine-tune-model": ["llm-architect"],
  "quantization": ["llm-architect"],

  // C14 — mobile-architect
  "offline-first": ["mobile-architect"],
  "mobile-architecture": ["mobile-architect"],
  "cross-platform-mobile": ["mobile-architect"],
  "react-native-arch": ["mobile-architect"],
  "app-sync": ["mobile-architect"],
  "fluent-mobile": ["mobile-architect"],

  // C15 — plan-critic
  "plan-critique": ["plan-critic"],
  "plan-approval": ["plan-critic"],
  "dependency-check": ["plan-critic"],
  "acceptance-criteria-review": ["plan-critic"],
  "plan-feasibility": ["plan-critic"],
  "plan-validation": ["plan-critic"],

  // C15 — plan-analyst
  "effort-sizing": ["plan-analyst"],
  "risk-scoring": ["plan-analyst"],
  "dependency-map": ["plan-analyst"],
  "critical-path": ["plan-analyst"],
  "execution-sequence": ["plan-analyst"],
  "plan-scope": ["plan-analyst"],

  // C15 — idea-validator
  "idea-validation": ["idea-validator"],
  "go-no-go": ["idea-validator"],
  "validate-idea": ["idea-validator"],
  "pressure-test": ["idea-validator"],
  "competitive-teardown": ["idea-validator"],
  "demand-verification": ["idea-validator"],

  // C15 — cost-optimizer
  "cloud-cost-reduction": ["cost-optimizer"],
  "aws-costs": ["cost-optimizer"],
  "azure-costs": ["cost-optimizer"],
  "gcp-costs": ["cost-optimizer"],
  "cost-anomaly": ["cost-optimizer"],
  "spot-instance-strategy": ["cost-optimizer"],
  // C16 — design pack: ui-designer, ux-designer, technical-writer, communication-coach
  "design-system": ["ui-designer"],
  "design-tokens": ["ui-designer"],
  "dark-mode-tokens": ["ui-designer"],
  "component-library": ["ui-designer"],
  "wcag-tokens": ["ui-designer"],
  "figma-handoff": ["ui-designer"],
  "user-research": ["ux-designer"],
  "persona-creation": ["ux-designer"],
  "journey-mapping": ["ux-designer"],
  "information-architecture": ["ux-designer"],
  "wireframing": ["ux-designer"],
  "ux-audit": ["ux-designer"],
  "api-documentation": ["technical-writer"],
  "openapi-spec": ["technical-writer"],
  "runbook": ["technical-writer"],
  "adr-writing": ["technical-writer"],
  "changelog-writing": ["technical-writer"],
  "codemap-generation": ["technical-writer"],
  "draft-review": ["communication-coach"],
  "tone-calibration": ["communication-coach"],
  "difficult-conversation": ["communication-coach"],
  "sbi-feedback": ["communication-coach"],
  "stakeholder-communication": ["communication-coach"],
  "pr-description-review": ["communication-coach"],
  // C16b — overflow agents: qa (core), codebase-pattern-finder (core), error-recovery (quality), writing-auditor (quality)
  "e2e-test": ["qa"],
  "playwright-test": ["qa"],
  "coverage-gaps": ["qa"],
  "test-implementation": ["qa"],
  "flaky-test": ["qa"],
  "test-bootstrap": ["qa"],
  "pattern-catalog": ["codebase-pattern-finder"],
  "brownfield-patterns": ["codebase-pattern-finder"],
  "codebase-archaeology": ["codebase-pattern-finder"],
  "usage-examples": ["codebase-pattern-finder"],
  "convention-discovery": ["codebase-pattern-finder"],
  "implementation-patterns": ["codebase-pattern-finder"],
  "semantic-error": ["error-recovery"],
  "repeated-error": ["error-recovery"],
  "gicl-regression": ["error-recovery"],
  "pytorch-error": ["error-recovery"],
  "cuda-error": ["error-recovery"],
  "tensor-shape": ["error-recovery"],
  "ai-isms": ["writing-auditor"],
  "writing-audit": ["writing-auditor"],
  "humanize-text": ["writing-auditor"],
  "remove-ai-patterns": ["writing-auditor"],
  "tier1-vocabulary": ["writing-auditor"],
  "prose-quality": ["writing-auditor"],
  // S2 + Tier 2 batch D1: blockchain-developer (specialists)
  "smart-contract": ["blockchain-developer"],
  "solidity": ["blockchain-developer"],
  "dapp": ["blockchain-developer"],
  "web3": ["blockchain-developer"],
  "erc20": ["blockchain-developer"],
  "defi-protocol": ["blockchain-developer"],

  // D1: ai-engineer (specialists)
  "ai-integration": ["ai-engineer"],
  "model-selection": ["ai-engineer"],
  "ethical-ai": ["ai-engineer"],
  "bias-detection": ["ai-engineer"],
  "explainability": ["ai-engineer"],
  "ai-governance": ["ai-engineer"],

  // D1: nlp-engineer (specialists)
  "ner": ["nlp-engineer"],
  "sentiment-analysis": ["nlp-engineer"],
  "text-classification": ["nlp-engineer"],
  "transformer-fine-tuning": ["nlp-engineer"],
  "nlp-pipeline": ["nlp-engineer"],
  "multilingual-nlp": ["nlp-engineer"],

  // D1: rl-engineer (specialists)
  "reinforcement-learning": ["rl-engineer"],
  "reward-shaping": ["rl-engineer"],
  "ppo": ["rl-engineer"],
  "dqn": ["rl-engineer"],
  "sim-to-real": ["rl-engineer"],
  "rl-environment": ["rl-engineer"],

  // D2: quant-analyst (specialists)
  "quant-trading": ["quant-analyst"],
  "backtest": ["quant-analyst"],
  "statistical-arbitrage": ["quant-analyst"],
  "derivatives-pricing": ["quant-analyst"],
  "var-sharpe": ["quant-analyst"],
  "walk-forward": ["quant-analyst"],

  // D2: fintech-engineer (specialists)
  "double-entry-accounting": ["fintech-engineer"],
  "idempotent-payment": ["fintech-engineer"],
  "kyc-aml": ["fintech-engineer"],
  "pci-dss": ["fintech-engineer"],
  "financial-ledger": ["fintech-engineer"],
  "reconciliation-job": ["fintech-engineer"],

  // D2: payment-integration (specialists)
  "stripe-integration": ["payment-integration"],
  "payment-gateway": ["payment-integration"],
  "webhook-handler": ["payment-integration"],
  "subscription-billing": ["payment-integration"],
  "3d-secure": ["payment-integration"],
  "payment-tokenization": ["payment-integration"],

  // D2: iot-engineer (specialists)
  "mqtt": ["iot-engineer"],
  "edge-computing": ["iot-engineer"],
  "ota-firmware": ["iot-engineer"],
  "device-management": ["iot-engineer"],
  "iot-telemetry": ["iot-engineer"],
  "mtls-iot": ["iot-engineer"],

  // D3: accessibility-tester (specialists)
  "wcag-compliance": ["accessibility-tester"],
  "a11y-audit": ["accessibility-tester"],
  "screen-reader": ["accessibility-tester"],
  "keyboard-navigation": ["accessibility-tester"],
  "color-contrast": ["accessibility-tester"],
  "aria-audit": ["accessibility-tester"],

  // D3: seo-specialist (specialists)
  "seo-audit": ["seo-specialist"],
  "core-web-vitals": ["seo-specialist"],
  "structured-data": ["seo-specialist"],
  "keyword-research": ["seo-specialist"],
  "technical-seo": ["seo-specialist"],
  "schema-org": ["seo-specialist"],

  // D3: azure-infra-expert (specialists)
  "bicep-iac": ["azure-infra-expert"],
  "entra-id": ["azure-infra-expert"],
  "azure-landing-zone": ["azure-infra-expert"],
  "azure-rbac": ["azure-infra-expert"],
  "azure-key-vault": ["azure-infra-expert"],
  "conditional-access": ["azure-infra-expert"],

  // D3: cloud-architect (specialists)
  "cloud-architecture": ["cloud-architect"],
  "well-architected-framework": ["cloud-architect"],
  "multi-cloud": ["cloud-architect"],
  "cloud-migration": ["cloud-architect"],
  "disaster-recovery": ["cloud-architect"],
  "cloud-landing-zone": ["cloud-architect"],

  // D4: platform-engineer (specialists)
  "internal-platform": ["platform-engineer"],
  "developer-portal": ["platform-engineer"],
  "golden-path": ["platform-engineer"],
  "backstage": ["platform-engineer"],
  "service-catalog": ["platform-engineer"],
  "gitops-platform": ["platform-engineer"],

  // D4: m365-admin (specialists)
  "microsoft-365": ["m365-admin"],
  "exchange-online": ["m365-admin"],
  "teams-admin": ["m365-admin"],
  "sharepoint-admin": ["m365-admin"],
  "graph-api-m365": ["m365-admin"],
  "purview-compliance": ["m365-admin"],

  // D4: legal-advisor (specialists)
  "contract-review": ["legal-advisor"],
  "gdpr-compliance": ["legal-advisor"],
  "privacy-policy": ["legal-advisor"],
  "terms-of-service": ["legal-advisor"],
  "ip-protection": ["legal-advisor"],
  "open-source-license": ["legal-advisor"],

  // Error Observability — aicodepath-silent-failure-hunter
  "silent-failure": ["silent-failure-hunter"],
  "error-observability": ["silent-failure-hunter", "sre-engineer"],
  "catch-block": ["silent-failure-hunter"],
  "swallowed-error": ["silent-failure-hunter"],
  "fallback-masking": ["silent-failure-hunter"],
  "error-handler-review": ["silent-failure-hunter"],

  // Test Completeness — aicodepath-test-completeness-analyzer
  "test-completeness": ["test-completeness-analyzer"],
  "behavioral-coverage": ["test-completeness-analyzer"],
  "coverage-gap-analysis": ["test-completeness-analyzer", "test-engineer"],
  "missing-test-cases": ["test-completeness-analyzer"],
  "regression-risk": ["test-completeness-analyzer"],
  "dual-layer-safety": ["test-completeness-analyzer"],

  // Core agents present in VIOLATION_TYPE_MAPPING but needing DOMAIN_MAPPING coverage
  "threat-modeling": ["security-engineer"],
  "owasp-top10": ["security-engineer"],
  "api-security": ["security-engineer"],
  "schema-design": ["database-architect"],
  "index-strategy": ["database-architect"],
  "migration-scripts": ["database-architect"],

  // Uncategorized specialists (plugin_pack: specialists, Build/Deploy deferred to Plan 2)
  // build-engineer
  "slow-builds": ["build-engineer"],
  "build-optimization": ["build-engineer"],
  "bundle-size": ["build-engineer"],
  // cli-developer
  "cli-tool": ["cli-developer"],
  "command-line-interface": ["cli-developer"],
  "terminal-app": ["cli-developer"],
  // competitive-analyst
  "competitive-analysis": ["competitive-analyst"],
  "swot-analysis": ["competitive-analyst"],
  "competitor-research": ["competitive-analyst"],
  // content-marketer
  "content-marketing": ["content-marketer"],
  "editorial-calendar": ["content-marketer"],
  "blog-strategy": ["content-marketer"],
  // customer-success-manager
  "customer-success": ["customer-success-manager"],
  "nps-churn": ["customer-success-manager"],
  "retention-strategy": ["customer-success-manager"],
  // data-researcher
  "dataset-discovery": ["data-researcher"],
  "data-analysis-research": ["data-researcher"],
  "statistical-patterns": ["data-researcher"],
  // deployment-engineer
  "blue-green-deployment": ["deployment-engineer"],
  "canary-release": ["deployment-engineer"],
  "gitops-deployment": ["deployment-engineer"],
  // embedded-systems
  "firmware-development": ["embedded-systems"],
  "microcontroller": ["embedded-systems"],
  "rtos-freertos": ["embedded-systems"],
  // error-detective
  "error-investigation": ["error-detective"],
  "cascade-failure": ["error-detective"],
  "error-patterns": ["error-detective"],
  // it-ops-orchestrator
  "it-operations": ["it-ops-orchestrator"],
  "hybrid-identity": ["it-ops-orchestrator"],
  "cross-domain-it": ["it-ops-orchestrator"],
  // license-engineer
  "license-compliance": ["license-engineer"],
  "sbom-generation": ["license-engineer"],
  "copyleft-risk": ["license-engineer"],
  // market-researcher
  "market-research": ["market-researcher"],
  "tam-sam-som": ["market-researcher"],
  "market-sizing": ["market-researcher"],
  // network-engineer
  "network-architecture": ["network-engineer"],
  "vpc-design": ["network-engineer"],
  "firewall-rules": ["network-engineer"],
  // powershell-expert
  "powershell-automation": ["powershell-expert"],
  "ps1-scripts": ["powershell-expert"],
  "windows-automation": ["powershell-expert"],
  // risk-manager
  "risk-assessment": ["risk-manager"],
  "enterprise-risk": ["risk-manager"],
  "risk-register": ["risk-manager"],
  // sales-engineer
  "sales-engineering": ["sales-engineer"],
  "poc-development": ["sales-engineer"],
  "rfp-response": ["sales-engineer"],
  // scrum-master
  "sprint-planning": ["scrum-master"],
  "retrospective-facilitation": ["scrum-master"],
  "agile-coaching": ["scrum-master"],
  // search-specialist
  "advanced-search": ["search-specialist"],
  "search-query-optimization": ["search-specialist"],
  "source-discovery": ["search-specialist"],
  // slack-expert
  "slack-app": ["slack-expert"],
  "slack-bot": ["slack-expert"],
  "bolt-sdk": ["slack-expert"],
  // tooling-engineer
  "developer-tooling": ["tooling-engineer"],
  "code-generator": ["tooling-engineer"],
  "language-server": ["tooling-engineer"],
  // trend-analyst
  "trend-analysis": ["trend-analyst"],
  "emerging-trends": ["trend-analyst"],
  "scenario-planning": ["trend-analyst"],
  // windows-infra-expert
  "active-directory": ["windows-infra-expert"],
  "windows-server": ["windows-infra-expert"],
  "group-policy": ["windows-infra-expert"],
  // wordpress-master
  "wordpress-development": ["wordpress-master"],
  "woocommerce": ["wordpress-master"],
  "gutenberg-blocks": ["wordpress-master"]
};

/**
 * Violation type to agent mapping
 * Maps validation violation types to agents
 */
const VIOLATION_TYPE_MAPPING = {
  'guideline': ['code-reviewer'],
  'architecture': ['architect', 'backend-architect'],
  'security': ['security-engineer'],
  'authenticity': ['code-reviewer', 'backend-architect'],
  'duplication': ['refactoring-expert'],
  'complexity': ['refactoring-expert', 'code-reviewer'],
  'testing': ['test-engineer', 'qa'],
  'performance': ['performance-engineer'],
  'api-design': ['api-designer', 'backend-architect'],
  'data-modeling': ['database-architect'],
  'devops': ['devops-architect'],
  'frontend': ['frontend-architect', 'ui-designer'],
  'mobile': ['mobile-architect'],
  'accessibility': ['ux-designer', 'frontend-architect'],
  'compliance': ['compliance-auditor'],
  'reliability': ['sre-engineer'],
  'cost': ['cost-optimizer'],
  'data-science': ['data-scientist', 'ml-engineer'],
  'ml': ['ml-engineer', 'data-scientist'],
  'communication': ['communication-coach'],
  'documentation': ['technical-writer'],
  'ux': ['ux-designer'],
  'ui': ['ui-designer', 'frontend-architect'],
  'error-observability': ['silent-failure-hunter', 'code-reviewer'],
  'test-completeness': ['test-completeness-analyzer', 'test-engineer']
};

/**
 * Normalize granular guideline categories to broad domains
 * Maps the 74+ fine-grained categories from JSON guidelines to the
 * 15 domains used in VIOLATION_TYPE_MAPPING for agent resolution.
 */
const CATEGORY_NORMALIZATION = {
  // Security domain
  'secrets': 'security', 'secrets_management': 'security', 'injection': 'security',
  'authentication': 'security', 'authorization': 'security', 'crypto': 'security',
  'cors': 'security', 'ssrf': 'security', 'path_traversal': 'security',
  'deserialization': 'security', 'file_uploads': 'security', 'headers': 'security',
  'cloud_security': 'security', 'security_anti_patterns': 'security',
  // Architecture domain
  'design_patterns': 'architecture', 'layering': 'architecture', 'structure': 'architecture',
  'patterns': 'architecture', 'encapsulation': 'architecture', 'contracts': 'architecture',
  // Performance domain
  'async': 'performance', 'concurrency': 'performance', 'cache_warming': 'performance',
  // Testing domain
  'assertions': 'testing', 'coverage': 'testing', 'mocking': 'testing',
  'testing_anti_patterns': 'testing',
  // Code quality (guideline) domain
  'naming': 'guideline', 'imports': 'guideline', 'comments': 'guideline',
  'functions': 'guideline', 'errors': 'guideline', 'error_handling': 'guideline',
  'error_semantics': 'guideline', 'strict_mode': 'guideline', 'console': 'guideline',
  'clarity': 'guideline', 'technical_writing': 'guideline',
  'ai_anti_patterns': 'guideline', 'ai_code_anti_patterns': 'guideline',
  'anti_patterns': 'guideline',
  // API design domain
  'api': 'api-design', 'responses': 'api-design',
  // Data modeling domain
  'database': 'data-modeling', 'queries': 'data-modeling', 'relational': 'data-modeling',
  'transactions': 'data-modeling', 'stored_procedures': 'data-modeling',
  'triggers': 'data-modeling',
  // DevOps domain
  'docker': 'devops', 'kubernetes': 'devops', 'cicd': 'devops',
  'ci_integration': 'devops', 'ci_quality': 'devops', 'release_strategy': 'devops',
  'configuration': 'devops', 'configuration_management': 'devops',
  'dependencies': 'devops',
  // Observability
  'logging': 'devops', 'metrics': 'devops', 'analytics': 'devops',
  'multi_tenant_observability': 'devops',
  // Authenticity (mock detection)
  'stub': 'authenticity', 'mock_data': 'authenticity', 'fake_logic': 'authenticity',
  // Mobile domain
  'platform': 'mobile',
  // SRE & Reliability
  'slo': 'reliability', 'sli': 'reliability', 'error_budget': 'reliability',
  'incident': 'reliability', 'runbook': 'reliability', 'alerting': 'reliability',
  // Cost & FinOps
  'cost': 'cost', 'billing': 'cost', 'finops': 'cost', 'rightsizing': 'cost',
  // Data Science & ML
  'ml_model': 'ml', 'model_training': 'ml', 'inference': 'ml', 'mlops': 'ml',
  'feature_engineering': 'data-science', 'dataset': 'data-science', 'bias': 'data-science',
  // Compliance
  'gdpr': 'compliance', 'hipaa': 'compliance', 'soc2': 'compliance', 'pci': 'compliance',
  'audit': 'compliance', 'privacy': 'compliance',
  // Communication
  'commit_message': 'communication', 'pull_request': 'communication', 'handoff': 'communication',
  // UX / UI
  'usability': 'ux', 'wireframe': 'ux', 'user_journey': 'ux',
  'design_token': 'ui', 'design_system': 'ui',
  // AI-specific
  'ai_agent_safety': 'security', 'prompts': 'guideline', 'registry': 'architecture',
  // Others map to general guideline review
  'stability': 'guideline', 'usefulness': 'guideline', 'enforcement': 'guideline',
};

/**
 * Initialize agent registry
 * @returns {Promise<AgentRegistry>} Initialized registry
 */
async function initializeRegistry() {
  if (_registryCache) return _registryCache;

  const loader = new AgentLoader();
  const agents = await loader.loadAll();
  const registry = new AgentRegistry();
  registry.register(agents);

  _registryCache = registry;
  return registry;
}

/**
 * Suggest agents for a violation
 *
 * @param {Object} violation - Violation object
 * @param {AgentRegistry} registry - Agent registry
 * @returns {Object[]} Array of suggested agents with scores
 */
function suggestAgentsForViolation(violation, registry) {
  const suggestions = new Map(); // agent name -> score

  // Check violation type (normalize granular categories to broad domains)
  const rawCategory = violation.category || violation.rule || 'general';
  const violationType = CATEGORY_NORMALIZATION[rawCategory] || rawCategory;
  const violationAgents = VIOLATION_TYPE_MAPPING[violationType] || [];

  violationAgents.forEach(agentName => {
    suggestions.set(agentName, (suggestions.get(agentName) || 0) + 10);
  });

  // Check violation message for keywords
  const message = (violation.message || '').toLowerCase();

  for (const [keyword, agents] of Object.entries(DOMAIN_MAPPING)) {
    if (message.includes(keyword)) {
      agents.forEach(agentName => {
        suggestions.set(agentName, (suggestions.get(agentName) || 0) + 5);
      });
    }
  }

  // Use registry suggestion system
  const registrySuggestions = registry.suggestAgent({
    task: violation.message,
    filePath: violation.file,
    violationType
  });

  registrySuggestions.forEach(agent => {
    suggestions.set(agent.name, (suggestions.get(agent.name) || 0) + 8);
  });

  // Convert to array and sort
  return Array.from(suggestions.entries())
    .map(([name, score]) => ({
      agent: registry.findByName(name),
      score
    }))
    .filter(s => s.agent !== null)
    .sort((a, b) => b.score - a.score)
    .map(s => s.agent);
}

/**
 * Suggest agents for an incomplete requirement
 *
 * @param {Object} requirement - Requirement object
 * @param {AgentRegistry} registry - Agent registry
 * @returns {Object[]} Array of suggested agents
 */
function suggestAgentsForRequirement(requirement, registry) {
  const suggestions = new Map(); // agent name -> score

  const text = requirement.requirement || requirement.text || '';
  const textLower = text.toLowerCase();

  // Check domain keywords
  for (const [keyword, agents] of Object.entries(DOMAIN_MAPPING)) {
    if (textLower.includes(keyword)) {
      agents.forEach(agentName => {
        suggestions.set(agentName, (suggestions.get(agentName) || 0) + 8);
      });
    }
  }

  // Use registry suggestion system
  const registrySuggestions = registry.suggestAgent({
    task: text,
    filePath: requirement.file || ''
  });

  registrySuggestions.forEach(agent => {
    suggestions.set(agent.name, (suggestions.get(agent.name) || 0) + 10);
  });

  // Default to backend architect for implementation tasks
  if (suggestions.size === 0) {
    suggestions.set('backend-architect', 5);
  }

  // Convert to array and sort
  return Array.from(suggestions.entries())
    .map(([name, score]) => ({
      agent: registry.findByName(name),
      score
    }))
    .filter(s => s.agent !== null)
    .sort((a, b) => b.score - a.score)
    .map(s => s.agent);
}

/**
 * Suggest agents based on violations and incomplete requirements
 *
 * @param {Object} context - Context object
 * @param {Object[]} context.violations - Array of violations
 * @param {Object[]} context.incompleteCriteria - Array of incomplete criteria
 * @param {string} context.filePath - File being validated
 * @returns {Promise<Object>} Suggestion results
 */
async function suggestAgents(context) {
  const {
    violations = [],
    incompleteCriteria = [],
    filePath = ''
  } = context;

  const registry = await initializeRegistry();

  const suggestions = new Map(); // agent name -> { agent, sources, score }

  // Process violations
  violations.forEach(violation => {
    const agentsForViolation = suggestAgentsForViolation(violation, registry);

    agentsForViolation.forEach((agent, index) => {
      const name = agent.name;
      if (!suggestions.has(name)) {
        suggestions.set(name, {
          agent,
          sources: [],
          score: 0
        });
      }

      const suggestion = suggestions.get(name);
      suggestion.sources.push({
        type: 'violation',
        reason: violation.message,
        severity: violation.severity,
        line: violation.line
      });
      // Weight by ranking position (first suggestion gets more points)
      suggestion.score += (10 - index);
    });
  });

  // Process incomplete requirements
  incompleteCriteria.forEach(requirement => {
    const agentsForRequirement = suggestAgentsForRequirement(requirement, registry);

    agentsForRequirement.forEach((agent, index) => {
      const name = agent.name;
      if (!suggestions.has(name)) {
        suggestions.set(name, {
          agent,
          sources: [],
          score: 0
        });
      }

      const suggestion = suggestions.get(name);
      suggestion.sources.push({
        type: 'requirement',
        reason: requirement.requirement || requirement.text,
        confidence: requirement.confidence || 0
      });
      // Weight by ranking position
      suggestion.score += (10 - index);
    });
  });

  // Convert to array, sort by score, and deduplicate sources
  const rankedSuggestions = Array.from(suggestions.values())
    .map(suggestion => ({
      ...suggestion,
      sources: deduplicateSources(suggestion.sources)
    }))
    .sort((a, b) => b.score - a.score);

  return {
    suggestions: rankedSuggestions,
    totalAgents: rankedSuggestions.length,
    topAgent: rankedSuggestions.length > 0 ? rankedSuggestions[0].agent.name : null,
    violationCount: violations.length,
    incompleteCount: incompleteCriteria.length
  };
}

/**
 * Deduplicate sources by reason
 *
 * @param {Object[]} sources - Array of sources
 * @returns {Object[]} Deduplicated sources
 */
function deduplicateSources(sources) {
  const seen = new Set();
  return sources.filter(source => {
    const key = `${source.type}:${source.reason}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Format suggestions for display
 *
 * @param {Object} suggestionResult - Result from suggestAgents
 * @returns {string} Formatted text
 */
function formatSuggestions(suggestionResult) {
  const lines = [];

  if (suggestionResult.totalAgents === 0) {
    return 'No agent suggestions available.';
  }

  lines.push(`\nAgent Suggestions (${suggestionResult.totalAgents} agents recommended):\n`);

  suggestionResult.suggestions.slice(0, 5).forEach((suggestion, index) => {
    const { agent, sources, score } = suggestion;

    lines.push(`${index + 1}. ${agent.name} (score: ${score})`);
    lines.push(`   Category: ${agent.category}`);
    lines.push(`   Reasons (${sources.length}):`);

    sources.slice(0, 3).forEach(source => {
      if (source.type === 'violation') {
        lines.push(`     - Violation: ${source.reason} (${source.severity})`);
      } else {
        lines.push(`     - Requirement: ${source.reason.substring(0, 80)}...`);
      }
    });

    if (sources.length > 3) {
      lines.push(`     - ... and ${sources.length - 3} more`);
    }

    lines.push('');
  });

  return lines.join('\n');
}

module.exports = {
  suggestAgents,
  suggestAgentsForViolation,
  suggestAgentsForRequirement,
  formatSuggestions,
  initializeRegistry,
  DOMAIN_MAPPING,
  VIOLATION_TYPE_MAPPING,
  CATEGORY_NORMALIZATION
};

// Allow standalone execution for testing
if (require.main === module) {
  (async () => {
    const testContext = {
      violations: [
        {
          rule: 'security-001',
          message: 'Missing CSRF protection on POST endpoint',
          severity: 'error',
          category: 'security',
          file: 'src/api/routes.ts',
          line: 42
        },
        {
          rule: 'arch-002',
          message: 'Database query in controller - should be in repository',
          severity: 'warning',
          category: 'architecture',
          file: 'src/api/user.controller.ts',
          line: 18
        }
      ],
      incompleteCriteria: [
        {
          text: 'User can authenticate using JWT tokens',
          verified: false,
          confidence: 0.3
        },
        {
          text: 'API endpoints have unit tests with >80% coverage',
          verified: false,
          confidence: 0.1
        }
      ],
      filePath: 'src/api/user.controller.ts'
    };

    console.log('Testing Agent Suggester\n');
    console.log('Input:');
    console.log(`- ${testContext.violations.length} violations`);
    console.log(`- ${testContext.incompleteCriteria.length} incomplete requirements\n`);

    const result = await suggestAgents(testContext);

    console.log(formatSuggestions(result));

    console.log('\nDetailed Results:');
    result.suggestions.forEach((suggestion, index) => {
      console.log(`\n${index + 1}. ${suggestion.agent.name}`);
      console.log(`   Description: ${suggestion.agent.description}`);
      console.log(`   Capabilities: ${suggestion.agent.capabilities.join(', ')}`);
    });
  })().catch(console.error);
}
