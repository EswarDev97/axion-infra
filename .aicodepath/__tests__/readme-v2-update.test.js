#!/usr/bin/env node

/**
 * Test: README.md v2 Update Validation
 *
 * Validates that the main README.md has been properly updated with:
 * - V2 installation instructions using install-v2.sh
 * - .aicodepath/ structure documentation
 * - No references to root-level directories (except in legacy/v1 sections)
 * - Version comparison/migration notes
 * - Cross-reference to .aicodepath/README.md
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Assert helper
 */
function assert(condition, testName, errorMessage) {
  if (condition) {
    results.passed++;
    results.tests.push({ name: testName, status: 'PASS' });
    console.log(`${GREEN}✓${RESET} ${testName}`);
    return true;
  } else {
    results.failed++;
    results.tests.push({ name: testName, status: 'FAIL', error: errorMessage });
    console.log(`${RED}✗${RESET} ${testName}`);
    console.log(`  ${RED}Error: ${errorMessage}${RESET}`);
    return false;
  }
}

/**
 * Main test suite
 */
function runTests() {
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}README.md v2 Update Validation${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

  // Find project root
  const projectRoot = path.resolve(__dirname, '../../');
  const readmePath = path.join(projectRoot, 'README.md');
  const aicodePathReadmePath = path.join(projectRoot, '.aicodepath', 'README.md');

  // Read README.md
  if (!fs.existsSync(readmePath)) {
    console.log(`${RED}✗ README.md not found at: ${readmePath}${RESET}`);
    throw new Error('README.md not found');
  }

  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  const lines = readmeContent.split('\n');

  console.log(`${YELLOW}Testing README.md at: ${readmePath}${RESET}\n`);

  // Test 1: Installation section uses install-v2.sh
  const hasInstallV2 = readmeContent.includes('install-v2.sh');
  assert(
    hasInstallV2,
    'Installation section references install-v2.sh',
    'README should mention install-v2.sh script for v2 installation'
  );

  // Test 2: No old v1 installation instructions (except in legacy/migration sections)
  const oldInstallPattern = /cp -r \/tmp\/aicodepath\/aicodepath-tool\/\.claude \.claude/;
  const hasOldInstall = oldInstallPattern.test(readmeContent);

  // Check if old install is in a legacy/migration context
  let oldInstallInLegacyContext = false;
  if (hasOldInstall) {
    const contextMatch = readmeContent.match(/(?:legacy|v1|migration|backward|compatibility|old).{0,500}cp -r \/tmp\/aicodepath\/aicodepath-tool\/\.claude/i);
    oldInstallInLegacyContext = contextMatch !== null;
  }

  assert(
    !hasOldInstall || oldInstallInLegacyContext,
    'Old v1 installation removed or only in legacy context',
    'Old "cp -r .claude .claude" installation should be removed or only in legacy/migration section'
  );

  // Test 3: .aicodepath/ structure is documented
  const hasAicodePathStructure = readmeContent.includes('.aicodepath/') || readmeContent.includes('.aicodepath directory');
  assert(
    hasAicodePathStructure,
    '.aicodepath/ directory structure is documented',
    'README should explain the .aicodepath/ consolidated structure'
  );

  // Test 4: Cross-reference to .aicodepath/README.md
  const hasAicodePathReadmeRef = readmeContent.match(/\.aicodepath\/README\.md/);
  assert(
    hasAicodePathReadmeRef,
    'Cross-reference to .aicodepath/README.md exists',
    'README should reference .aicodepath/README.md for detailed structure docs'
  );

  // Test 5: Version comparison or migration note
  const hasVersionInfo = readmeContent.match(/v2\.0|v2|version 2|V2/i) &&
                         (readmeContent.match(/migration/i) || readmeContent.match(/upgrade/i) || readmeContent.match(/v1/i));
  assert(
    hasVersionInfo,
    'Version comparison or migration information present',
    'README should include v1 vs v2 comparison or migration notes'
  );

  // Test 6: Quick Start updated with v2 paths
  // Match from ## Quick Start until the next h2 heading (## followed by space and non-#)
  const quickStartSection = readmeContent.match(/## Quick Start([\s\S]*?)(?=\n## [^#]|$)/);
  let quickStartUsesV2 = false;
  if (quickStartSection) {
    const quickStartText = quickStartSection[1];
    quickStartUsesV2 = quickStartText.includes('.aicodepath/') || quickStartText.includes('install-v2.sh');
  }
  assert(
    quickStartUsesV2,
    'Quick Start section uses v2 paths',
    'Quick Start should reference .aicodepath/ paths or install-v2.sh'
  );

  // Test 7: No references to root-level hooks/, rules/, guidelines/ (except in v1/legacy sections)
  const rootLevelDirPattern = /(^|\s)(hooks|rules|guidelines|lib|scripts)\//gm;
  const matches = [...readmeContent.matchAll(rootLevelDirPattern)];

  // Filter out matches that are in legacy/v1/backward compatibility context
  const invalidMatches = matches.filter(match => {
    const startPos = match.index;
    const contextBefore = readmeContent.substring(Math.max(0, startPos - 500), startPos);
    const contextAfter = readmeContent.substring(startPos, Math.min(readmeContent.length, startPos + 500));
    const context = contextBefore + contextAfter;

    // Allow if in legacy/v1/v2-changelog/migration context
    const isLegacyContext = /(?:legacy|v1|v2\.\d|migration|backward|compatibility|old|version 1|Changes|Consolidat)/i.test(context);

    // Allow if part of .aicodepath/hooks/ or similar
    const isV2Path = /\.aicodepath\/(hooks|rules|guidelines|lib|scripts)/.test(context);

    // Allow if it's a tree structure showing .aicodepath/ parent
    // Look for indentation characters (│, ├, └) in context before
    const isTreeStructure = /[│├└]\s+/.test(contextBefore.substring(contextBefore.length - 100));

    // Allow if inside a code block (JS comment showing file path)
    const isCodeBlock = /```(?:javascript|js|bash|sh)/.test(contextBefore.substring(contextBefore.length - 200));

    return !isLegacyContext && !isV2Path && !isTreeStructure && !isCodeBlock;
  });

  assert(
    invalidMatches.length === 0,
    'No root-level directory references (except in legacy sections)',
    `Found ${invalidMatches.length} references to root-level directories outside legacy context: ${invalidMatches.slice(0, 3).map(m => m[0]).join(', ')}`
  );

  // Test 8: Command examples use .aicodepath/ paths
  const codeBlockPattern = /```(?:bash|sh)?\s*([\s\S]*?)```/g;
  const codeBlocks = [...readmeContent.matchAll(codeBlockPattern)];
  const commandsWithPaths = codeBlocks.filter(block => {
    const code = block[1];
    return code.match(/\/(hooks|rules|guidelines|lib|scripts)\//);
  });

  let allCommandsUseV2 = true;
  const badCommands = [];

  commandsWithPaths.forEach(block => {
    const code = block[1];
    const hasRootPath = code.match(/(^|\s)(hooks|rules|guidelines|lib|scripts)\//m);
    const hasV2Path = code.includes('.aicodepath/');

    if (hasRootPath && !hasV2Path) {
      // Check if in legacy context
      const startPos = block.index;
      const contextBefore = readmeContent.substring(Math.max(0, startPos - 500), startPos);
      const isLegacyContext = /(?:legacy|v1|migration|backward|compatibility)/i.test(contextBefore);

      if (!isLegacyContext) {
        allCommandsUseV2 = false;
        badCommands.push(code.substring(0, 50) + '...');
      }
    }
  });

  assert(
    allCommandsUseV2,
    'All command examples use .aicodepath/ paths (except legacy examples)',
    `Found ${badCommands.length} command examples without .aicodepath/ prefix: ${badCommands.slice(0, 2).join(', ')}`
  );

  // Test 9: Installation instructions mention both methods
  const hasManualInstall = readmeContent.includes('Manual') || readmeContent.includes('manual');
  const hasScriptInstall = readmeContent.includes('install-v2.sh');
  assert(
    hasManualInstall && hasScriptInstall,
    'Installation section mentions both script and manual methods',
    'README should document both install-v2.sh and manual installation options'
  );

  // Test 10: .aicodepath/README.md file exists
  const aicodePathReadmeExists = fs.existsSync(aicodePathReadmePath);
  assert(
    aicodePathReadmeExists,
    '.aicodepath/README.md file exists',
    '.aicodepath/README.md should exist for cross-reference'
  );

  // Print summary
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BLUE}Test Summary${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${GREEN}Passed: ${results.passed}${RESET}`);
  console.log(`${RED}Failed: ${results.failed}${RESET}`);
  console.log(`Total: ${results.passed + results.failed}\n`);

  if (results.failed > 0) {
    console.log(`${RED}Tests failed. README.md needs v2 updates.${RESET}`);
    throw new Error(`${results.failed} test(s) failed`);
  } else {
    console.log(`${GREEN}All tests passed! README.md is properly updated for v2.${RESET}`);
  }
}

// Run tests
runTests();
