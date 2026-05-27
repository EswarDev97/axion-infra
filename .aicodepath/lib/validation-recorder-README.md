# Validation Recorder

A library for managing validation results and quality gate tracking in the AICodePath knowledge base.

## Overview

The Validation Recorder stores and analyzes quality gate validation results from various sources:

- **Guideline Validation**: Compliance with coding standards, architecture rules, security guidelines
- **API Design**: REST/GraphQL API design validation
- **Data Modeling**: Database schema and data structure validation
- **Architecture**: Architecture pattern compliance
- **Duplication**: Code duplication detection results
- **DevOps**: DevOps best practices and CI/CD validation
- **IaC**: Infrastructure as Code validation (Terraform, Kubernetes, Docker)
- **Security**: Security scanning results (OWASP, secrets, auth)
- **GICL**: GICL loop quality gate tracking

## Installation

```bash
# The library is part of AICodePath and requires:
npm install better-sqlite3
```

## Database Schema

The library uses the `validations` table from `aicodepath.db`:

```sql
CREATE TABLE validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artifact_id INTEGER,           -- Related artifact (optional)
    file_path TEXT,                -- File being validated
    validation_type TEXT NOT NULL, -- Type of validation
    score INTEGER,                 -- 0-100 score
    status TEXT,                   -- passed|failed|warning|skipped
    violations JSON,               -- Array of violations
    validated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
);
```

## Usage

### Programmatic Usage

```javascript
const ValidationRecorder = require('./validation-recorder');

// Initialize (automatically finds project root)
const recorder = new ValidationRecorder();

// Or specify project path explicitly
const recorder = new ValidationRecorder('/path/to/project');

// Record a validation
const validation = recorder.recordValidation(
  123,              // artifact ID (or null)
  'src/auth.js',    // file path
  'security',       // validation type
  75,               // score (0-100)
  'warning',        // status
  [                 // violations array
    {
      rule: 'password-strength',
      severity: 'medium',
      message: 'Password complexity could be improved'
    }
  ]
);

// Query validations
const byArtifact = recorder.getValidationsByArtifact(123);
const byType = recorder.getValidationsByType('security');
const summary = recorder.getValidationSummary();

// Update validation
recorder.updateValidation(validation.id, {
  score: 85,
  status: 'passed',
  violations: []
});

// Get trends
const trends = recorder.getValidationTrends(7); // Last 7 days

// Get failing files
const failing = recorder.getFailingFiles('security');

// Cleanup old records
const deleted = recorder.cleanupOldValidations(30); // Keep last 30 days

// Close database connection
recorder.close();
```

### CLI Usage

The library provides a command-line interface for manual operations:

```bash
# Record a validation
node validation-recorder.js record <artifact-id> <type> <score> <status> [file-path]

# Examples:
node validation-recorder.js record null guideline 95 passed src/index.js
node validation-recorder.js record 123 security 60 failed src/auth.js

# List validations
node validation-recorder.js list              # Show summary
node validation-recorder.js list guideline    # Filter by type
node validation-recorder.js list 123          # Filter by artifact ID

# Show validation summary
node validation-recorder.js summary           # All validations
node validation-recorder.js summary security  # Filter by type

# Show detailed validation
node validation-recorder.js show 42

# Show trends
node validation-recorder.js trends            # Last 7 days
node validation-recorder.js trends 14         # Last 14 days

# Show failing files
node validation-recorder.js failing           # All types
node validation-recorder.js failing security  # Filter by type

# Cleanup old validations
node validation-recorder.js cleanup           # Delete records older than 30 days
node validation-recorder.js cleanup 60        # Delete records older than 60 days
```

## Validation Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| `guideline` | Guidelines validation | Coding standards, architecture rules, naming conventions |
| `api` | API design rules | REST endpoints, GraphQL schemas, versioning |
| `data` | Data modeling rules | Database schemas, migrations, relationships |
| `architecture` | Architecture patterns | SOLID, DRY, layering, separation of concerns |
| `duplication` | Code duplication | Exact, near, and structural code clones |
| `devops` | DevOps best practices | CI/CD pipelines, deployment strategies |
| `iac` | Infrastructure as Code | Dockerfiles, Kubernetes manifests, Terraform |
| `security` | Security scanning | OWASP Top 10, secrets, authentication |
| `gicl` | GICL loop quality gates | Requirements compliance, acceptance criteria |

## Validation Statuses

