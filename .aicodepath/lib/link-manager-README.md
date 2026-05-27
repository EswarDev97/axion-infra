# Link Manager

**Purpose**: Manage requirement→design→code→test traceability links in the AICodePath knowledge base.

**Location**: `.aicodepath/lib/link-manager.js`

**Dependencies**:
- `better-sqlite3` - SQLite database access
- `path-resolver.js` - Project path resolution

## Overview

The Link Manager provides comprehensive traceability management for software artifacts. It ensures:

- **Requirements Coverage**: Every requirement has code and tests
- **Traceability Chains**: Full visibility from requirement → design → code → test
- **Orphan Detection**: Identify code without requirements
- **Test Coverage**: Track which code lacks tests

## Why Traceability Matters

**Without Traceability**:
- "Why does this code exist?" (No requirement link)
- "Is this feature tested?" (No test link)
- "What's the impact of changing this?" (Unknown dependencies)
- "Can we remove this code?" (No visibility into purpose)

**With Traceability**:
- Every code file traces back to a requirement
- Every requirement has verified implementation and tests
- Changes are impact-analyzed via dependency chains
- Dead code is detected automatically (orphans)

## Link Types

| Link Type | Direction | Meaning | Example |
|-----------|-----------|---------|---------|
| `implements` | Source → Target | Target implements source specification | Design → Code |
| `tests` | Source → Target | Target tests source | Code → Test |
| `documents` | Source → Target | Target documents source | API → Docs |
| `depends_on` | Source → Target | Source requires target | Service → Library |
| `related_to` | Source ↔ Target | Generic relationship | Feature A ↔ Feature B |
| `derived_from` | Source → Target | Source derived from target | Story → Requirement |
| `blocks` | Source → Target | Source blocks target completion | Issue → Feature |

## Database Schema

Links are stored in the `links` table:

```sql
CREATE TABLE links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,        -- FK to artifacts.id
    target_id INTEGER NOT NULL,        -- FK to artifacts.id
    link_type TEXT NOT NULL,           -- Link type (see above)
    description TEXT,                  -- Optional description
    confidence REAL DEFAULT 1.0,       -- Confidence score (0.0-1.0)
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system',
    FOREIGN KEY (source_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    UNIQUE(source_id, target_id, link_type)
);
```

**Foreign Key Cascade**: When an artifact is deleted, all its links are automatically removed.

**Unique Constraint**: Prevents duplicate links between the same artifacts with the same type.

## Installation

```bash
# Install dependency if not already present
npm install better-sqlite3

# Make CLI executable
chmod +x .aicodepath/lib/link-manager.js
```

## CLI Usage

### Create Links

```bash
# Link requirement to code
node .aicodepath/lib/link-manager.js link requirement 1 code 5 implements

# Link code to test
node .aicodepath/lib/link-manager.js link code 5 test 10 tests

# Link with description (use in code, not CLI - CLI doesn't support description param)
```

### View Links

```bash
# Show all links from a requirement
node .aicodepath/lib/link-manager.js links requirement 1

# Output:
# Links from requirement#1:
#   [implements] → code#5: UserAuthService
#     Confidence: 1.0, Created: 2026-02-02 10:30:00
#
#   [implements] → code#6: LoginController
#     Confidence: 1.0, Created: 2026-02-02 10:32:00
```

### Traceability Chains

```bash
# Show full chain for a requirement
node .aicodepath/lib/link-manager.js chain 1

# Output:
# Traceability Chain for Requirement #1:
#
# Requirement: User Authentication
#
# Stories (2):
#   - As a user, I want to log in (docs/stories/login.md)
#   - As a user, I want to reset password (docs/stories/reset.md)
#
# Designs (1):
#   - Authentication System Design (docs/design/auth-design.md)
#
# Code (3):
#   - UserAuthService (src/services/auth.service.ts)
#   - LoginController (src/controllers/login.controller.ts)
#   - PasswordResetHandler (src/handlers/password-reset.ts)
#
# Tests (2):
#   - Auth Service Tests (tests/auth.service.test.ts)
#   - Login E2E Tests (tests/e2e/login.test.ts)
```

