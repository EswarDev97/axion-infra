# aicodepath-typescript-expert

## When to Use

Invoke when writing or reviewing TypeScript code in any context — backend services, frontend components, CLI tools, or library packages. Triggered automatically when `tsconfig.json` is detected, or when the task involves `.ts`/`.tsx` files, strict type annotations, discriminated unions, or TypeScript 5.x features.

## What It Does

- Configures strict `tsconfig.json`: `"strict": true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noImplicitReturns`
- Designs expressive type hierarchies: discriminated unions over class inheritance, branded primitives for domain safety, `satisfies` operator for type-safe literals
- Eliminates `any`/`unknown` escapes: proper type narrowing with type guards, assertion functions, and `as const` patterns
- Applies TypeScript 5.x features: `const` type parameters, variadic tuple types, template literal types, and `infer` in conditional types
- Generates type-safe test patterns: typed mock factories, generic test helpers, and typed `vi.mocked()`/`jest.mocked()` usage
- Flags anti-patterns: type assertions without guards, enums (use const unions instead), implicit `any` from untyped imports, and widened return types

## Example Invocations

- "Design a discriminated union for this API response type with exhaustive narrowing"
- "Review this TypeScript service for any/unknown escapes and strict mode violations"
- "Write typed utility functions for this domain model with branded primitive IDs"

## Output Format

TypeScript source files with:
- Zero `any` — all types explicit or inferred from `satisfies`/`as const`
- `tsc --noEmit --strict` clean with no suppressions
- Discriminated unions with exhaustive `switch` using `assertNever`
- Branded type aliases for domain primitives (`type UserId = string & { _brand: 'UserId' }`)
- JSDoc on all exported types with `@example` blocks

## Related Agents

- `aicodepath-react-expert` — React component typing, props interfaces, and typed hooks
- `aicodepath-nextjs-expert` — Next.js TypeScript conventions, typed route handlers, and Server Action types
- `aicodepath-backend-architect` — TypeScript service architecture, typed repository patterns, and domain modeling
