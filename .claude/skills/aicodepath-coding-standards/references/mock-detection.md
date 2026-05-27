# Mock Implementation Detection Reference

AICodePath blocks lazy shortcuts. These patterns trigger authenticity violations.

## Stub/Placeholder Patterns (ERROR)

```typescript
// ✗ Blocked
throw new NotImplementedError();
throw new Error('Not implemented');
async function getUserData() {
  // TODO: Implement
  return null;
}

// ✓ Correct - Real implementation
async function getUserData(id: string) {
  return await database.users.findById(id);
}
```

## Mock Data Patterns (ERROR)

```typescript
// ✗ Blocked
const users = [
  { id: 1, email: 'test@example.com' },  // Hardcoded test data
  { id: 2, email: 'user@example.com' }
];
const uuid = '12345678-1234-1234-1234-123456789012';  // Fake UUID

// ✓ Correct
const users = await database.users.findAll();
const uuid = uuidv4();  // Real UUID generation
```

## Fake Logic Patterns (CRITICAL)

```typescript
// ✗ Blocked
function validatePassword(password: string): boolean {
  return true;  // Always returns true - fake validation
}

function authenticateUser(credentials) {
  await sleep(1000);  // Artificial delay
  return { authenticated: true };  // Always succeeds
}

// ✓ Correct
function validatePassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

async function authenticateUser(credentials) {
  const user = await database.users.findByEmail(credentials.email);
  return await bcrypt.compare(credentials.password, user.passwordHash);
}
```

## Test File Exemption

Mock patterns are **allowed** in test files:
- `*.test.ts`, `*.spec.ts`, `*.test.js`, `*.spec.js`
- `__tests__/` directory
- `__mocks__/` directory

## Confidence Scoring

Code is scored on authenticity (0-100):

| Score | Status | Meaning |
|-------|--------|---------|
| **90-100** | PASS | Production-ready, real implementation |
| **70-89** | REVIEW | Minor issues, proceed with warning |
| **0-69** | FAIL | Mock/stub/placeholder code, **block write operation** |

**Penalties**:
- Stub/Placeholder: -3 to -5 per violation
- Mock Data: -5 to -8 per violation
- Fake Logic: -8 to -10 per violation

## Escape Hatches

Use sparingly when rules don't apply:

```typescript
// aicodepath: allow-stub
// This is intentional for plugin architecture
export const plugins = [];

// aicodepath: allow-mock
// Test data for development seed
const seedUsers = [{ email: 'admin@example.com' }];

// aicodepath: allow-long-function
// Complex state machine requires 80 lines
function processWorkflow(state) {
  // Long but justified implementation
}
```