### Coverage Validation

```bash
# Check if requirement has code + tests
node .aicodepath/lib/link-manager.js coverage 1

# Output:
# Coverage Report for: User Authentication
#
#   Design:  ✓ (1 artifacts)
#   Code:    ✓ (3 artifacts)
#   Tests:   ✓ (2 artifacts)
#
#   Overall: ✓ COMPLETE
```

### Find Orphaned Code

```bash
# List code without requirement links
node .aicodepath/lib/link-manager.js orphans

# Output:
# Orphaned Code (2):
#
#   - HelperUtils
#     File: src/utils/helpers.ts
#     Unit: shared
#     Created: 2026-01-15 14:20:00
#
#   - LegacyAdapter
#     File: src/adapters/legacy.ts
#     Unit: integration
#     Created: 2025-12-10 09:00:00
```

**Action Items**: Orphaned code should either:
1. Be linked to a requirement (if needed)
2. Be documented as infrastructure/utility code
3. Be removed (if no longer needed)

### Find Missing Test Coverage

```bash
# List code without test links
node .aicodepath/lib/link-manager.js missing-tests

# Output:
# Code Missing Test Coverage (3):
#
#   - EmailService
#     File: src/services/email.service.ts
#     Unit: notifications
#
#   - PaymentGateway
#     File: src/gateways/payment.gateway.ts
#     Unit: billing
```

### Statistics

```bash
# View link statistics
node .aicodepath/lib/link-manager.js stats

# Output:
# Link Statistics:
#
# Links by Type:
#   implements: 45 (avg confidence: 0.98)
#   tests: 38 (avg confidence: 1.00)
#   depends_on: 12 (avg confidence: 0.95)
#   related_to: 8 (avg confidence: 0.90)
#
# Artifacts by Type:
#   requirement: 15
#   design: 12
#   code: 45
#   test: 38
#
# Orphaned Code: 2
```

### Delete Links

```bash
# Delete a link by ID
node .aicodepath/lib/link-manager.js delete 23

# Output:
# ✓ Deleted link #23
```

## Programmatic Usage

### Basic Example

```javascript
const LinkManager = require('./.aicodepath/lib/link-manager');

const manager = new LinkManager();

// Create link: requirement 1 implements design 5
const link = manager.createLink('requirement', 1, 'design', 5, 'implements', {
  description: 'Authentication requirement implemented by auth design',
  confidence: 0.95,
  createdBy: 'design-agent'
});

console.log(`Created link #${link.id}`);

manager.close();
```

### Advanced Example: Workflow Integration

```javascript
const LinkManager = require('./.aicodepath/lib/link-manager');

// After code generation, link to design
function linkGeneratedCodeToDesign(designId, codeArtifactIds) {
  const manager = new LinkManager();

  for (const codeId of codeArtifactIds) {
    manager.createLink('design', designId, 'code', codeId, 'implements', {
      description: 'Auto-linked during code generation',
      createdBy: 'code-gen-agent'
    });
  }

  manager.close();
  console.log(`Linked ${codeArtifactIds.length} code artifacts to design #${designId}`);
}

// After test generation, link to code
function linkGeneratedTestsToCode(codeId, testArtifactIds) {
  const manager = new LinkManager();

  for (const testId of testArtifactIds) {
    manager.createLink('code', codeId, 'test', testId, 'tests', {
      description: 'Auto-linked during test generation',
      createdBy: 'test-gen-agent'
    });
  }

  manager.close();
  console.log(`Linked ${testArtifactIds.length} tests to code #${codeId}`);
}
```

### Example: Validate All Requirements

```javascript
const LinkManager = require('./.aicodepath/lib/link-manager');
const Database = require('better-sqlite3');

