# CI/CD Integration Rules

**Purpose**: Ensure code passes CI/CD pipeline checks before pushing

**Principle**: Run the same checks locally that CI/CD will run remotely

---

## Overview

This stage integrates CI/CD linting into the AICodePath workflow to prevent pipeline failures. By detecting the project's CI configuration and running the same checks locally, developers catch issues before code reaches remote CI/CD systems.

## When This Stage Runs

- **Pre-Push Hook**: Automatically before `git push`
- **On-Demand**: Via `/ci-lint` skill
- **During Build**: As part of `build-and-test` stage (optional)

## Prerequisites

- Git repository initialized
- CI/CD configuration present:
  - GitHub Actions: `.github/workflows/*.yml`
  - GitLab CI: `.gitlab-ci.yml`
  - Azure Pipelines: `azure-pipelines.yml`
  - CircleCI: `.circleci/config.yml`

---

## Step 1: CI Configuration Detection

### 1.1 Detect CI Platform

The system automatically detects CI/CD configuration:

```javascript
// Supported platforms
const platforms = {
  github: '.github/workflows/*.yml',
  gitlab: '.gitlab-ci.yml',
  azure: 'azure-pipelines.yml',
  circleci: '.circleci/config.yml',
  travis: '.travis.yml',
  jenkins: 'Jenkinsfile'
};
```

### 1.2 Extract Lint Steps

Parse CI configuration to identify linting tools:

- **GitHub Actions**: Parse `uses:` actions and `run:` commands
- **GitLab CI**: Parse `script:` blocks
- **Azure Pipelines**: Parse `script:` lines

### 1.3 Output Detection Summary

```markdown
## CI Configuration Detected

**Platform**: GitHub Actions
**Config Files**: .github/workflows/ci.yml, .github/workflows/lint.yml

**Detected Linters**:
- flake8 (from: py-actions/flake8@v2)
- mypy (from: run: mypy src/)
- eslint (from: run: npm run lint)
```

---

## Step 2: Package Verification

### 2.1 Check Installed Linters

For each detected linter, verify it's installed:

| Linter | Package Manager | Check Command |
|--------|-----------------|---------------|
| flake8 | pip | `pip show flake8` |
| pylint | pip | `pip show pylint` |
| mypy | pip | `pip show mypy` |
| black | pip | `pip show black` |
| eslint | npm | `npm list eslint` |
| prettier | npm | `npm list prettier` |
| tsc | npm | `npm list typescript` |

### 2.2 Report Missing Packages

If linters are missing:

```markdown
## Missing Linters

The following linters are required by CI but not installed:

**Python (pip)**:
- [ ] flake8
- [ ] mypy

**Install with**:
```bash
pip install flake8 mypy
```

**Node.js (npm)**:
- [ ] eslint

**Install with**:
```bash
npm install --save-dev eslint
```
```

### 2.3 Block Push on Missing Linters

If required linters are missing, the pre-push hook blocks with:

```
[CI-LINT] ERROR: Missing lint tools required by CI/CD

Missing: flake8, mypy

Install with:
  pip install flake8 mypy

Or create .ci-lint-skip to bypass this check.
```

---

## Step 3: Run Linting Checks

### 3.1 Get Changed Files

```bash
# Get files that will be pushed
git diff --name-only @{u}...HEAD

# Or if no upstream, compare to last commit
git diff --name-only HEAD~1
```

### 3.2 Run Each Linter

For each detected linter, run on relevant files:

```bash
# Python linters
flake8 src/module.py tests/test_module.py
mypy src/module.py
black --check src/module.py

# JavaScript linters
npx eslint src/component.js
npx prettier --check src/component.js

# TypeScript
npx tsc --noEmit
```

### 3.3 Collect Results

```markdown
## CI Lint Results

| Linter | Files | Status | Issues |
|--------|-------|--------|--------|
| flake8 | 5 | PASS | 0 |
| mypy | 5 | FAIL | 2 errors |
| eslint | 3 | PASS | 0 |
| prettier | 3 | PASS | 0 |

**Overall**: FAIL (1 linter failed)
```

