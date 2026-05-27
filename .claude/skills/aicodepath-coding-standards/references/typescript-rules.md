# TypeScript Strict Mode Rules

Detailed TypeScript enforcement rules for AICodePath projects.

## Required tsconfig.json Configuration

```json
{
  "compilerOptions": {
    "strict": true
    // Do NOT override individual strict flags to false
  }
}
```

## Strict Mode Rules (Enforced)

| Rule | Severity | What it catches |
|------|----------|----------------|
| `no-ts-ignore` | ERROR | `@ts-ignore` — use `@ts-expect-error` instead |
| `no-ts-nocheck` | ERROR | `@ts-nocheck` — never disable file-level checking |
| `no-double-type-assertion` | ERROR | `as unknown as T` — bypasses all type safety |
| `no-as-any` | ERROR | `as any` — use proper type guards |
| `no-definite-assignment-abuse` | WARNING | `prop!: Type` — initialize in constructor instead |
| `no-type-assertion-object` | WARNING | `as {}` or `as object` — use proper interfaces |
| `require-strict-tsconfig` | WARNING | Missing `strict: true` in tsconfig.json |

## Type Suppression

```typescript
// WRONG — stale suppressions persist silently
// @ts-ignore
const value = riskyCall();

// CORRECT — errors when the suppressed issue is fixed
// @ts-expect-error: riskyCall returns untyped legacy data
const value = riskyCall();
```

## Type Assertion Escape Hatches

```typescript
// WRONG — bypasses all type safety
const user = data as unknown as User;
const config = rawData as any;
const item = response as {};

// CORRECT — use type guards for runtime safety
function isUser(data: unknown): data is User {
  return typeof data === 'object' && data !== null && 'id' in data;
}

if (isUser(data)) {
  const user = data;  // TypeScript narrows the type
}

// CORRECT — use unknown with narrowing
const config: unknown = rawData;
if (typeof config === 'object' && config !== null) {
  // safely access properties
}
```

## Class Property Initialization

```typescript
// WRONG — bypasses strictPropertyInitialization
class UserService {
  private db!: Database;         // definite assignment assertion
  private cache!: CacheService;  // bypasses safety check
}

// CORRECT — initialize in constructor
class UserService {
  private db: Database;
  private cache: CacheService;

  constructor(db: Database, cache: CacheService) {
    this.db = db;
    this.cache = cache;
  }
}

// ALSO CORRECT — use optional or default values
class UserService {
  private cache?: CacheService;  // explicitly optional
  private retries = 3;           // default value
}
```

## Strict Flags Reference

`strict: true` enables all of the following. **Do NOT override any to false**:

| Flag | What it enforces |
|------|-----------------|
| `noImplicitAny` | All variables/params must have explicit or inferred types |
| `strictNullChecks` | `null` and `undefined` are distinct types, must be handled explicitly |
| `strictFunctionTypes` | Function parameter types are checked contravariantly |
| `strictBindCallApply` | `bind`, `call`, `apply` are strictly typed |
| `strictPropertyInitialization` | Class properties must be initialized or assigned in constructor |
| `noImplicitThis` | `this` must have an explicit type annotation |
| `alwaysStrict` | Emit `"use strict"` in all generated JavaScript |
