# Link Manager - Quick Start Guide

**5-Minute Introduction to Traceability Management**

## What is Link Manager?

Link Manager tracks relationships between software artifacts:
- Requirements → Designs → Code → Tests
- Dependencies (Code → Libraries)
- Documentation (Features → Docs)

**Why It Matters**: Know what code implements which requirements, what tests cover what code, and what's orphaned.

## Installation

Already installed! Link Manager is part of `.aicodepath/lib/`.

```bash
# Verify installation
node .aicodepath/lib/link-manager.js stats
```

## Basic Commands

### 1. Create a Link

```bash
# Link requirement to design
node .aicodepath/lib/link-manager.js link requirement 1 design 2 implements

# Link design to code
node .aicodepath/lib/link-manager.js link design 2 code 3 implements

# Link code to test
node .aicodepath/lib/link-manager.js link code 3 test 10 tests
```

### 2. View Traceability Chain

```bash
# Show full chain for a requirement
node .aicodepath/lib/link-manager.js chain 1

# Output:
# Requirement: User Authentication
# Designs (1): Auth Flow Design
# Code (3): AuthService, LoginController, PasswordReset
# Tests (2): AuthService.test, Login.e2e.test
```

### 3. Check Coverage

```bash
# Check if requirement has code + tests
node .aicodepath/lib/link-manager.js coverage 1

# Output:
# Design:  ✓ (1 artifacts)
# Code:    ✓ (3 artifacts)
# Tests:   ✓ (2 artifacts)
# Overall: ✓ COMPLETE
```

### 4. Find Problems

```bash
# Find code without requirements
node .aicodepath/lib/link-manager.js orphans

# Find code without tests
node .aicodepath/lib/link-manager.js missing-tests

# View statistics
node .aicodepath/lib/link-manager.js stats
```

## Programmatic Usage

```javascript
const LinkManager = require('./.aicodepath/lib/link-manager');

const manager = new LinkManager();

// Create link
manager.createLink('requirement', 1, 'design', 2, 'implements');

// Check coverage
const coverage = manager.validateCoverage(1);
console.log(`Complete: ${coverage.is_complete}`);

// Find orphans
const orphans = manager.getOrphanedCode();
console.log(`Orphaned: ${orphans.length} files`);

manager.close();
```

## Link Types

| Type | Usage | Example |
|------|-------|---------|
| `implements` | Target implements source | Requirement → Design, Design → Code |
| `tests` | Target tests source | Code → Test |
| `documents` | Target documents source | API → Documentation |
| `depends_on` | Source depends on target | Service → Library |
| `related_to` | Generic relationship | Feature A ↔ Feature B |

## Workflow Integration

### During Design Phase

```javascript
// After creating design artifact
const manager = new LinkManager();
manager.createLink('requirement', reqId, 'design', designId, 'implements', {
  createdBy: 'design-agent'
});
manager.close();
```

### During Code Generation

```javascript
// After generating code
const manager = new LinkManager();
manager.createLink('design', designId, 'code', codeId, 'implements', {
  createdBy: 'code-gen-agent'
});
manager.close();
```

### During Test Generation

```javascript
// After generating tests
const manager = new LinkManager();
manager.createLink('code', codeId, 'test', testId, 'tests', {
  createdBy: 'test-gen-agent'
});
manager.close();
```

### Pre-Deployment Check

```bash
#!/bin/bash
# Add to CI/CD pipeline

# Check for orphaned code
ORPHANS=$(node .aicodepath/lib/link-manager.js orphans | grep -c "Orphaned Code")

if [ "$ORPHANS" -gt 0 ]; then
  echo "✗ Found orphaned code - link to requirements first"
  exit 1
fi

# Check for missing tests
MISSING=$(node .aicodepath/lib/link-manager.js missing-tests | grep -c "Missing Test")

if [ "$MISSING" -gt 0 ]; then
  echo "✗ Code missing tests - add test coverage"
  exit 1
fi

echo "✓ Traceability checks passed"
```

## Common Workflows

### 1. Link Requirement to Implementation