| Status | Description | Score Range |
|--------|-------------|-------------|
| `passed` | Validation passed | 80-100 |
| `warning` | Passed with warnings | 60-79 |
| `failed` | Validation failed | 0-59 |
| `skipped` | Validation was skipped | N/A |

## API Reference

### Class: ValidationRecorder

#### Constructor

```javascript
new ValidationRecorder(projectPath = null)
```

Creates a new ValidationRecorder instance.

**Parameters:**
- `projectPath` (string, optional): Project root path. If not provided, automatically detected.

**Properties:**
- `validationTypes`: Array of valid validation types
- `statuses`: Array of valid statuses

---

#### recordValidation()

```javascript
recordValidation(artifactId, filePath, validationType, score, status, violations = [])
```

Records a new validation result.

**Parameters:**
- `artifactId` (number|null): Related artifact ID (optional)
- `filePath` (string): File path being validated
- `validationType` (string): Type of validation (see Validation Types)
- `score` (number): Validation score (0-100)
- `status` (string): Validation status (passed|failed|warning|skipped)
- `violations` (Array|Object): Violations found (JSON-serializable)

**Returns:** Object - The inserted validation record

**Throws:** Error if invalid validation type, status, or score

**Example:**
```javascript
const validation = recorder.recordValidation(
  null,
  'src/components/Button.tsx',
  'guideline',
  92,
  'passed',
  []
);
```

---

#### getValidation()

```javascript
getValidation(id)
```

Retrieves a validation by ID.

**Parameters:**
- `id` (number): Validation ID

**Returns:** Object|null - Validation record with artifact details, or null if not found

---

#### getValidationsByArtifact()

```javascript
getValidationsByArtifact(artifactId)
```

Retrieves all validations for a specific artifact.

**Parameters:**
- `artifactId` (number): Artifact ID

**Returns:** Array - Validation records ordered by date (newest first)

---

#### getValidationsByType()

```javascript
getValidationsByType(type, limit = 50)
```

Retrieves validations by type.

**Parameters:**
- `type` (string): Validation type
- `limit` (number, optional): Maximum records to return (default: 50)

**Returns:** Array - Validation records ordered by date (newest first)

---

#### getValidationSummary()

```javascript
getValidationSummary(options = {})
```

Gets aggregate validation statistics.

**Parameters:**
- `options` (Object, optional):
  - `validationType` (string): Filter by validation type
  - `status` (string): Filter by status
  - `filePath` (string): Filter by file path pattern

**Returns:** Object with:
- `summary`: Aggregate statistics
  - `total_validations`: Total count
  - `average_score`: Average score
  - `min_score`: Minimum score
  - `max_score`: Maximum score
  - `pass_rate`: Pass rate percentage
  - `passed_count`, `failed_count`, `warning_count`, `skipped_count`
- `by_type`: Breakdown by validation type
- `recent_failures`: Last 10 failures

**Example:**
```javascript
const summary = recorder.getValidationSummary({
  validationType: 'security',
  status: 'failed'
});

console.log(`Pass Rate: ${summary.summary.pass_rate}%`);
console.log(`Average Score: ${summary.summary.average_score}/100`);
```

---

#### updateValidation()

```javascript
updateValidation(id, updates)
```

Updates a validation record.

**Parameters:**
- `id` (number): Validation ID
- `updates` (Object): Fields to update
  - `score` (number): New score (0-100)
  - `status` (string): New status
  - `violations` (Array|Object): New violations

**Returns:** Object - Updated validation record

**Throws:** Error if invalid field, status, or score

**Example:**
```javascript
recorder.updateValidation(42, {
  score: 95,
  status: 'passed',
  violations: []
});
```

---

#### cleanupOldValidations()

```javascript
cleanupOldValidations(daysToKeep = 30)
```

Deletes validation records older than specified days.

**Parameters:**
- `daysToKeep` (number, optional): Keep validations from last N days (default: 30)

**Returns:** number - Number of records deleted

**Example:**
```javascript
const deleted = recorder.cleanupOldValidations(60);
console.log(`Deleted ${deleted} old records`);
```

---

#### getValidationTrends()

```javascript
getValidationTrends(days = 7)
```

Gets daily validation statistics over time.

**Parameters:**
- `days` (number, optional): Number of days to analyze (default: 7)

**Returns:** Array of daily statistics with:
- `date`: Date string
- `total`: Total validations
- `avg_score`: Average score
- `passed`, `failed`: Counts by status
- `pass_rate`: Pass rate percentage