---

## Step 4: Handle Failures

### 4.1 Block Push on Failure

If any linter fails, block the push:

```
[CI-LINT] FAILED

mypy found 2 errors:

src/auth/user.py:42: error: Argument 1 to "process" has incompatible type "str"; expected "int"
src/auth/user.py:78: error: Missing return statement

Fix these issues before pushing.

To skip this check (not recommended):
  Create .ci-lint-skip file
```

### 4.2 Provide Fix Suggestions

For auto-fixable issues:

```markdown
## Auto-Fix Available

The following issues can be auto-fixed:

- **black**: 3 files need formatting
- **prettier**: 2 files need formatting
- **isort**: 5 imports need sorting

Run `/ci-lint --fix` to apply auto-fixes.
```

---

## Step 5: Skip Mechanism

### 5.1 Skip File

Create `.ci-lint-skip` in project root to bypass checks:

```bash
touch .ci-lint-skip
git push  # Will bypass CI lint
rm .ci-lint-skip  # Re-enable checks
```

### 5.2 Per-Line Escape Hatches

Use inline comments to disable specific rules:

| Linter | Escape Pattern |
|--------|---------------|
| flake8 | `# noqa: E501` |
| eslint | `// eslint-disable-next-line no-console` |
| mypy | `# type: ignore` |
| pylint | `# pylint: disable=line-too-long` |
| prettier | `// prettier-ignore` |

---

## Integration Points

### Pre-Flight Check

Add to `hooks/pre-flight-check.js`:

```javascript
{
  name: 'CI Lint Tools',
  check: async () => {
    const { createPreFlightCheck } = require('../lib/ci/package-enforcer');
    return createPreFlightCheck(projectPath)();
  }
}
```

### Build-and-Test Stage

Add to `rules/construction/build-and-test.md`:

```markdown
## Step 2.5: CI Lint Validation (Optional)

If CI configuration detected and linters installed:

1. Run all detected linters
2. Block on failures
3. Provide fix suggestions
```

### Hooks Configuration

Add to `.claude/hooks.json`:

```json
{
  "name": "ci-lint-hook",
  "event": "pre-tool-use",
  "script": "hooks/ci-lint-hook.js",
  "tools": ["Bash"],
  "pattern": "git push",
  "description": "Runs CI linting checks before push"
}
```

---

## User Skill

Invoke manually with `/ci-lint`:

```bash
/ci-lint           # Run all CI linting checks
/ci-lint --fix     # Run and auto-fix issues
/ci-lint --install # Install missing linters
/ci-lint --linter=eslint  # Run specific linter
```

---

## Best Practices

1. **Keep CI and Local Config in Sync**: Use shared config files
2. **Run Early, Run Often**: Don't wait for push to lint
3. **Auto-Fix Where Possible**: Use formatters (black, prettier)
4. **Don't Skip Without Reason**: Document why skip was needed
5. **Update When CI Changes**: Re-run detection after CI config changes

---

## Troubleshooting

### Linter Not Detected

1. Check CI config syntax is valid
2. Verify linter step uses recognizable command
3. Add explicit linter to `guidelines/linting-rules.json`

### False Positives

1. Use escape hatches for intentional violations
2. Update linter config to exclude false positive patterns
3. Report issue for AICodePath lint detection improvement

### Performance Issues

1. Run linters only on changed files (default behavior)
2. Use incremental mode where supported
3. Skip expensive linters in pre-push, run in CI only

---

## References

- Lint Registry: `lib/ci/lint-registry.js`
- Config Parser: `lib/ci/config-parser.js`
- Package Enforcer: `lib/ci/package-enforcer.js`
- CI Lint Hook: `hooks/ci-lint-hook.js`
- Linting Rules: `guidelines/linting-rules.json`
- CI Lint Skill: `skills/ci-lint.json`
