---
name: aicodepath-ci-fixer
pack: infra
---

# aicodepath-ci-fixer

Diagnoses CI/CD pipeline failures and local build errors, then applies targeted minimal-diff fixes.

## When to Use

Use when a CI pipeline is red, a local build fails to compile, or a deployment pipeline is blocked. Covers GitHub Actions log analysis, TypeScript/Go/Rust/Java compilation errors, webpack/vite/esbuild build failures, and any scenario where the build has regressed. Also handles local build errors during development.

## Triggers

- CI failure notification, "fix CI", "pipeline is red", "CI is failing"
- "build failed", "compilation error", "tsc error", "build broken", "won't compile"
- Local build errors during development
- GitHub Actions workflow failures

## Key Capabilities

- Parse GitHub Actions log output to identify root-cause failure lines
- Diagnose TypeScript, Go, Rust, Java/Gradle compilation errors with targeted fixes
- Fix webpack, vite, esbuild bundle/config failures
- Apply minimal-diff patches — touches only lines that caused the failure
- Suggest CI config corrections (env vars, runner images, step ordering, dependency caching)
- Distinguish flaky test failures from real regressions

## Domain Keywords

`ci-cd` · `github-actions` · `pipeline-failure` · `build-fix` · `ci-repair` · `compilation-error`

## Collaborates With

- `aicodepath-deployment-engineer` — Deployment pipeline configuration
- `aicodepath-typescript-expert` — TypeScript-specific compile errors
- `aicodepath-devops-architect` — CI/CD architecture improvements