**Example:**
```javascript
const trends = recorder.getValidationTrends(14);
trends.forEach(day => {
  console.log(`${day.date}: ${day.pass_rate}% pass rate`);
});
```

---

#### getFailingFiles()

```javascript
getFailingFiles(validationType = null)
```

Gets files with failed validations.

**Parameters:**
- `validationType` (string, optional): Filter by validation type

**Returns:** Array of files with:
- `file_path`: File path
- `validation_type`: Validation type
- `failure_count`: Number of failures
- `avg_score`: Average score
- `last_failure`: Timestamp of last failure

**Example:**
```javascript
const failing = recorder.getFailingFiles('security');
failing.forEach(file => {
  console.log(`${file.file_path}: ${file.failure_count} failures`);
});
```

---

#### close()

```javascript
close()
```

Closes the database connection. Always call this when done.

## Integration with AICodePath

### GICL Loop Integration

The validation recorder is used by the GICL (Generate, Iterate, Check, Loop) workflow to track quality gates:

```javascript
// In GICL loop
const recorder = new ValidationRecorder();

// After generating code
const validation = recorder.recordValidation(
  artifactId,
  generatedFilePath,
  'gicl',
  score,
  score >= 80 ? 'passed' : 'failed',
  violations
);

// Check if requirements met
const summary = recorder.getValidationSummary({
  validationType: 'gicl'
});

if (summary.summary.pass_rate < 100) {
  // Continue iteration
  console.log('Requirements not fully met, continuing GICL loop...');
}
```

### Pre-commit Hook Integration

```javascript
// In pre-commit hook
const recorder = new ValidationRecorder();

// Validate staged files
stagedFiles.forEach(file => {
  const guidelineScore = validateGuidelines(file);
  const securityScore = validateSecurity(file);

  recorder.recordValidation(null, file, 'guideline', guidelineScore,
    guidelineScore >= 80 ? 'passed' : 'failed', guidelineViolations);

  recorder.recordValidation(null, file, 'security', securityScore,
    securityScore >= 80 ? 'passed' : 'failed', securityViolations);
});

// Check if commit should proceed
const summary = recorder.getValidationSummary();
if (summary.summary.pass_rate < 80) {
  console.error('Validation pass rate below 80%, commit blocked');
  process.exit(1);
}
```

### Agent System Integration

```javascript
// In agent execution
const recorder = new ValidationRecorder();

// After agent generates artifact
const validation = recorder.recordValidation(
  artifact.id,
  artifact.file_path,
  'architecture',
  architectureScore,
  architectureScore >= 80 ? 'passed' : 'failed',
  violations
);

// Track in agent execution table
db.prepare(`
  UPDATE agent_executions
  SET validation_id = ?
  WHERE id = ?
`).run(validation.id, executionId);
```

## Best Practices

### 1. Score Thresholds

Use consistent scoring thresholds:

```javascript
function getStatus(score) {
  if (score >= 80) return 'passed';
  if (score >= 60) return 'warning';
  return 'failed';
}
```

### 2. Violation Structure

Use structured violation objects:

```javascript
const violations = [
  {
    rule: 'complexity',
    severity: 'high',
    message: 'Function complexity exceeds threshold',
    file: 'src/utils.js',
    line: 42,
    expected: 'complexity <= 10',
    actual: 'complexity = 15',
    suggestion: 'Break function into smaller functions'
  }
];
```

### 3. Batch Recording

For bulk validations, use transactions:

```javascript
const recorder = new ValidationRecorder();
const stmt = recorder.db.prepare(`
  INSERT INTO validations (artifact_id, file_path, validation_type, score, status, violations)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertMany = recorder.db.transaction((validations) => {
  for (const v of validations) {
    stmt.run(v.artifactId, v.filePath, v.type, v.score, v.status, JSON.stringify(v.violations));
  }
});

insertMany(validationsList);
```

### 4. Regular Cleanup

Schedule periodic cleanup of old validations:

```javascript
// In CI/CD or scheduled task
const recorder = new ValidationRecorder();
const deleted = recorder.cleanupOldValidations(30);
console.log(`Cleaned up ${deleted} old validation records`);
```

### 5. Trend Monitoring

Monitor validation trends to catch quality degradation:

```javascript
const recorder = new ValidationRecorder();
const trends = recorder.getValidationTrends(7);