function validateAllRequirements() {
  const manager = new LinkManager();

  // Get all requirements
  const requirements = manager.db.prepare(`
    SELECT id, title FROM artifacts
    WHERE artifact_type = 'requirement' AND status = 'active'
  `).all();

  const incomplete = [];

  for (const req of requirements) {
    const coverage = manager.validateCoverage(req.id);

    if (!coverage.is_complete) {
      incomplete.push({
        id: req.id,
        title: req.title,
        issues: coverage.issues
      });
    }
  }

  manager.close();

  if (incomplete.length === 0) {
    console.log('✓ All requirements have code + tests');
  } else {
    console.log(`✗ ${incomplete.length} requirements incomplete:\n`);
    incomplete.forEach(req => {
      console.log(`  ${req.title}:`);
      req.issues.forEach(issue => console.log(`    - ${issue}`));
    });
  }
}

validateAllRequirements();
```

### Example: Bulk Link Creation

```javascript
const LinkManager = require('./.aicodepath/lib/link-manager');

const manager = new LinkManager();

// Define links in JSON
const links = [
  { source_id: 1, target_id: 10, link_type: 'implements' },
  { source_id: 1, target_id: 11, link_type: 'implements' },
  { source_id: 10, target_id: 20, link_type: 'tests' },
  { source_id: 11, target_id: 21, link_type: 'tests' }
];

const results = manager.bulkCreateLinks(links);

console.log(`Created: ${results.created}, Updated: ${results.updated}`);
if (results.errors.length > 0) {
  console.log('Errors:', results.errors);
}

manager.close();
```

## API Reference

### Constructor

```javascript
new LinkManager(projectPath = null)
```

- **projectPath**: Optional project root path. If not provided, uses `path-resolver` to find project root.

### Methods

#### createLink

```javascript
createLink(sourceTypeOrId, sourceIdOrTarget, targetTypeOrId, targetId, linkType, options)
```

Create a traceability link.

**Overloaded Signatures**:
```javascript
// Using artifact IDs directly
createLink(sourceId, targetId, linkType, options)

// Using types and IDs (recommended for type safety)
createLink(sourceType, sourceId, targetType, targetId, linkType, options)
```

**Parameters**:
- `sourceType` (string): Source artifact type
- `sourceId` (number): Source artifact ID
- `targetType` (string): Target artifact type
- `targetId` (number): Target artifact ID
- `linkType` (string): Link type (implements, tests, etc.)
- `options` (object):
  - `description` (string): Link description
  - `confidence` (number): Confidence score (0.0-1.0)
  - `createdBy` (string): Creator name

**Returns**: Link object with `id`, `source_id`, `target_id`, `link_type`, etc.

**Throws**: Error if artifacts don't exist or types don't match.

#### deleteLink

```javascript
deleteLink(id)
```

Delete a link by ID.

**Returns**: `true` if deleted, `false` if not found.

#### getLinks

```javascript
getLinks(sourceType, sourceId)
```

Get all links from a source artifact.

**Returns**: Array of link objects with artifact details.

#### getTraceabilityChain

```javascript
getTraceabilityChain(requirementId)
```

Get full traceability chain for a requirement.

**Returns**: Object with:
```javascript
{
  requirement: { id, title, file_path, ... },
  stories: [...],
  designs: [...],
  code: [...],
  tests: [...]
}
```

#### validateCoverage

```javascript
validateCoverage(requirementId)
```

Check if requirement has code + tests.

**Returns**: Coverage object:
```javascript
{
  requirement_id: 1,
  requirement_title: "User Authentication",
  has_design: true,
  has_code: true,
  has_tests: true,
  is_complete: true,
  design_count: 1,
  code_count: 3,
  test_count: 2,
  story_count: 2,
  issues: []
}
```

#### getOrphanedCode

```javascript
getOrphanedCode()
```

Find code artifacts without requirement links.

**Returns**: Array of orphaned code artifacts.

#### getMissingTestCoverage

```javascript
getMissingTestCoverage()
```

Find code artifacts without test links.

**Returns**: Array of code artifacts without tests.

#### getStatistics

```javascript
getStatistics()
```

Get link statistics.

**Returns**: Statistics object with link counts, artifact counts, and orphan count.

#### bulkCreateLinks

```javascript
bulkCreateLinks(links)
```

Bulk create links from an array.

**Parameters**:
- `links` (Array): Array of link objects with `source_id`, `target_id`, `link_type`, etc.

**Returns**: Results object:
```javascript
{
  created: 10,
  updated: 2,
  errors: []
}
```

#### close

```javascript
close()
```

Close database connection. **Always call this** when done.

## Workflow Integration

### During Design Phase

After creating design artifacts:

```javascript
const LinkManager = require('./.aicodepath/lib/link-manager');

