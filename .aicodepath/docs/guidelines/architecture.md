# Guidelines — Architecture & API Design

Covers: `architecture-rules.json`, `api-design-rules.json`

---

## architecture-rules.json

**File:** `.aicodepath/guidelines/architecture-rules.json`
**Description:** Structural patterns and layer separation rules to enforce clean architecture.

**Categories and key rules:**

### layer-separation
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-db-in-controller` | error | Controllers must not contain DB queries — use repositories |
| `no-business-logic-in-db` | error | DB layer must not contain business logic |
| `no-http-in-service` | error | Service layer must not reference HTTP request/response objects |
| `repository-pattern` | warning | Data access must go through repository interfaces |

**Rationale:** Clean architecture requires strict layer boundaries. Mixing layers creates tight coupling and makes testing impossible.

### dependencies
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `dependency-inversion` | warning | High-level modules depend on abstractions, not implementations |
| `no-cross-service-db-access` | error | Services must not directly query other services' DB tables |
| `interface-over-class` | info | Depend on interfaces where possible for testability |

### patterns
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `factory-pattern-required` | info | Complex object creation should use factory |
| `singleton-anti-pattern` | warning | Avoid singletons for stateful services (use DI) |
| `observer-pattern` | info | Use event emitters for cross-component communication |

### microservices (when applicable)
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-shared-db` | error | Each service must own its data store |
| `api-gateway-required` | warning | External calls must go through API gateway |
| `circuit-breaker-required` | info | External service calls need circuit breaker |

**Applied to:** Service files, controller files, repository files
**Excluded from:** Test files, scripts

---

## api-design-rules.json

**File:** `.aicodepath/guidelines/api-design-rules.json`
**Description:** REST and GraphQL API design standards for consistency and maintainability.

**Categories and key rules:**

### rest-conventions
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `resource-naming` | warning | Resources must be plural nouns (`/users`, not `/user`) |
| `http-methods` | error | Use correct HTTP verbs (GET=read, POST=create, PUT=replace, PATCH=update, DELETE=remove) |
| `status-codes` | warning | Use correct HTTP status codes (200/201/204/400/401/403/404/409/422/500) |
| `no-verbs-in-url` | warning | Avoid verbs in REST URLs (`/getUser` → `/users/{id}`) |

### error-responses
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `error-response-structure` | warning | Error responses must follow RFC 7807 Problem Details or consistent structure |
| `error-codes-required` | info | Errors should include a machine-readable `code` field |
| `validation-errors-detailed` | info | 422 responses should specify which fields failed |

### versioning
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `api-versioning-required` | warning | Public APIs must be versioned (URL prefix or header) |
| `no-breaking-changes` | error | Breaking changes require version bump |

### pagination
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `pagination-required` | warning | List endpoints returning unbounded results must paginate |
| `cursor-pagination-preferred` | info | Cursor-based pagination preferred over OFFSET for large datasets |

### security
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `auth-required` | error | Non-public endpoints must require authentication |
| `rate-limiting` | warning | Public endpoints should have rate limiting |
| `input-validation` | error | All input must be validated before processing |
| `cors-configuration` | warning | CORS must be explicitly configured (not `*` in production) |

### documentation
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `openapi-spec-required` | info | API endpoints should have OpenAPI documentation |
| `example-responses` | info | API docs should include example request/response |

**Applied to:** Controller files, route files, handler files
**File patterns:** `*controller*`, `*routes*`, `*handler*`, `*endpoint*`, `*api*`
