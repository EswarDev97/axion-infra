# Acceptance Criterion Examples

Sample acceptance tables for common tech stacks. Copy and adapt these into your design docs.

---

## TypeScript / Node.js

| # | Criterion | Measurable |
|---|-----------|------------|
| 1 | TypeScript compiles clean | `npx tsc --noEmit` → exit 0 |
| 2 | All tests pass | `npm test` → exit 0 |
| 3 | No console.log in production code | `grep -r "console\.log" src/ --include="*.ts" --exclude-dir="__tests__"` → 0 lines |
| 4 | ESLint clean | `npx eslint src/` → exit 0 |
| 5 | No TODO comments left | `grep -r "TODO\|FIXME\|HACK" src/` → 0 lines |
| 6 | Bundle size under limit | `wc -l dist/bundle.js` → < 5000 lines |

---

## Python / FastAPI

| # | Criterion | Measurable |
|---|-----------|------------|
| 1 | No syntax errors | `python -m py_compile src/**/*.py` → exit 0 |
| 2 | Tests pass | `pytest tests/ -q` → exit 0 |
| 3 | No wildcard CORS | `grep -r 'allow_origins=\["\*"\]' services/` → 0 lines |
| 4 | No create_async_engine in service DB files | `grep -r "create_async_engine" services/*/app/database.py` → 0 lines |
| 5 | Migrations file exists | file `alembic/versions/` exists |
| 6 | Old handler removed | file `src/handlers/legacy.py` must not exist |

---

## React / Frontend

| # | Criterion | Measurable |
|---|-----------|------------|
| 1 | Build succeeds | `npm run build` → exit 0 |
| 2 | No TypeScript errors | `npx tsc --noEmit` → exit 0 |
| 3 | No unused imports (lint) | `npx eslint src/ --rule 'no-unused-vars: error'` → exit 0 |
| 4 | Accessibility scan passes | `npx axe-cli http://localhost:3000` → exit 0 |
| 5 | Bundle under 250KB | `wc -c dist/assets/index.*.js` → < 256000 |
| 6 | No inline styles | `grep -r 'style={{' src/components/` → 0 lines |

---

## Go

| # | Criterion | Measurable |
|---|-----------|------------|
| 1 | Builds clean | `go build ./...` → exit 0 |
| 2 | All tests pass | `go test ./...` → exit 0 |
| 3 | No race conditions | `go test -race ./...` → exit 0 |
| 4 | Vet passes | `go vet ./...` → exit 0 |
| 5 | No TODO left | `grep -r "TODO\|FIXME" ./ --include="*.go"` → 0 lines |

---

## Infrastructure / DevOps

| # | Criterion | Measurable |
|---|-----------|------------|
| 1 | Terraform validates | `terraform validate` → exit 0 |
| 2 | No hardcoded secrets in Helm values | `grep -r "password:\|secret:" helm/values*.yaml` → 0 lines |
| 3 | Docker image builds | `docker build -t app:test .` → exit 0 |
| 4 | Compose file valid | `docker compose config` → exit 0 |
| 5 | Health endpoint exists | file `infra/health-check.sh` exists |

---

## General Patterns

| Pattern | Example Measurable |
|---------|-------------------|
| No pattern X in codebase | `grep -r "pattern" src/` → 0 lines |
| Command exits successfully | `some-command --flag` → exit 0 |
| File was created | file `path/to/file.ext` exists |
| File was deleted | file `path/to/old-file.ext` must not exist |
| File is small enough | `wc -l path/to/file.ts` → < 200 lines |
| Directory exists | file `path/to/dir/` exists (use test -d) |
| At least one match found | `grep -r "pattern" src/` → ≥1 lines |