const manager = new LinkManager();

// Link design to requirement
manager.createLink('requirement', requirementId, 'design', designId, 'implements', {
  description: 'Authentication design from requirement',
  createdBy: 'design-agent'
});

manager.close();
```

### During Code Generation

After generating code:

```javascript
const LinkManager = require('./.aicodepath/lib/link-manager');

const manager = new LinkManager();

// Link code to design
manager.createLink('design', designId, 'code', codeId, 'implements', {
  description: 'Generated from functional design',
  createdBy: 'code-gen-agent'
});

manager.close();
```

### During Test Generation

After generating tests:

```javascript
const LinkManager = require('./.aicodepath/lib/link-manager');

const manager = new LinkManager();

// Link test to code
manager.createLink('code', codeId, 'test', testId, 'tests', {
  description: 'Unit tests for UserService',
  createdBy: 'test-gen-agent'
});

manager.close();
```

### Pre-Deployment Check

Before deployment, validate coverage:

```javascript
const LinkManager = require('./.aicodepath/lib/link-manager');

function preDeploymentCheck() {
  const manager = new LinkManager();

  // Check for orphaned code
  const orphans = manager.getOrphanedCode();
  if (orphans.length > 0) {
    console.error(`✗ Found ${orphans.length} orphaned code files`);
    return false;
  }

  // Check for missing tests
  const missingTests = manager.getMissingTestCoverage();
  if (missingTests.length > 0) {
    console.error(`✗ Found ${missingTests.length} code files without tests`);
    return false;
  }

  manager.close();
  console.log('✓ All traceability checks passed');
  return true;
}

if (!preDeploymentCheck()) {
  process.exit(1);
}
```

## Best Practices

### 1. Link Early and Often

Create links as soon as artifacts are created:
- Requirement → Design: During design phase
- Design → Code: During code generation
- Code → Test: During test generation

**Don't wait** until the end to create links. It's harder to reconstruct relationships later.

### 2. Use Descriptive Link Types

Choose the most specific link type:
- Use `implements` for specification → implementation
- Use `tests` for code → test
- Use `depends_on` for explicit dependencies
- Use `related_to` only when no other type fits

### 3. Maintain Confidence Scores

Use confidence scores for:
- Auto-generated links: 0.8-0.9
- Manually verified links: 1.0
- Uncertain relationships: 0.5-0.7

### 4. Run Regular Audits

Schedule weekly checks:

```bash
# Check for orphaned code
node .aicodepath/lib/link-manager.js orphans

# Check for missing tests
node .aicodepath/lib/link-manager.js missing-tests

# View statistics
node .aicodepath/lib/link-manager.js stats
```

### 5. Validate Before Release

Add to CI/CD pipeline:

```bash
#!/bin/bash
# pre-deployment-traceability-check.sh

echo "Checking traceability..."

ORPHANS=$(node .aicodepath/lib/link-manager.js orphans | grep -c "Orphaned Code")
MISSING=$(node .aicodepath/lib/link-manager.js missing-tests | grep -c "Missing Test Coverage")

if [ "$ORPHANS" -gt 0 ]; then
  echo "✗ Found orphaned code"
  exit 1
