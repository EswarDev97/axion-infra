# TypeScript Patterns

Reference guide for idiomatic TypeScript patterns used in construction-phase development.

## Discriminated Unions

Prefer discriminated unions over optional fields — they make illegal states unrepresentable.
Use a literal `kind`/`type` field to narrow union members exhaustively:

```typescript
type Result<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: string };

function handle<T>(r: Result<T>): T {
  if (r.kind === 'ok') return r.value;
  throw new Error(r.error); // TypeScript narrows here
}
```

## Async / Error Handling

Prefer `async/await` over promise chains; wrap external calls at service boundaries:

```typescript
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<User>;
}
```

## Module Patterns

Use barrel exports for domain modules; avoid re-exporting everything:

```typescript
// auth/index.ts
export { AuthService } from './auth.service';
export type { AuthToken } from './auth.types';
```

## React Patterns

Separate data-fetching hooks from UI components; type props explicitly:

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button className={`btn-${variant}`} onClick={onClick}>{label}</button>;
}
```

## Error Handling Pattern

Create typed error classes; distinguish expected vs unexpected errors:

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```
