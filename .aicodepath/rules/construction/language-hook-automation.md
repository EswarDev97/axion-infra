# Language Hook Automation

Per-language post-edit quality patterns for TypeScript, Python, Go, Rust, Java, and Kotlin.

> **future promotion path — NOT implemented as hooks in this sprint.**
> These are reference patterns for manual execution or future hook automation.
> Actual PostToolUse hooks for language tools would require detecting the edited file's language,
> running the formatter, and surfacing results via `systemMessage`. That work is deferred.

---

## TypeScript

**Detect config**: `tsconfig.json` in project root or `packages/*/tsconfig.json` (monorepo)

| Phase | Command | Notes |
|-------|---------|-------|
| Format | `npx biome format --write .` or `npx prettier --write <file>` | Use whichever is configured |
| Type check | `npx tsc --noEmit` | Runs in ~2–10s depending on project size |
| Lint | `npx biome lint .` or `npx eslint <file>` | File-scope lint is faster |

**Config detection**:
```bash
test -f biome.json && echo "biome" || (test -f .prettierrc || test -f prettier.config.js) && echo "prettier"
```

---

## Python

**Detect config**: `pyproject.toml` (ruff config), `setup.cfg`, `.mypy.ini`

| Phase | Command | Notes |
|-------|---------|-------|
| Format | `ruff format <file>` | Fast Black-compatible |
| Type check | `mypy <file>` | May be slow on first run (builds cache) |
| Lint | `ruff check <file>` | Covers flake8 + isort + pyupgrade |

**Config detection**:
```bash
grep -q "\[tool.ruff\]" pyproject.toml 2>/dev/null && echo "ruff configured"
```

---

## Go

**Detect config**: `go.mod` in project root (required for any Go project)

| Phase | Command | Notes |
|-------|---------|-------|
| Format | `goimports -w <file>` or `gofmt -w <file>` | goimports preferred (handles imports) |
| Vet | `go vet ./...` | Fast; detects common bugs |
| Lint | `staticcheck ./...` or `golangci-lint run <file>` | Install separately |

**Config detection**:
```bash
test -f go.mod && echo "go module present"
test -f .golangci.yml && echo "golangci-lint configured"
```

---

## Rust

**Detect config**: `Cargo.toml` in project root

| Phase | Command | Notes |
|-------|---------|-------|
| Format | `cargo fmt` | Modifies in place; use `--check` in CI |
| Check | `cargo check` | Fast type + borrow check (no link) |
| Lint | `cargo clippy -- -D warnings` | CI standard; treats warnings as errors |

**Config detection**:
```bash
test -f Cargo.toml && echo "rust project present"
grep -q "\[workspace\]" Cargo.toml 2>/dev/null && echo "workspace (monorepo)"
```

---

## Java

**Detect config**: `build.gradle`, `build.gradle.kts`, or `pom.xml`

| Phase | Command | Notes |
|-------|---------|-------|
| Format | `./gradlew spotlessApply` | Requires Spotless plugin configured |
| Check | `./gradlew check` | Tests + PMD + Checkstyle |
| Compile only | `./gradlew compileJava` | Fast syntax check |

**Config detection**:
```bash
test -f build.gradle.kts && echo "kotlin dsl" || test -f build.gradle && echo "groovy dsl"
test -f pom.xml && echo "maven"
```

---

## Kotlin

**Detect config**: `build.gradle.kts` with ktlint/detekt plugins

| Phase | Command | Notes |
|-------|---------|-------|
| Format | `./gradlew ktlintFormat` | Requires ktlint Gradle plugin |
| Lint | `./gradlew detekt` | Detekt static analysis |
| Test | `./gradlew test` | JUnit 5 + MockK |

**Config detection**:
```bash
grep -q "ktlint" build.gradle.kts 2>/dev/null && echo "ktlint configured"
grep -q "detekt" build.gradle.kts 2>/dev/null && echo "detekt configured"
```

---

## Summary Table

| Language | Format | Type Check | Lint |
|----------|--------|------------|------|
| TypeScript | biome/prettier | tsc --noEmit | biome/eslint |
| Python | ruff format | mypy | ruff check |
| Go | goimports | — (go vet) | staticcheck |
| Rust | cargo fmt | cargo check | cargo clippy |
| Java | spotlessApply | compileJava | gradle check |
| Kotlin | ktlintFormat | — (build) | detekt |