fi

if [ "$MISSING" -gt 0 ]; then
  echo "✗ Found code without tests"
  exit 1
fi

echo "✓ Traceability checks passed"
```

### 6. Document Link Rationale

For non-obvious links, add descriptions:

```javascript
manager.createLink('code', 5, 'code', 10, 'depends_on', {
  description: 'PaymentService depends on StripeAdapter for payment processing',
  confidence: 1.0
});
```

## Troubleshooting

### "Artifact not found" Error

**Cause**: Trying to link non-existent artifacts.

**Solution**: Verify artifact IDs exist:

```javascript
const Database = require('better-sqlite3');
const db = new Database('aicodepath-docs/aicodepath.db');

const artifact = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(artifactId);
console.log(artifact);
```

### "Type mismatch" Error

**Cause**: Artifact type doesn't match expected type.

**Solution**: Check artifact type:

```javascript
const artifact = db.prepare('SELECT artifact_type FROM artifacts WHERE id = ?').get(artifactId);
console.log(`Artifact ${artifactId} is ${artifact.artifact_type}`);
```

### Circular Dependencies

**Cause**: Link chain creates a cycle (A → B → C → A).

**Solution**: The `getTraceabilityChain` method includes a depth limit (10) to prevent infinite loops. Circular dependencies indicate a design issue that should be resolved.

### Missing Links After Migration

**Cause**: Links table not populated during migration.

**Solution**: Re-index artifacts:

```bash
# Run artifact indexer to detect and create links
node .aicodepath/scripts/index-artifacts.js
```

## Performance Considerations

### Prepared Statements

The LinkManager uses prepared statements for performance:

```javascript
// Reuses compiled SQL for multiple calls
this.stmts.createLink.run(sourceId, targetId, linkType, ...);
```

### Transactions for Bulk Operations

Use `bulkCreateLinks` for multiple links:

```javascript
// Efficient: Single transaction
manager.bulkCreateLinks(links);

// Inefficient: Multiple transactions
links.forEach(link => manager.createLink(...));
```

### Indexes

The `links` table has indexes on:
- `source_id` - Fast lookup of outgoing links
- `target_id` - Fast lookup of incoming links
- `link_type` - Fast filtering by type

## Database Views

### v_requirements_traceability

Pre-built view for requirement → story → design → code → test chains:

```sql
SELECT * FROM v_requirements_traceability
WHERE requirement_id = 1;
```

Returns full chain in a single row.

## Change Log

### v1.0.0 (2026-02-02)
- Initial release
- Core link management (create, delete, query)
- Traceability chain traversal
- Coverage validation
- Orphan detection
- CLI interface

## Future Enhancements

### Planned Features

1. **Link Suggestions**: AI-powered link recommendations based on naming/content
2. **Impact Analysis**: "What code is affected if I change this requirement?"
3. **Visualization**: Generate traceability diagrams (Mermaid/GraphViz)
4. **Import/Export**: JSON import/export for link definitions
5. **Link Verification**: Automated checks for broken links (missing artifacts)

### Example: Future Link Suggestions

```javascript
// Future API
const suggestions = manager.suggestLinks(codeId);
// Returns:
// [
//   { target_id: 15, target_type: 'requirement', confidence: 0.85, reason: 'Similar naming' },
//   { target_id: 20, target_type: 'design', confidence: 0.92, reason: 'Referenced in comments' }
// ]
```

## Related Tools

- **kb-query.js**: Query knowledge base (artifacts, decisions, etc.)
- **kb-writer.js**: Write workflow state and session data
- **context-manager.js**: Manage agent context
- **agent-invoker.js**: Invoke agents for artifact generation

## Support

For issues or questions:
1. Check this README
2. Review the [AICodePath documentation](../../../docs/)
3. Examine the database schema (`.aicodepath/db/schema.sql`)
4. Contact the development team

## License

Part of the AICodePath project. See project LICENSE file.