```bash
# Step 1: Link requirement to design
node .aicodepath/lib/link-manager.js link requirement 1 design 2 implements

# Step 2: Link design to code
node .aicodepath/lib/link-manager.js link design 2 code 3 implements

# Step 3: Link code to test
node .aicodepath/lib/link-manager.js link code 3 test 10 tests

# Step 4: Verify chain
node .aicodepath/lib/link-manager.js chain 1
```

### 2. Audit Existing Code

```bash
# Find code without requirements
node .aicodepath/lib/link-manager.js orphans

# For each orphan, either:
# - Link to a requirement: link requirement X code Y implements
# - Document as infrastructure code
# - Remove if no longer needed
```

### 3. Ensure Test Coverage

```bash
# Find code without tests
node .aicodepath/lib/link-manager.js missing-tests

# For each code file:
# - Create tests
# - Link tests: link code X test Y tests
```

### 4. Validate Before Release

```bash
# Check all requirements have code + tests
node .aicodepath/lib/link-manager.js stats

# Review incomplete requirements
node .aicodepath/lib/link-manager.js coverage 1  # Repeat for each requirement
```

## Examples

Run practical examples:

```bash
# Run all examples
node .aicodepath/lib/examples/link-manager-examples.js all

# Run specific example
node .aicodepath/lib/examples/link-manager-examples.js 3  # Pre-deployment check
node .aicodepath/lib/examples/link-manager-examples.js 4  # Orphan report
```

Available examples:
1. Basic Workflow
2. Complete Traceability Chain
3. Pre-Deployment Validation
4. Orphaned Code Report
5. Test Coverage Report
6. Dependency Graph
7. Auto-Link by Pattern
8. Requirement Impact Analysis

## Tests

Run test suite:

```bash
node .aicodepath/lib/__tests__/link-manager.test.js
```

## Best Practices

### DO
- ✓ Link artifacts as you create them (don't wait)
- ✓ Use specific link types (implements, tests, depends_on)
- ✓ Run weekly audits (orphans, missing-tests)
- ✓ Add traceability checks to CI/CD
- ✓ Add descriptions for complex links

### DON'T
- ✗ Wait until the end to create links
- ✗ Use `related_to` for everything
- ✗ Ignore orphaned code warnings
- ✗ Deploy without checking coverage

## Getting Help

1. **Quick Reference**: This file
2. **Full Documentation**: `link-manager-README.md`
3. **Code Examples**: `examples/link-manager-examples.js`
4. **Test Suite**: `__tests__/link-manager.test.js`

## Next Steps

1. **Try it**: Run `node .aicodepath/lib/link-manager.js stats`
2. **Explore**: Run `node .aicodepath/lib/examples/link-manager-examples.js all`
3. **Integrate**: Add to your workflow (design → code → test)
4. **Audit**: Run weekly checks for orphans and missing tests

## File Locations

```
.aicodepath/lib/
├── link-manager.js                      # Main library
├── link-manager-README.md               # Full documentation (20KB)
├── LINK-MANAGER-QUICKSTART.md          # This file
├── examples/
│   └── link-manager-examples.js         # Practical examples
└── __tests__/
    └── link-manager.test.js             # Test suite
```

## Common Issues

### "Artifact not found"
**Solution**: Verify artifact ID exists in database:
```javascript
const manager = new LinkManager();
const artifact = manager.db.prepare('SELECT * FROM artifacts WHERE id = ?').get(artifactId);
console.log(artifact);
manager.close();
```

### "Type mismatch"
**Solution**: Check artifact type:
```javascript
const artifact = manager.db.prepare('SELECT artifact_type FROM artifacts WHERE id = ?').get(artifactId);
```

### No links showing up
**Solution**: Verify links table:
```bash
node .aicodepath/lib/link-manager.js stats
```

## Support

For issues or questions:
1. Read full documentation: `link-manager-README.md`
2. Review examples: `examples/link-manager-examples.js`
3. Check database schema: `.aicodepath/db/schema.sql`

---

**Ready to start?** Run your first command:

```bash
node .aicodepath/lib/link-manager.js stats
```
