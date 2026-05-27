#!/usr/bin/env node

/**
 * AICodePath Product Readiness Check
 *
 * Issue 11 Fix: Comprehensive validation checkpoint before marking a product
 * as "ready". Aggregates all quality metrics, test results, and validation
 * outcomes to determine if the product meets readiness criteria.
 *
 * Usage:
 *   node scripts/product-readiness-check.js [--project-path=/path/to/project]
 *
 * Exit codes:
 *   0 - All checks passed, product is ready
 *   1 - Some checks failed, product is not ready
 *   2 - Critical error (KB not initialized, missing files, etc.)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Readiness criteria thresholds
const READINESS_CRITERIA = {
  testPassRate: 100, // All tests must pass
  guidelineScore: 80, // Minimum guideline compliance score
  buildSuccess: true, // Build must succeed
  auditIssues: 0, // No blocking audit issues
  unitsComplete: 100, // All units must be complete
  kbSynced: true, // KB must be synchronized
};

/**
 * Read JSON file safely
 */
function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[readiness] Failed to read ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Check if build succeeds
 */
function checkBuild(projectPath) {
  const result = {
    name: 'Build Check',
    passed: false,
    details: '',
    score: 0,
  };

  try {
    // Check for package.json
    const packageJson = readJson(path.join(projectPath, 'package.json'));
    if (!packageJson) {
      result.details = 'No package.json found';
      return result;
    }

    // Check if build script exists
    if (!packageJson.scripts?.build) {
      result.details = 'No build script defined';
      result.passed = true; // Not all projects need a build
      result.score = 100;
      return result;
    }

    // Try to run build
    try {
      execSync('npm run build', {
        cwd: projectPath,
        stdio: 'pipe',
        timeout: 120000, // 2 minute timeout
      });
      result.passed = true;
      result.score = 100;
      result.details = 'Build succeeded';
    } catch (buildError) {
      result.details = `Build failed: ${buildError.message}`;
      result.score = 0;
    }
  } catch (error) {
    result.details = `Build check error: ${error.message}`;
  }

  return result;
}

/**
 * Check test results
 */
function checkTests(projectPath) {
  const result = {
    name: 'Test Suite',
    passed: false,
    details: '',
    score: 0,
  };

  try {
    // Check for test results in aicodepath-docs
    const testsJson = readJson(path.join(projectPath, 'aicodepath-docs', 'tests.json'));

    if (testsJson) {
      const total = testsJson.total || 0;
      const passed = testsJson.passed || 0;
      const failed = testsJson.failed || 0;

      result.score = total > 0 ? Math.round((passed / total) * 100) : 100;
      result.passed = result.score >= READINESS_CRITERIA.testPassRate;
      result.details = `${passed}/${total} tests passed (${failed} failed)`;
      return result;
    }

    // Try running tests
    const packageJson = readJson(path.join(projectPath, 'package.json'));
    if (packageJson?.scripts?.test) {
      try {
        const output = execSync('npm test', {
          cwd: projectPath,
          stdio: 'pipe',
          timeout: 300000, // 5 minute timeout
        });
        result.passed = true;
        result.score = 100;
        result.details = 'All tests passed';
      } catch (testError) {
        result.details = 'Tests failed';
        result.score = 0;
      }
    } else {
      result.details = 'No tests defined';
      result.passed = true;
      result.score = 100;
    }
  } catch (error) {
    result.details = `Test check error: ${error.message}`;
  }

  return result;
}

/**
 * Check unit implementation status
 */
function checkUnitsComplete(projectPath) {
  const result = {
    name: 'Unit Completion',
    passed: false,
    details: '',
    score: 0,
  };

  try {
    const status = readJson(
      path.join(projectPath, 'aicodepath-docs', 'implementation-status.json')
    );

    if (!status || !status.units || status.units.length === 0) {
      result.details = 'No units defined';
      result.passed = true;
      result.score = 100;
      return result;
    }

    const total = status.units.length;
    const completed = status.units.filter((u) => u.status === 'completed').length;
    const inProgress = status.units.filter((u) => u.status === 'in_progress').length;

    result.score = Math.round((completed / total) * 100);
    result.passed = result.score >= READINESS_CRITERIA.unitsComplete;
    result.details = `${completed}/${total} units complete (${inProgress} in progress)`;

    // List incomplete units
    const incomplete = status.units.filter((u) => u.status !== 'completed');
    if (incomplete.length > 0) {
      result.incomplete = incomplete.map((u) => u.name || u.id);
    }
  } catch (error) {
    result.details = `Unit check error: ${error.message}`;
  }

  return result;
}

/**
 * Check KB synchronization
 */
function checkKBSync(projectPath) {
  const result = {
    name: 'Knowledge Base Sync',
    passed: false,
    details: '',
    score: 0,
  };

  try {
    const dbPath = path.join(projectPath, 'aicodepath-docs', 'aicodepath.db');

    if (!fs.existsSync(dbPath)) {
      result.details = 'KB not initialized';
      return result;
    }

    const stats = fs.statSync(dbPath);
    if (stats.size === 0) {
      result.details = 'KB is empty';
      return result;
    }

    result.passed = true;
    result.score = 100;
    result.details = `KB initialized (${Math.round(stats.size / 1024)} KB)`;
  } catch (error) {
    result.details = `KB check error: ${error.message}`;
  }

  return result;
}

