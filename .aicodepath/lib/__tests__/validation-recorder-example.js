#!/usr/bin/env node
/**
 * Example integration script for ValidationRecorder
 *
 * This demonstrates how to integrate validation recording into:
 * - GICL loop quality gates
 * - Pre-commit hooks
 * - Agent execution tracking
 */

const ValidationRecorder = require('../validation-recorder');

// ============================================================================
// Example 1: GICL Loop Quality Gate
// ============================================================================

function gicl_quality_gate_example() {
  console.log('=== GICL Loop Quality Gate Example ===\n');

  const recorder = new ValidationRecorder();

  // Simulate code generation and validation
  const generatedFiles = [
    { path: 'src/services/UserService.ts', artifactId: null },
    { path: 'src/controllers/UserController.ts', artifactId: null },
    { path: 'src/models/User.ts', artifactId: null }
  ];

  generatedFiles.forEach(file => {
    // Simulate guideline validation
    const guidelineScore = Math.floor(Math.random() * 40) + 60; // 60-100
    const guidelineViolations = guidelineScore < 80 ? [
      {
        rule: 'complexity',
        severity: 'medium',
        message: 'Function complexity exceeds threshold',
        line: 15
      }
    ] : [];

    recorder.recordValidation(
      file.artifactId,
      file.path,
      'gicl',
      guidelineScore,
      guidelineScore >= 80 ? 'passed' : 'failed',
      guidelineViolations
    );

    console.log(`Validated ${file.path}: ${guidelineScore}/100`);
  });

  // Check if all requirements met
  const summary = recorder.getValidationSummary({ validationType: 'gicl' });

  console.log(`\nGICL Quality Gate:`);
  console.log(`  Pass Rate: ${summary.summary.pass_rate}%`);
  console.log(`  Average Score: ${summary.summary.average_score}/100`);

  if (summary.summary.pass_rate < 100) {
    console.log(`  Status: CONTINUE ITERATION (${summary.summary.failed_count} files need work)`);
  } else {
    console.log(`  Status: REQUIREMENTS MET`);
  }

  recorder.close();
  console.log('');
}

// ============================================================================
// Example 2: Pre-commit Hook Validation
// ============================================================================

function precommit_validation_example() {
  console.log('=== Pre-commit Hook Validation Example ===\n');

  const recorder = new ValidationRecorder();

  // Simulate staged files
  const stagedFiles = [
    'src/auth/AuthService.ts',
    'src/auth/JwtUtil.ts',
    'src/config/database.ts'
  ];

  let hasFailures = false;

  stagedFiles.forEach(file => {
    // Guideline validation
    const guidelineScore = Math.floor(Math.random() * 30) + 70; // 70-100
    recorder.recordValidation(
      null,
      file,
      'guideline',
      guidelineScore,
      guidelineScore >= 80 ? 'passed' : 'warning',
      []
    );

    // Security validation
    const securityScore = Math.floor(Math.random() * 40) + 60; // 60-100
    const securityViolations = securityScore < 80 ? [
      {
        rule: 'hardcoded-secret',
        severity: 'critical',
        message: 'Potential hardcoded credential detected',
        suggestion: 'Use environment variables or secrets manager'
      }
    ] : [];

    recorder.recordValidation(
      null,
      file,
      'security',
      securityScore,
      securityScore >= 80 ? 'passed' : 'failed',
      securityViolations
    );

    console.log(`${file}:`);
    console.log(`  Guideline: ${guidelineScore}/100`);
    console.log(`  Security: ${securityScore}/100`);

    if (securityScore < 80) {
      hasFailures = true;
    }
  });

  const summary = recorder.getValidationSummary();

  console.log(`\nPre-commit Summary:`);
  console.log(`  Pass Rate: ${summary.summary.pass_rate}%`);
  console.log(`  Average Score: ${summary.summary.average_score}/100`);

  if (hasFailures || summary.summary.pass_rate < 80) {
    console.log(`  Status: COMMIT BLOCKED (Fix violations before committing)`);
  } else {
    console.log(`  Status: COMMIT APPROVED`);
  }

  recorder.close();
  console.log('');
}

// ============================================================================
// Example 3: Agent Execution Validation Tracking
// ============================================================================

function agent_execution_example() {
  console.log('=== Agent Execution Validation Example ===\n');

  const recorder = new ValidationRecorder();

  // Simulate agent generating code
  const agents = [
    {
      name: 'security-engineer',
      artifact: { id: null, path: 'docs/security-design.md' },
      validationType: 'security'
    },
    {
      name: 'data-architect',
      artifact: { id: null, path: 'docs/database-design.md' },
      validationType: 'data'
    },
    {
      name: 'api-architect',
      artifact: { id: null, path: 'docs/api-design.md' },
      validationType: 'api'
    }
  ];

  agents.forEach(agent => {
    const score = Math.floor(Math.random() * 30) + 70; // 70-100
    const violations = score < 85 ? [
      {
        rule: 'completeness',
        severity: 'medium',
        message: 'Missing required sections in design document'
      }
    ] : [];

    const validation = recorder.recordValidation(
      agent.artifact.id,
      agent.artifact.path,
      agent.validationType,
      score,
      score >= 85 ? 'passed' : 'warning',
      violations
    );

    console.log(`${agent.name}:`);
    console.log(`  Artifact: ${agent.artifact.path}`);
    console.log(`  Validation: ${score}/100 (ID: ${validation.id})`);
    console.log(`  Status: ${validation.status}`);
    console.log('');
  });

  recorder.close();
}

// ============================================================================
// Example 4: Quality Dashboard
// ============================================================================

function quality_dashboard_example() {
  console.log('=== Quality Dashboard Example ===\n');

  const recorder = new ValidationRecorder();

  const summary = recorder.getValidationSummary();
  const trends = recorder.getValidationTrends(7);
  const failing = recorder.getFailingFiles();

  console.log('Quality Metrics:');
  console.log('----------------');
  console.log(`Total Validations: ${summary.summary.total_validations}`);
  console.log(`Average Score: ${summary.summary.average_score}/100`);
  console.log(`Pass Rate: ${summary.summary.pass_rate}%\n`);

  console.log('By Type:');
  summary.by_type.forEach(type => {
    console.log(`  ${type.validation_type.padEnd(15)} ${type.count.toString().padStart(3)} validations  ${type.pass_rate.toString().padStart(5)}% pass rate`);
  });

  if (trends.length > 0) {
    console.log('\nTrend (Last 7 Days):');
    const lastDay = trends[0];
    console.log(`  Most Recent: ${lastDay.avg_score}/100 avg, ${lastDay.pass_rate}% pass rate`);
  }

  if (failing.length > 0) {
    console.log('\nTop Failing Files:');
    failing.slice(0, 3).forEach(f => {
      console.log(`  ${f.file_path}: ${f.failure_count} failures`);
    });
  }

  recorder.close();
  console.log('');
}

// ============================================================================
// Run Examples
// ============================================================================

console.log('ValidationRecorder Integration Examples\n');
console.log('========================================\n\n');

gicl_quality_gate_example();
precommit_validation_example();
agent_execution_example();
quality_dashboard_example();

console.log('Examples complete!');
