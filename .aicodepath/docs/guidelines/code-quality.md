# Guidelines — Code Quality

Covers: `coding-standards.json`, `linting-rules.json`, `type-design-rules.json`

---

## coding-standards.json

**File:** `.aicodepath/guidelines/coding-standards.json`
**Description:** Naming conventions, code structure, and style rules for all project files.

**Categories and key rules:**

### naming
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `class-pascal-case` | error | Classes must use PascalCase |
| `function-camel-case` | error | Functions must use camelCase |
| `const-upper-snake` | warning | Constants should use UPPER_SNAKE_CASE |
| `file-kebab-case` | warning | File names should use kebab-case |
| `interface-prefix` | warning | TypeScript interfaces should start with `I` or describe behavior |

**Languages:** JavaScript, TypeScript, Python, Java, C#

### structure
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `single-responsibility` | warning | Classes/modules should have one reason to change |
| `max-function-length` | warning | Functions > 50 lines should be split |
| `max-file-length` | info | Files > 300 lines may need splitting |
| `no-deep-nesting` | warning | Maximum 3 levels of nesting |

### imports
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `import-ordering` | info | stdlib → external → internal → relative |
| `no-circular-imports` | error | Circular dependencies must be resolved |

### comments
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `comment-why-not-what` | info | Comments must explain WHY, not WHAT |
| `no-commented-code` | warning | Commented-out code must be removed |
| `jsdoc-required` | info | Public functions must have JSDoc |

**Applied to:** All code files
**Excluded from:** `__tests__/`, `test/`, `scripts/`, `node_modules/`

---

## linting-rules.json

**File:** `.aicodepath/guidelines/linting-rules.json`
**Description:** Code style enforcement rules that complement static analysis tools.

**Categories and key rules:**

### console-usage
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-console-log` | warning | Use structured logger instead of `console.log` |
| `no-console-error` | warning | Use `logger.error()` with context object |
| `no-console-warn` | info | Use `logger.warn()` with context object |

**Exception:** Test files may use console for output.

### error-handling
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-empty-catch` | error | Empty catch blocks hide errors |
| `error-logging-required` | warning | Caught errors must be logged with context |
| `no-generic-catch` | info | Catch specific error types, not generic `Error` |

### async-patterns
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-floating-promises` | error | All promises must be awaited or handled |
| `async-error-handling` | warning | Async functions must have try/catch or `.catch()` |
| `no-sync-in-async` | info | Avoid sync I/O in async context |

### mock-detection
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-mock-in-production` | error | Stubs/mocks/fake data only in test files |
| `no-hardcoded-test-data` | warning | Production code must not have test-specific values |

**Bypass:** `// aicodepath: allow-stub` suppresses mock detection for the file.

---

## type-design-rules.json

**File:** `.aicodepath/guidelines/type-design-rules.json`
**Description:** TypeScript type usage patterns for type safety and maintainability.

**Categories and key rules:**

### safety
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `no-any` | warning | Avoid `any` type — use `unknown` or specific types |
| `no-type-assertion-abuse` | warning | Type assertions (`as Type`) should be rare |
| `no-non-null-assertion` | warning | Avoid `!` non-null assertions without guards |

### design
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `prefer-interface` | info | Prefer `interface` over `type` for object shapes |
| `discriminated-unions` | info | Use discriminated unions for variant types |
| `generic-constraints` | info | Generic type parameters should have constraints |

### nullability
| Rule ID | Severity | What it enforces |
|---------|----------|-----------------|
| `explicit-null` | warning | Return types must explicitly include `null | undefined` |
| `null-checks-required` | error | Nullable values must be checked before use |

**Languages:** TypeScript only
**Applied to:** All `.ts` and `.tsx` files
