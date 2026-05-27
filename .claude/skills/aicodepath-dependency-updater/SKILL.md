---
name: aicodepath-dependency-updater
description: >
  Use during MAINTENANCE phase when dependencies are outdated, have security vulnerabilities, or need auditing — safely updates PATCH/MINOR versions and prompts for MAJOR changes. Triggered by: "update dependencies", "audit packages", "fix vulnerabilities", "update packages", "dependency audit", "npm audit", "outdated packages".
tags:
  - dependencies
  - security
  - maintenance
  - multi-language
  - automation
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: ""
---

# AICodePath Dependency Updater

Smart dependency management for any language with automatic detection, safe updates, and security auditing.

## Quick Start

```
update my dependencies
```

The skill auto-detects your project type and handles the rest.

---

## Triggers

| Trigger | Example |
|---------|---------|
| Update dependencies | "update dependencies", "update deps" |
| Check outdated | "check for outdated packages" |
| Fix dependency issues | "fix my dependency problems" |
| Security audit | "audit dependencies for vulnerabilities" |
| Diagnose deps | "diagnose dependency issues" |

---

## Supported Languages

| Language | Package File | Update Tool | Audit Tool |
|----------|--------------|-------------|------------|
| **Node.js** | package.json | `taze` | `npm audit` |
| **Python** | requirements.txt, pyproject.toml | `pip-review` | `safety`, `pip-audit` |
| **Go** | go.mod | `go get -u` | `govulncheck` |
| **Rust** | Cargo.toml | `cargo update` | `cargo audit` |
| **Ruby** | Gemfile | `bundle update` | `bundle audit` |
| **Java** | pom.xml, build.gradle | `mvn versions:*` | `mvn dependency:*` |
| **.NET** | *.csproj | `dotnet outdated` | `dotnet list package --vulnerable` |

---

## Safe Update Strategy

| Update Type | Version Change | Action |
|-------------|----------------|--------|
| **Fixed** | No `^` or `~` | Skip (intentionally pinned) |
| **PATCH** | `x.y.z` → `x.y.Z` | Auto-apply |
| **MINOR** | `x.y.z` → `x.Y.0` | Auto-apply |
| **MAJOR** | `x.y.z` → `X.0.0` | Prompt user individually |

---

## Workflow

```
Step 1: DETECT PROJECT TYPE
• Scan for package files (package.json, go.mod...)
• Identify package manager

Step 2: CHECK PREREQUISITES
• Verify required tools are installed
• Suggest installation if missing

Step 3: SCAN FOR UPDATES
• Run language-specific outdated check
• Categorize: MAJOR / MINOR / PATCH / Fixed

Step 4: AUTO-APPLY SAFE UPDATES
• Apply MINOR and PATCH automatically
• Report what was updated

Step 5: PROMPT FOR MAJOR UPDATES
• AskUserQuestion for each MAJOR update individually
• Show current → new version + changelog link

Step 6: APPLY APPROVED MAJORS
• Update only approved packages

Step 7: FINALIZE
• Run install command
• Run security audit
```

---

## AICodePath Integration

- **Routine Updates**: Use during regular maintenance cycles to keep dependencies current
- **Security Audits**: Run before VALIDATION phase to ensure no vulnerabilities
- **Pre-Release**: Execute before DEPLOYMENT to verify all dependencies are secure

---

## Commands by Language

### Node.js (npm/yarn/pnpm)

```bash
taze                          # Scan for updates
taze minor --write            # Apply minor/patch
taze major --write --include pkg1,pkg2  # Apply specific majors
taze -r                       # Monorepo support (recursive)
npm audit && npm audit fix    # Security
```

### Python

```bash
pip list --outdated           # Check outdated
pip-review --auto             # Update all
pip install --upgrade package # Update specific
pip-audit && safety check     # Security
```

### Go

```bash
go list -m -u all             # Check outdated
go get -u ./... && go mod tidy  # Update + cleanup
govulncheck ./...              # Security
```