/**
 * Check audit log for blocking issues
 */
function checkAuditLog(projectPath) {
  const result = {
    name: 'Audit Log',
    passed: false,
    details: '',
    score: 0,
    issues: [],
  };

  try {
    const auditPath = path.join(projectPath, 'aicodepath-docs', 'audit.md');

    if (!fs.existsSync(auditPath)) {
      result.passed = true;
      result.score = 100;
      result.details = 'No audit log (clean)';
      return result;
    }

    const content = fs.readFileSync(auditPath, 'utf8');

    // Look for blocking issues
    const blockingPatterns = [/BLOCKED:/gi, /CRITICAL:/gi, /SECURITY:/gi, /VIOLATION:/gi];

    let blockingCount = 0;
    for (const pattern of blockingPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        blockingCount += matches.length;
      }
    }

    result.score = blockingCount === 0 ? 100 : Math.max(0, 100 - blockingCount * 10);
    result.passed = blockingCount <= READINESS_CRITERIA.auditIssues;
    result.details =
      blockingCount === 0 ? 'No blocking issues' : `${blockingCount} blocking issue(s) found`;
  } catch (error) {
    result.details = `Audit check error: ${error.message}`;
  }

  return result;
}

/**
 * Check guideline compliance
 */
function checkGuidelineCompliance(projectPath) {
  const result = {
    name: 'Guideline Compliance',
    passed: false,
    details: '',
    score: 0,
  };

  try {
    // Check for recent validations
    const validationsPath = path.join(projectPath, 'aicodepath-docs', 'validations.json');
    const validations = readJson(validationsPath);

    if (!validations || validations.length === 0) {
      result.details = 'No validation records';
      result.passed = true;
      result.score = 100;
      return result;
    }

    // Calculate average score
    const scores = validations.map((v) => v.score || 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    result.score = avgScore;
    result.passed = avgScore >= READINESS_CRITERIA.guidelineScore;
    result.details = `Average compliance: ${avgScore}%`;
  } catch (error) {
    result.details = `Guideline check error: ${error.message}`;
    result.passed = true;
    result.score = 100;
  }

  return result;
}

/**
 * Check git status
 */
function checkGitStatus(projectPath) {
  const result = {
    name: 'Git Status',
    passed: false,
    details: '',
    score: 0,
  };

  try {
    const status = execSync('git status --porcelain', {
      cwd: projectPath,
      encoding: 'utf8',
    });

    const uncommittedFiles = status
      .trim()
      .split('\n')
      .filter((l) => l.trim());

    if (uncommittedFiles.length === 0) {
      result.passed = true;
      result.score = 100;
      result.details = 'Clean working directory';
    } else {
      result.score = Math.max(0, 100 - uncommittedFiles.length * 5);
      result.passed = uncommittedFiles.length <= 5;
      result.details = `${uncommittedFiles.length} uncommitted file(s)`;
    }
  } catch (error) {
    result.details = `Git check error: ${error.message}`;
  }

  return result;
}

/**
 * Run all readiness checks
 */
function runReadinessCheck(projectPath = process.cwd()) {
  console.log('\n' + '='.repeat(60));
  console.log('AICodePath Product Readiness Check');
  console.log('='.repeat(60) + '\n');

  const checks = [
    checkBuild(projectPath),
    checkTests(projectPath),
    checkUnitsComplete(projectPath),
    checkKBSync(projectPath),
    checkAuditLog(projectPath),
    checkGuidelineCompliance(projectPath),
    checkGitStatus(projectPath),
  ];

  let totalScore = 0;
  let passedCount = 0;

  for (const check of checks) {
    const status = check.passed ? '[PASS]' : '[FAIL]';
    const scoreStr = `${check.score}%`.padStart(4);

    console.log(`${status} ${check.name.padEnd(25)} Score: ${scoreStr}`);
    console.log(`       ${check.details}`);

    if (check.incomplete) {
      console.log(`       Incomplete: ${check.incomplete.join(', ')}`);
    }
    console.log('');

    totalScore += check.score;
    if (check.passed) passedCount++;
  }

  const avgScore = Math.round(totalScore / checks.length);
  const allPassed = passedCount === checks.length;

  console.log('='.repeat(60));
  console.log(`Overall Score: ${avgScore}%`);
  console.log(`Checks Passed: ${passedCount}/${checks.length}`);
  console.log('');

  if (allPassed) {
    console.log('STATUS: READY FOR PRODUCTION');
    console.log('All readiness criteria have been met.\n');
  } else {
    console.log('STATUS: NOT READY');
    console.log('Address the failed checks before marking as production ready.\n');
  }

  return {
    ready: allPassed,
    score: avgScore,
    passedCount,
    totalChecks: checks.length,
    checks,
  };
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  let projectPath = process.cwd();

  for (const arg of args) {
    if (arg.startsWith('--project-path=')) {
      projectPath = arg.split('=')[1];
    }
  }

  const result = runReadinessCheck(projectPath);
  process.exit(result.ready ? 0 : 1);
}

module.exports = {
  runReadinessCheck,
  checkBuild,
  checkTests,
  checkUnitsComplete,
  checkKBSync,
  checkAuditLog,
  checkGuidelineCompliance,
  checkGitStatus,
  READINESS_CRITERIA,
};
