# Example Output — classify-component

## Invocation
```
Invoking /aicodepath-classify-component for: "Vehicle Market Evaluator — new feature to compare vehicle prices"
```

## Expected Output

```
Classified component types: [database, api, service, test, security]

Loaded guidelines:
- data-modeling-rules.json (database)
- database-operations-rules.json (database)
- api-design-rules.json (api)
- architecture-rules.json (service)
- security-rules.json (security)
- testing-standards.json (test)

## Design Validation Checklist
### Component types: database, api, service, security, test

#### Database Schema (data-modeling-rules)
- [ ] [ERROR] lookup-table-naming: Do ALL lookup/reference tables use the lkp_ prefix?
- [ ] [ERROR] prefer-lookup-over-constraints: Use lkp_* tables not CHECK constraints?
- [ ] [ERROR] no-enum-columns: Avoid ENUMs — use lkp_* tables?
- [ ] [ERROR] primary-key-required: Every table has a primary key?
- [ ] [WARNING] no-array-columns: No array columns — use junction tables?
- [ ] [WARNING] no-csv-values: No comma-separated values in columns?
- [ ] [ERROR] no-triggers: No database triggers — logic in app layer?
- [ ] [ERROR] no-sa-accounts: Dedicated service accounts (not postgres/root)?

#### Database Operations (database-operations-rules)
- [ ] [ERROR] pool-required: Does the design use a connection pool — not a new connection per request?
- [ ] [ERROR] pool-size-bounded: Are explicit min/max connection counts specified for the pool?
- [ ] [WARNING] pool-timeout-configured: Are idle timeout and connection timeout configured on the pool?
- [ ] [ERROR] dedicated-service-account: Does each service use a dedicated DB account?
- [ ] [ERROR] least-privilege-per-service: Are permissions granted per schema at minimum privilege?
- [ ] [ERROR] no-shared-credentials-across-services: Are DB credentials unique per service boundary?
- [ ] [ERROR] parameterized-queries-only: Are all queries parameterized — no string-interpolated SQL?
- [ ] [ERROR] pagination-on-lists: Do all list queries include pagination (LIMIT/OFFSET or cursor)?
- [ ] [ERROR] batch-over-loop: Are bulk operations batched — no per-item queries in loops?
- [ ] [ERROR] short-transactions: Are transactions free of external I/O?
- [ ] [ERROR] no-nested-transactions: Are transaction boundaries flat?

#### API (api-design-rules)
- [ ] [WARNING] endpoint-kebab-case: All paths in kebab-case?
- [ ] [WARNING] no-verbs-in-url: No verbs in URL paths?
- [ ] [ERROR] no-sensitive-in-response: No passwords/tokens in responses?
- [ ] [ERROR] no-auth-in-query: Auth tokens in headers, not query params?
- [ ] [ERROR] no-wildcard-cors: Specific CORS origins, not wildcard?
- [ ] [ERROR] no-200-for-errors: Correct HTTP status codes for errors?

#### Service (architecture-rules)
- [ ] [WARNING] controller-no-db: Controllers call services, not DB directly?
- [ ] [ERROR] no-circular-deps: No circular module dependencies?
- [ ] [ERROR] no-nested-transactions: No nested transaction boundaries?
- [ ] [ERROR] no-env-access-in-domain: Domain logic doesn't read process.env?

#### Security (security-rules)
- [ ] [ERROR] hash-passwords: Passwords hashed with bcrypt/argon2?
- [ ] [ERROR] no-trust-client-role: Roles from token/DB, never from client?
- [ ] [ERROR] no-sensitive-logging: No PII/secrets in logs?
- [ ] [ERROR] no-stack-trace-response: Stack traces not returned to clients?
- [ ] [ERROR] anti-mass-assignment: Request body fields whitelisted before DB write?

#### Test (testing-standards)
- [ ] [INFO] minimum-coverage: Coverage thresholds specified (70% lines)?
- [ ] [WARNING] mock-external-services: External services mocked in unit tests?
- [ ] [INFO] arrange-act-assert: Tests follow AAA structure?

## Recommended Agents
### Component types: database, api, service, security, test

#### Design Phase
- ⟶ **aicodepath-database-architect** — Schema and migration decisions
- ⟶ **aicodepath-architect** — Component boundaries, system design
- ⟶ **aicodepath-security-engineer** — Threat modeling, auth design
- ⟶ **aicodepath-api-designer** — API contract and versioning
- ⟶ **aicodepath-codebase-pattern-finder** — Brownfield pattern discovery

#### Plan Phase
- ⟶ **aicodepath-security-engineer** — Threat modeling, auth design
- ⟶ **aicodepath-plan-critic** — Plan quality gate — clarity, feasibility, value
- ⟶ **aicodepath-plan-analyst** — Effort estimation, risk, task sequencing
- ⟶ **aicodepath-test-engineer** — TDD strategy, coverage

#### Construction Phase
- ⟶ **aicodepath-performance-engineer** — Query optimization, indexing
- ⟶ **aicodepath-code-reviewer** — Code review before commit
- ⟶ **aicodepath-test-engineer** — TDD strategy, coverage
- ⟶ **aicodepath-qa** — Quality gates, coverage enforcement
```
