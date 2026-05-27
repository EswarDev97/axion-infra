# TypeScript Testing

Reference guide for testing TypeScript code with Vitest/Jest.

## Vitest / Jest Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { formatUser } from '../src/user.utils';

describe('formatUser', () => {
  it('returns full name from first and last', () => {
    expect(formatUser({ first: 'Alice', last: 'Smith' })).toBe('Alice Smith');
  });

  it('trims whitespace', () => {
    expect(formatUser({ first: '  Alice  ', last: 'Smith' })).toBe('Alice Smith');
  });
});
```

## Mocking

Use `vi.fn()` (Vitest) or `jest.fn()` for function mocks; inject dependencies, do not spy on globals:

```typescript
const mockRepo = {
  findById: vi.fn().mockResolvedValue({ id: '1', name: 'Alice' }),
};

const service = new UserService(mockRepo as UserRepository);
const user = await service.getUser('1');
expect(mockRepo.findById).toHaveBeenCalledWith('1');
```

## Type Testing

Use `expectTypeOf` (Vitest) to assert type-level contracts:

```typescript
import { expectTypeOf } from 'vitest';
expectTypeOf(formatUser).toBeFunction();
expectTypeOf(formatUser).returns.toBeString();
```

## React Testing Library (RTL)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../src/Button';

it('calls onClick when clicked', () => {
  const handler = vi.fn();
  render(<Button label="Save" onClick={handler} />);
  fireEvent.click(screen.getByText('Save'));
  expect(handler).toHaveBeenCalledOnce();
});
```

## Coverage

Run with coverage: `npx vitest run --coverage`. Aim for ≥80% on business logic; skip generated code.
