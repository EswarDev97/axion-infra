---
name: aicodepath-coding-standards
description: >
  Reference skill loaded when writing code. Use when the user asks about naming conventions, code structure, import ordering, mock detection rules, or any AICodePath coding standard. Triggered by: "coding standards", "naming rules", "how should I name", "mock detection", code review feedback.
user-invocable: false
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: ""
disable-model-invocation: false
---

# Coding Standards for AICodePath

**Purpose**: Load this skill during code generation to enforce AICodePath coding standards.

**Note**: Invoke explicitly with `/coding-standards` when generating code.

---

## Naming Conventions

| Element | Convention | Severity | Example |
|---------|-----------|----------|---------|
| Classes | PascalCase | ERROR | `UserService`, `PaymentProcessor` |
| Interfaces | PascalCase (opt. `I` prefix) | ERROR | `UserRepository`, `IUserRepository` |
| Functions/Methods | camelCase | ERROR | `calculateTotal()`, `getUserById()` |
| Variables | camelCase | ERROR | `userName`, `orderItems` |
| Constants | SCREAMING_SNAKE_CASE | WARNING | `MAX_RETRIES`, `API_BASE_URL` |
| Private fields | `_prefix` or `private` keyword | WARNING | `private _id`, `private password` |

---

## Structure Rules

- **One class/interface per file** — file name matches class/interface name
- **Index.ts for barrel exports only**
- **Imports ordered**: External → Internal (`@/`) → Relative (`../`, `./`), blank line between groups
- **Functions**: max 50 lines (`// aicodepath: allow-long-function` to override)
- **Classes**: max 300 lines (exception: generated code, DTOs)

---

## Code Quality Rules

| Rule | Severity | Pattern Blocked |
|------|----------|----------------|
| No console.log in production | ERROR | `console.log()` in non-test files |
| No hardcoded secrets | CRITICAL | `password =`, `api_key =`, `token =` with literal values |
| No TODO comments | WARNING | `// TODO:` (use issue tracker instead) |
| No stub implementations | ERROR | `throw new Error('Not implemented')`, `return null` stubs |
| No always-true validation | CRITICAL | `function validate() { return true; }` |

---

## Mock Implementation Detection

**MANDATORY**: Load [`references/mock-detection.md`](references/mock-detection.md) before writing any service, repository, or validation code.

Quick reference — these patterns are **blocked** in production code:
- `throw new NotImplementedError()` / `return null` stubs
- Hardcoded test data arrays (`[{ id: 1, email: 'test@...' }]`)
- Always-returning validation (`return true;`)
- Artificial delays (`await sleep(1000)`)

**Allowed in**: `*.test.ts`, `*.spec.ts`, `__tests__/`, `__mocks__/`

---

## TypeScript Strict Mode

All TypeScript projects **MUST** have `"strict": true` in `tsconfig.json`.

**MANDATORY**: Load [`references/typescript-rules.md`](references/typescript-rules.md) when writing TypeScript or reviewing tsconfig.

Quick rules (full details in reference):
- Use `@ts-expect-error` not `@ts-ignore`
- Never `as any` or `as unknown as T` — use type guards
- Never `prop!: Type` — initialize in constructor
- Never disable individual strict flags

---

## Escape Hatches

```typescript
// aicodepath: allow-stub      — intentional plugin architecture
// aicodepath: allow-mock      — development seed data
// aicodepath: allow-long-function — justified complex function
```

---

## NEVER

- **NEVER** use `@ts-ignore` when `@ts-expect-error` is available — `@ts-ignore` silences errors even after the underlying issue is fixed, letting stale suppressions accumulate until a future refactor reveals a cascade of hidden type errors. `@ts-expect-error` fails loudly when the suppressed error no longer exists.
- **NEVER** place multiple classes in a single file even temporarily — "I'll split it later" never happens. The second class inevitably gets used directly from the combined file, creating hidden coupling that makes the eventual split a refactor touching 15+ import sites.
- **NEVER** write a validation function that always returns `true` as a placeholder — a validation stub that passes everything is indistinguishable from working validation to callers. Data will flow through unchecked, tests will pass, and real invalid data will reach the database.
- **NEVER** use `as any` to work around a type error — it disables type-checking for the entire expression and all downstream uses. Find the actual type mismatch; if the API is untyped, use `unknown` with a type guard.
- **NEVER** commit `console.log` in production paths even as "temporary" debugging — logs that reach production contain user data, internal paths, and timing. A log committed "temporarily" typically lives for years.
- **NEVER** use `SCREAMING_SNAKE_CASE` for non-constants — naming conventions are machine-checkable contracts. Misusing them breaks automated linting and misleads readers into thinking mutable state is immutable.

---

## Summary Checklist

- [ ] Class PascalCase, functions camelCase, constants SCREAMING_SNAKE_CASE
- [ ] No `console.log()` in production; no hardcoded secrets; no `// TODO:`
- [ ] No stub/placeholder implementations — see [`references/mock-detection.md`](references/mock-detection.md)
- [ ] Imports: external → internal → relative, blank line between groups
- [ ] One class per file; functions ≤50 lines
- [ ] TypeScript: `strict: true` enabled — see [`references/typescript-rules.md`](references/typescript-rules.md)
- [ ] No `@ts-ignore`; no `as any`; no `prop!:` abuse

---

**Usage**: Load with `/coding-standards` before code generation to enforce these rules.
