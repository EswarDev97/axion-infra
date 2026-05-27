# Naming Conventions Reference

Detailed language conventions, common issue patterns, report format, and implementation notes.

## Naming Conventions by Language

### JavaScript/TypeScript
- Variables/functions: `camelCase`
- Classes/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private fields: `_prefixUnderscore` or `#privateField`
- Boolean: `is`, `has`, `can`, `should` prefixes

### Python
- Variables/functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private: `_prefix_underscore`
- Boolean: `is_`, `has_`, `can_` prefixes

### Java
- Variables/methods: `camelCase`
- Classes/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Packages: `lowercase`

### Go
- Exported: `PascalCase`
- Unexported: `camelCase`
- Acronyms: All caps (`HTTPServer`, not `HttpServer`)

---

## Common Naming Issues

### Too Vague
```javascript
// Bad - Too generic
function process(data) { }
const info = getData();
let temp = x;

// Good - Specific and clear
function processPayment(transaction) { }
const userProfile = getUserProfile();
let previousValue = x;
```

### Misleading Names
```javascript
// Bad - Name doesn't match behavior
function getUser(id) {
  const user = fetchUser(id);
  user.lastLogin = Date.now();
  saveUser(user); // Side effect! Not just "getting"
  return user;
}

// Good - Name reflects actual behavior
function fetchAndUpdateUserLogin(id) {
  const user = fetchUser(id);
  user.lastLogin = Date.now();
  saveUser(user);
  return user;
}
```

### Abbreviations
```javascript
// Bad - Unclear abbreviations
const usrCfg = loadConfig();
function calcTtl(arr) { }

// Good - Clear and readable
const userConfig = loadConfig();
function calculateTotal(amounts) { }

// Acceptable - Well-known abbreviations
const htmlElement = document.getElementById('main');
const apiUrl = process.env.API_URL;
```

### Boolean Naming
```javascript
// Bad - Unclear state
const login = user.authenticated;
const status = checkUser();

// Good - Clear boolean intent
const isLoggedIn = user.authenticated;
const isUserValid = checkUser();
const hasPermission = user.roles.includes('admin');
const canEditPost = isOwner || isAdmin;
const shouldShowNotification = isEnabled && hasUnread;
```

### Magic Numbers
```javascript
// Bad - Unnamed constants
if (age > 18) { }
setTimeout(callback, 3600000);

// Good - Named constants
const LEGAL_AGE = 18;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

if (age > LEGAL_AGE) { }
setTimeout(callback, ONE_HOUR_IN_MS);
```

---

## Naming Decision Tree

```
Is it a boolean?
├─ Yes → Use is/has/can/should prefix
└─ No → Is it a function?
    ├─ Yes → Use verb phrase (action)
    └─ No → Is it a class?
        ├─ Yes → Use noun (PascalCase)
        └─ No → Is it a constant?
            ├─ Yes → Use UPPER_SNAKE_CASE
            └─ No → Use descriptive noun (camelCase/snake_case)

At each step: Verify against coding-standards.json patterns
```

---

## Full Report Format Example

```markdown
# Naming Analysis Report

## Summary
- Items analyzed: 156
- Issues found: 23
- Critical: 5 (misleading names)
- Major: 12 (unclear/vague)
- Minor: 6 (convention violations)
- AICodePath Guidelines: 8 violations from coding-standards.json

---

## Critical Issues (5)

### src/services/UserService.js:45
**Current**: `getUser(id)`
**Issue**: Function name implies read-only but has side effects (updates lastLogin)
**Severity**: Critical - Misleading
**Suggestion**: `fetchAndUpdateUserLogin(id)`
**Reason**: Name should reflect the mutation
**Guideline**: N/A (semantic issue, not pattern-based)

### src/utils/helpers.js:23
**Current**: `validate(x)`
**Issue**: Generic parameter name, unclear what's being validated
**Severity**: Critical - Too vague
**Suggestion**: `validateEmail(emailAddress)`
**Reason**: Specific names improve clarity
**Guideline**: Violates `no-single-letter-vars` (coding-standards.json)

---

## Major Issues (12)

### src/components/DataList.jsx:12
**Current**: `const d = new Date()`
**Issue**: Single-letter variable in large scope
**Severity**: Major
**Suggestion**: `const currentDate = new Date()`
**Reason**: Clarity and searchability
**Guideline**: Violates `no-single-letter-vars`

---

## AICodePath Guideline Violations (8)

### Guideline: `class-pascal-case`
**Rule**: "Class names must start with an uppercase letter (PascalCase)"
**Violations**: 2
1. `src/models/userModel.js:1` - `class userModel` → `class UserModel`
2. `src/services/authService.js:5` - `class authService` → `class AuthService`

### Guideline: `no-single-letter-vars`
**Rule**: "Use descriptive variable names instead of single letters"
**Violations**: 6
1. `src/utils/helpers.js:23` - `validate(x)` → `validate(emailAddress)`
2. `src/components/DataList.jsx:12` - `const d = new Date()` → `const currentDate = new Date()`
3. `src/lib/parser.js:45` - `let i = 0` (EXCEPTION: loop counter - OK)
4. `src/api/client.js:78` - `const r = await fetch()` → `const response = await fetch()`

---

## Convention Violations

### Inconsistent Boolean Prefixes
**Issue**: Mixed use of `is`, `has`, `can` vs no prefix
**Recommendation**: Standardize on boolean prefixes
- Use `is` for state: `isActive`, `isVisible`
- Use `has` for possession: `hasPermission`, `hasError`
- Use `can` for ability: `canEdit`, `canDelete`
- Use `should` for decisions: `shouldRender`, `shouldValidate`

---

## Suggested Renaming

### High Priority (Misleading or Critical)
1. `getUser` → `fetchAndUpdateUserLogin` (src/services/UserService.js:45)
2. `validate` → `validateEmail` (src/utils/helpers.js:23)

### Medium Priority (Clarity + Guideline Violations)
1. `d` → `currentDate` (7 locations) **[coding-standards.json: no-single-letter-vars]**
2. `userModel` → `UserModel` (2 locations) **[coding-standards.json: class-pascal-case]**

### Low Priority (Convention)
1. `active` → `isActive` (12 locations)
2. `API_url` → `API_URL` (3 locations) **[coding-standards.json: constant-screaming-snake]**
```

---

## Implementation Notes

### Loading AICodePath Guidelines

1. **Locate coding-standards.json**:
   ```javascript
   const locations = [
     '.aicodepath/guidelines/coding-standards.json',
     'aicodepath-tool/.aicodepath/guidelines/coding-standards.json',
     '../aicodepath-tool/.aicodepath/guidelines/coding-standards.json'
   ];
   ```

2. **Extract naming rules**: `class-pascal-case`, `interface-pascal-case`, `constant-screaming-snake`, `function-camel-case`, `no-single-letter-vars`

3. **Apply patterns**:
   - Use regex patterns from JSON for validation
   - Check `inverse` flag (true = pattern should NOT match)
   - Map severity: error = Critical, warning = Major, info = Minor

4. **Cross-reference violations**: Link each naming issue to specific guideline ID, show guideline message alongside suggestion

### Example Guideline Mapping

```
Guideline: class-pascal-case
Pattern: ^class\s+([a-z])
Inverse: true (should NOT match lowercase)
Severity: error

Code: class userModel { }
Match: YES (lowercase 'u')
Violation: YES (inverse=true means match is bad)
Report as: CRITICAL - "Class names must start with an uppercase letter (PascalCase)"
Suggestion: class UserModel { }
```
