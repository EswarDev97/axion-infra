# Guidelines — Data & Security

Covers: `data-modeling-rules.json`, `database-operations-rules.json`, `security-rules.json`

---

## data-modeling-rules.json

**File:** `.aicodepath/guidelines/data-modeling-rules.json`
**Description:** Schema design, data modeling, and normalization rules for relational and NoSQL databases.

**Categories and key rules:**

### schema-design
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `primary-key-required` | error | Every table must have a primary key |
| `no-select-star` | warning | Avoid `SELECT *` — specify columns explicitly |
| `index-on-foreign-keys` | warning | Foreign key columns must be indexed |
| `enum-vs-varchar` | info | Use enum types for fixed value sets |
| `timestamp-columns` | info | Entities should have `created_at` and `updated_at` columns |

### normalization
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-repeated-groups` | warning | First normal form — no repeating groups in columns |
| `no-transitive-deps` | info | Third normal form — no transitive dependencies |

### migrations
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `reversible-migrations` | warning | Migrations should include rollback steps |
| `no-destructive-without-backup` | error | Dropping tables/columns must have prior backup step |
| `migration-naming` | info | Migration files must follow `NNN_description.sql` naming |

**Applied to:** Migration files, schema files, entity files, model files
**File patterns:** `*migration*`, `*.sql`, `*schema*`, `*entity*`, `*model*`

---

## database-operations-rules.json

**File:** `.aicodepath/guidelines/database-operations-rules.json`
**Description:** Runtime database usage patterns — connection pooling, query discipline, service account governance, and transaction lifecycle.

**Categories and key rules:**

### connection-pooling
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `pooling-required` | error | Connection pooling must be configured — never create a new DB connection per request |
| `pool-size-explicit` | error | Connection pool must declare explicit min/max limits |
| `pool-timeout-required` | error | Pool must configure connection timeout and idle timeout |
| `no-connection-in-handler` | error | Do not create a new DB connection inside a request handler |

### query-discipline
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-n-plus-one` | warning | N+1 query patterns must be eliminated |
| `no-unbounded-queries` | error | Queries on large tables must have LIMIT or WHERE clause |
| `prepared-statements` | error | Parameterized queries required — no string concatenation in SQL |
| `transaction-required-for-multi` | warning | Multiple related writes must be wrapped in a transaction |

### service-accounts
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `least-privilege-db-user` | warning | DB user should have only required permissions (not superuser) |
| `no-root-db-access` | error | Application must not connect as DB root/admin user |

**Applied to:** Repository files, service files, data access objects
**File patterns:** `*repository*`, `*service*`, `*.dao.*`, `*query*`

---

## security-rules.json

**File:** `.aicodepath/guidelines/security-rules.json`
**Description:** Security rules to prevent common vulnerabilities — OWASP Top 10 and more.

**Categories and key rules:**

### secrets
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-hardcoded-secrets` | error | No hardcoded passwords, API keys, tokens, or private keys |
| `no-env-in-code` | error | Do not read `.env` files in code — use `process.env` |

**Detection pattern:** `(password|secret|api_key|token|auth_token|private_key)[:=]['"][A-Za-z0-9+/=_-]{12,}['"]`

**Safe patterns (not flagged):**
- `password: '${process.env.DB_PASS}'`
- `password: process.env.DB_PASS`
- `password: '<placeholder>'`

### injection
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-sql-injection` | error | SQL queries must use parameterized queries, not string concatenation |
| `no-command-injection` | error | Shell commands must not include user input directly |
| `no-path-traversal` | error | File paths must be validated/sanitized before use |
| `no-template-injection` | warning | Template rendering must sanitize input |

### authentication
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `jwt-validation-required` | error | JWTs must be validated (signature, expiry, issuer) before trusting claims |
| `no-jwt-in-url` | warning | JWT tokens must not appear in URL parameters |
| `session-httponly` | error | Session cookies must have HttpOnly flag |
| `session-secure` | error | Session cookies must have Secure flag in production |

### authorization
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `check-authorization` | error | Every protected resource must verify the requester has permission |
| `no-idor` | error | Resource IDs in requests must be validated against the requesting user |

### input-validation
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `validate-all-input` | error | All user-supplied input must be validated before use |
| `sanitize-html` | error | HTML output must be escaped/sanitized (prevent XSS) |

### transport
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `https-required` | error | All external communications must use HTTPS |
| `cors-restrict` | warning | CORS must not use wildcard `*` in production |
| `hsts-required` | info | Production servers should set HSTS headers |

**Applied to:** All files (`languages: ["*"]`)
**Special exclusions:** Only excludes obvious test fixture patterns