### Rust

```bash
cargo outdated                 # Check outdated
cargo update                   # Update within semver
cargo audit                    # Security
```

### Ruby

```bash
bundle outdated                # Check outdated
bundle update --conservative gem-name  # Update specific
bundle audit                   # Security
```

### Java (Maven)

```bash
mvn versions:display-dependency-updates  # Check outdated
mvn versions:use-latest-releases         # Update to latest
mvn dependency-check:check               # Security
```

### .NET

```bash
dotnet list package --outdated           # Check outdated
dotnet add package PackageName           # Update specific
dotnet list package --vulnerable         # Security
```

---

## Diagnosis Mode

When dependencies are broken:

| Issue | Symptoms | Fix |
|-------|----------|-----|
| **Version Conflict** | "Cannot resolve dependency tree" | Clean install, use overrides/resolutions |
| **Peer Dependency** | "Peer dependency not satisfied" | Install required peer version |
| **Security Vuln** | `npm audit` shows issues | `npm audit fix` or manual update |
| **Unused Deps** | Bloated bundle | Run `depcheck` (Node) or equivalent |
| **Duplicate Deps** | Multiple versions installed | Run `npm dedupe` or equivalent |

### Emergency Fixes

```bash
# Node.js - Nuclear reset
rm -rf node_modules package-lock.json && npm cache clean --force && npm install

# Python - Clean virtualenv
rm -rf venv && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Go - Reset modules
rm go.sum && go mod tidy
```

---

## Security Audit

| Severity | Action |
|----------|--------|
| **Critical** | Fix immediately |
| **High** | Fix within 24h |
| **Moderate** | Fix within 1 week |
| **Low** | Fix in next release |

---

## NEVER

- **NEVER** auto-apply MAJOR version updates — MAJOR bumps indicate breaking changes by semver contract. A library that previously exported `createServer(options)` may now require `createServer(config, callback)`. Auto-applying without reviewing the changelog breaks the application in ways that only appear at runtime.
- **NEVER** update a pinned exact version (`"1.2.3"` with no `^` or `~`) — pinned versions are intentional. Someone fixed them because `^` caused a regression. Updating them without understanding why they were pinned repeats that regression.
- **NEVER** batch MAJOR update prompts into a single "update all?" question — each major has its own migration guide and risk profile. Prompt individually with current → new version and changelog link.
- **NEVER** skip updating the lock file after running dependency changes — `package-lock.json`, `yarn.lock`, `go.sum` ensure reproducible builds. Uncommitted lock file changes mean CI and teammates get different dependency versions.
- **NEVER** mark security vulnerabilities as resolved without verifying the specific CVE — `npm audit fix` sometimes reports "0 vulnerabilities" by upgrading a transitive dependency without fixing the actual vulnerable code path. Verify the CVE is addressed, not just that the count dropped.

## Deep Dive References

For detailed project detection logic, Node.js taze workflows, semantic versioning strategies, and conflict resolution patterns, read:
**`references/deep-dive.md`**

---

## Verification Checklist

After updates:

- [ ] Updates scanned without errors
- [ ] MINOR/PATCH auto-applied
- [ ] MAJOR updates prompted individually
- [ ] Fixed versions untouched
- [ ] Lock file updated
- [ ] Install command ran
- [ ] Security audit passed (or issues noted)

---

## Related Tools

| Tool | Language | Purpose |
|------|----------|---------|
| [taze](https://github.com/antfu-collective/taze) | Node.js | Smart dependency updates |
| [npm-check-updates](https://github.com/raineorshine/npm-check-updates) | Node.js | Alternative to taze |
| [pip-review](https://github.com/jgonggrijp/pip-review) | Python | Interactive pip updates |
| [cargo-edit](https://github.com/killercup/cargo-edit) | Rust | Cargo dependency management |
| [bundler-audit](https://github.com/rubysec/bundler-audit) | Ruby | Security auditing |
