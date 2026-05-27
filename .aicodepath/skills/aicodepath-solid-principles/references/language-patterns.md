# Language-Specific SOLID Violation Signals

## Value Objects (DIP + SRP Support)

Raw primitives as domain concepts scatter validation across the codebase — a subtle DIP/SRP violation. Wrap them:

```typescript
// BAD: scattered validation, no type safety
function createOrder(userId: string, email: string, amount: number) {}

// GOOD: validation lives in one place, type-safe at boundaries
class UserId { constructor(readonly value: string) { if (!value) throw new Error('UserId required'); } }
class Email { constructor(readonly value: string) { if (!/^.+@.+/.test(value)) throw new Error('Invalid email'); } }
class Money { constructor(readonly amount: number, readonly currency: string) { if (amount < 0) throw new Error('Negative money'); } }

function createOrder(userId: UserId, email: Email, total: Money) {}
```

Mandatory for: IDs, emails, money/amounts, dates, status enums, phone numbers, URLs.

---

## TypeScript / JavaScript

- **SRP**: barrel `index.ts` re-exporting 20+ symbols = deep coupling hidden by re-exports
- **OCP**: `if (type === 'A') ... else if (type === 'B')` chains in service classes
- **DIP**: manual `new ConcreteClass()` in service/controller code vs DI container usage

```bash
# Find barrel export bloat
grep -rn "export \*" --include="*.ts" | awk -F: '{print $1}' | sort | uniq -c | sort -rn

# Find OCP violations in TypeScript services
grep -rn "if.*type.*===\|switch.*type" --include="*.service.ts"
```

---

## Java

- **SRP**: "util" and "helper" packages are SRP red flags — often hold unrelated static methods
- **OCP**: `instanceof` chains in service methods = new variant requires modifying existing code
- **ISP**: large interfaces (> 7 methods) rarely match a single caller's full needs

```bash
# Find instanceof chains (OCP risk) — excluding test files
grep -rn "instanceof" --include="*.java" | grep -v "test\|Test\|spec\|Spec"
```

---

## Python

- **SRP**: `@dataclass` classes with methods beyond `__post_init__` have mixed responsibilities
- **ISP**: `isinstance()` chains in function bodies = fat interface or missing protocol
- **DIP**: abstract base classes via `abc.abstractmethod`; duck typing can hide concrete coupling
- Verify protocol compliance — implementors should satisfy all abstract methods

---

## Go

- **ISP**: interfaces > 3 methods are an idiomatic smell — Go interfaces should be 1–3 methods
- **ISP**: struct embedding exposes all embedded methods = unintended fat interface
- **LSP**: prefer explicit delegation over embedding for safer behavioral contracts
- **DIP**: package-level coupling via concrete imports (not interface imports) is the primary concern

---

## PHP

- **SRP**: traits with > 2 responsibilities mask violations — traits should be single-purpose mixins
- **ISP/DIP**: examine interface implementations and namespace organisation for bloat
