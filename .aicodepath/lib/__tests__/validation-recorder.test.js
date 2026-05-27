#!/usr/bin/env node
/**
 * Simple test script for ValidationRecorder
 * Run with: node __tests__/validation-recorder.test.js
 */

const ValidationRecorder = require('../validation-recorder');

console.log('Testing ValidationRecorder...\n');

// Initialize recorder
const recorder = new ValidationRecorder();

try {
  // Test 1: Record validation
  console.log('Test 1: Record validation');
  const validation = recorder.recordValidation(
    null,
    'test/example.js',
    'guideline',
    85,
    'passed',
    []
  );
  console.log(`✓ Recorded validation ID: ${validation.id}`);
  console.log('');

  // Test 2: Get validation by ID
  console.log('Test 2: Get validation by ID');
  const retrieved = recorder.getValidation(validation.id);
  console.log(`✓ Retrieved validation: ${retrieved.file_path}`);
  console.log('');

  // Test 3: Get validations by type
  console.log('Test 3: Get validations by type');
  const byType = recorder.getValidationsByType('guideline', 5);
  console.log(`✓ Found ${byType.length} guideline validations`);
  console.log('');

  // Test 4: Get validation summary
  console.log('Test 4: Get validation summary');
  const summary = recorder.getValidationSummary();
  console.log(`✓ Total validations: ${summary.summary.total_validations}`);
  console.log(`✓ Average score: ${summary.summary.average_score}/100`);
  console.log(`✓ Pass rate: ${summary.summary.pass_rate}%`);
  console.log('');

  // Test 5: Update validation
  console.log('Test 5: Update validation');
  const updated = recorder.updateValidation(validation.id, {
    score: 90,
    status: 'passed'
  });
  console.log(`✓ Updated score to: ${updated.score}/100`);
  console.log('');

  // Test 6: Get trends
  console.log('Test 6: Get validation trends');
  const trends = recorder.getValidationTrends(7);
  console.log(`✓ Retrieved ${trends.length} days of trend data`);
  console.log('');

  // Test 7: Record validation with violations
  console.log('Test 7: Record validation with violations');
  const withViolations = recorder.recordValidation(
    null,
    'test/bad-code.js',
    'security',
    55,
    'failed',
    [
      {
        rule: 'hardcoded-secret',
        severity: 'critical',
        message: 'Hardcoded API key found',
        line: 42
      },
      {
        rule: 'sql-injection',
        severity: 'high',
        message: 'Potential SQL injection vulnerability',
        line: 105
      }
    ]
  );
  console.log(`✓ Recorded validation with ${withViolations.violations.length} violations`);
  console.log('');

  // Test 8: Get failing files
  console.log('Test 8: Get failing files');
  const failing = recorder.getFailingFiles();
  console.log(`✓ Found ${failing.length} failing files`);
  if (failing.length > 0) {
    console.log(`  Example: ${failing[0].file_path} (${failing[0].failure_count} failures)`);
  }
  console.log('');

  // Test 9: Validation type validation (should throw error)
  console.log('Test 9: Invalid validation type (should throw error)');
  try {
    recorder.recordValidation(
      null,
      'test.js',
      'invalid-type',
      50,
      'failed',
      []
    );
    console.log('✗ Should have thrown error');
  } catch (error) {
    console.log('✓ Correctly threw error for invalid type');
  }
  console.log('');

  // Test 10: Score validation (should throw error)
  console.log('Test 10: Invalid score (should throw error)');
  try {
    recorder.recordValidation(
      null,
      'test.js',
      'guideline',
      150, // Invalid: > 100
      'passed',
      []
    );
    console.log('✗ Should have thrown error');
  } catch (error) {
    console.log('✓ Correctly threw error for invalid score');
  }
  console.log('');

  console.log('All tests passed!');

} catch (error) {
  console.error(`Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
} finally {
  recorder.close();
}