const lastWeekAvg = trends.reduce((sum, day) => sum + day.avg_score, 0) / trends.length;
if (lastWeekAvg < 75) {
  console.warn(`WARNING: Average validation score dropped to ${lastWeekAvg}/100`);
}
```

## Error Handling

The library throws descriptive errors for invalid inputs:

```javascript
try {
  recorder.recordValidation(
    null,
    'src/test.js',
    'invalid-type',  // Invalid!
    95,
    'passed',
    []
  );
} catch (error) {
  console.error(error.message);
  // Error: Invalid validation type: invalid-type.
  // Must be one of: guideline, api, data, architecture, duplication, devops, iac, security, gicl
}
```

Always wrap validation operations in try-catch:

```javascript
try {
  const validation = recorder.recordValidation(...);
  console.log('Validation recorded successfully');
} catch (error) {
  console.error(`Failed to record validation: ${error.message}`);
  // Handle error appropriately
}
```

## Performance Considerations

### Database Indexes

The `validations` table has indexes on:
- `artifact_id` - Fast artifact lookups
- `validation_type` - Fast type filtering
- `status` - Fast status filtering

### WAL Mode

The database uses WAL (Write-Ahead Logging) mode for better concurrency:

```javascript
// Enabled automatically in constructor
this.db.pragma('journal_mode = WAL');
```

### Query Limits

Use limits to prevent large result sets:

```javascript
// Good: Limited query
const recent = recorder.getValidationsByType('security', 50);

// Better: Paginated query with offset
const page2 = recorder.db.prepare(`
  SELECT * FROM validations
  WHERE validation_type = ?
  ORDER BY validated_at DESC
  LIMIT 50 OFFSET 50
`).all('security');
```

## Examples

### Example 1: Security Validation

```javascript
const recorder = new ValidationRecorder();

// Run security scan
const securityResults = runSecurityScan('src/auth.js');

const violations = securityResults.issues.map(issue => ({
  rule: issue.ruleId,
  severity: issue.severity,
  message: issue.message,
  line: issue.line,
  cwe: issue.cwe
}));

const score = calculateSecurityScore(violations);

recorder.recordValidation(
  null,
  'src/auth.js',
  'security',
  score,
  score >= 80 ? 'passed' : 'failed',
  violations
);

recorder.close();
```

### Example 2: API Design Validation

```javascript
const recorder = new ValidationRecorder();

// Validate API endpoints
const apiSpec = parseOpenAPISpec('api/openapi.yaml');
const violations = validateAPIDesign(apiSpec);

recorder.recordValidation(
  artifactId,
  'api/openapi.yaml',
  'api',
  violations.length === 0 ? 100 : 70,
  violations.length === 0 ? 'passed' : 'warning',
  violations
);

recorder.close();
```

### Example 3: Quality Dashboard

```javascript
const recorder = new ValidationRecorder();

// Get summary for dashboard
const summary = recorder.getValidationSummary();
const trends = recorder.getValidationTrends(30);
const failing = recorder.getFailingFiles();

const dashboard = {
  overall: {
    passRate: summary.summary.pass_rate,
    avgScore: summary.summary.average_score,
    total: summary.summary.total_validations
  },
  byType: summary.by_type,
  trends: trends,
  topFailures: failing.slice(0, 10)
};

console.log(JSON.stringify(dashboard, null, 2));

recorder.close();
```

## Troubleshooting

### Database Not Found

```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Solution:** Ensure the project has been initialized with `./scripts/init-knowledge-base.sh`

### Invalid Validation Type

```
Error: Invalid validation type: xyz. Must be one of: ...
```

**Solution:** Use one of the predefined validation types. Check `recorder.validationTypes` for valid values.

### WAL Mode Not Working

If you see journal files instead of WAL files:

```javascript
// Check current mode
console.log(recorder.db.pragma('journal_mode', { simple: true }));

// Force WAL mode
recorder.db.pragma('journal_mode = DELETE');
recorder.db.pragma('journal_mode = WAL');
```

## License

Part of the AICodePath project. See project LICENSE for details.

## Related Documentation

- [KB Writer](./kb-writer-README.md) - Workflow state management
- [KB Query](./kb-query-README.md) - Knowledge base querying
- [Database Schema](../db/schema.sql) - Full database schema
- [GICL Loop](../rules/common/gicl-loop.md) - GICL workflow integration
- [Pre-commit Hooks](../hooks/pre-commit-validator.sh) - Git hook integration
