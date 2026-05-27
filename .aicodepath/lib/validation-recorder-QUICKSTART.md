# Validation Recorder - Quick Start Guide

A 2-minute guide to using the validation recorder library.

## What It Does

Records and tracks validation results for quality gates in AICodePath.

## Quick Examples

### CLI Usage

```bash
# Record a validation
node validation-recorder.js record null security 85 passed src/auth.js

# Show summary
node validation-recorder.js summary

# List security validations
node validation-recorder.js list security

# Show trends
node validation-recorder.js trends 7

# Find failing files
node validation-recorder.js failing

# Cleanup old records
node validation-recorder.js cleanup 30
```

### Programmatic Usage

```javascript
const ValidationRecorder = require('./validation-recorder');

// Initialize
const recorder = new ValidationRecorder();

// Record validation
recorder.recordValidation(
  null,                  // artifact ID (or null)
  'src/auth.js',         // file path
  'security',            // validation type
  85,                    // score (0-100)
  'passed',              // status
  []                     // violations array
);

// Get summary
const summary = recorder.getValidationSummary();
console.log(`Pass Rate: ${summary.summary.pass_rate}%`);

// Always close
recorder.close();
```

## Validation Types

- `guideline` - Coding standards
- `security` - Security scanning
- `api` - API design
- `data` - Data modeling
- `architecture` - Architecture patterns
- `duplication` - Code duplication
- `devops` - DevOps practices
- `iac` - Infrastructure as Code
- `gicl` - GICL quality gates

## Statuses

- `passed` - Validation passed (80-100)
- `warning` - Passed with warnings (60-79)
- `failed` - Validation failed (0-59)
- `skipped` - Validation skipped

## Common Patterns

### GICL Loop Integration

```javascript
const recorder = new ValidationRecorder();

// Run validation
const score = runQualityChecks(file);
recorder.recordValidation(null, file, 'gicl', score,
  score >= 80 ? 'passed' : 'failed', violations);

// Check if requirements met
const summary = recorder.getValidationSummary({ validationType: 'gicl' });
if (summary.summary.pass_rate < 100) {
  console.log('Continue iteration...');
}

recorder.close();
```

### Pre-commit Hook

```javascript
const recorder = new ValidationRecorder();

stagedFiles.forEach(file => {
  const score = validateFile(file);
  recorder.recordValidation(null, file, 'guideline', score,
    score >= 80 ? 'passed' : 'failed', violations);
});

const summary = recorder.getValidationSummary();
if (summary.summary.pass_rate < 80) {
  console.error('Commit blocked');
  process.exit(1);
}

recorder.close();
```

### Quality Dashboard

```javascript
const recorder = new ValidationRecorder();

const summary = recorder.getValidationSummary();
const trends = recorder.getValidationTrends(7);
const failing = recorder.getFailingFiles();

console.log(`Pass Rate: ${summary.summary.pass_rate}%`);
console.log(`Average Score: ${summary.summary.average_score}/100`);

recorder.close();
```

## Error Handling

Always wrap in try-catch:

```javascript
try {
  const validation = recorder.recordValidation(...);
  console.log('Success!');
} catch (error) {
  console.error(`Error: ${error.message}`);
}
```

## Need Help?

- Full docs: [validation-recorder-README.md](./validation-recorder-README.md)
- Tests: [__tests__/validation-recorder.test.js](./__tests__/validation-recorder.test.js)
- Examples: [__tests__/validation-recorder-example.js](./__tests__/validation-recorder-example.js)
- GICL integration: [__tests__/validation-recorder-gicl-integration.js](./__tests__/validation-recorder-gicl-integration.js)
