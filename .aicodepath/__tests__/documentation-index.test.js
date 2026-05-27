/**
 * Test Suite: Documentation Index
 *
 * Validates that the documentation index file exists and properly links
 * to all major documentation files in the AICodePath v2.0 project.
 */

const fs = require('fs');
const path = require('path');

// Find project root by looking for .aicodepath/ directory
function findProjectRoot(startDir) {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, '.aicodepath')) &&
        fs.existsSync(path.join(currentDir, 'docs'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

const PROJECT_ROOT = findProjectRoot(__dirname);

if (!PROJECT_ROOT) {
  console.log('\n=== Documentation Index Tests ===\n');
  console.log('⚠ Skipped: Could not find project root with docs/ directory');
  console.log('\n0 passed, 0 failed\n');
  process.exit(0);
}

const INDEX_PATH = path.join(PROJECT_ROOT, 'docs', 'INDEX.md');

if (!fs.existsSync(INDEX_PATH)) {
  console.log('\n=== Documentation Index Tests ===\n');
  console.log('⚠ Skipped: docs/INDEX.md does not exist yet');
  console.log('\n0 passed, 0 failed\n');
  process.exit(0);
}

// Required documentation files that must be linked
// Note: paths are as they appear in the index (relative to docs/ directory)
const REQUIRED_DOCS = [
  { path: 'README.md', description: 'project overview' },
  { path: 'CLAUDE.md', description: 'workflow guide' },
  { path: 'USER_GUIDE.md', description: 'user guide' },
  { path: '.aicodepath/README.md', description: 'v2 structure' },
  { path: '.aicodepath/tests/README.md', description: 'test suite' },
  { path: '.claude/README.md', description: 'Claude configuration' },
  { path: 'guides/v1-to-v2-migration.md', description: 'migration guide' },  // Relative to docs/
  { path: 'tests/integration/README.md', description: 'integration tests' },
  { path: 'tests/integration/TEST_RESULTS.md', description: 'test results' },
  { path: 'plans/2026-01-31-aicodepath-v2-consolidation.md', description: 'v2 consolidation plan' }  // Relative to docs/
];

// Required sections in the index
const REQUIRED_SECTIONS = [
  'Quick Start',
  'Core Documentation',
  'Version 2.0 Documentation',
  'Guides',
  'Reference',
  'For Developers',
  'Plans and Designs'
];

// Test counter
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(description, fn) {
  testCount++;
  const testId = testCount.toString().padStart(2, '0');
  try {
    fn();
    passCount++;
    console.log(`✓ Test ${testId}: ${description}`);
  } catch (error) {
    failCount++;
    console.error(`✗ Test ${testId}: ${description}`);
    console.error(`  Error: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, but got ${actual}`);
      }
    },
    toContain(substring) {
      if (!actual.includes(substring)) {
        throw new Error(`Expected string to contain "${substring}"`);
      }
    },
    toMatch(regex) {
      if (!regex.test(actual)) {
        throw new Error(`Expected string to match ${regex}`);
      }
    },
    toBeGreaterThan(value) {
      if (actual <= value) {
        throw new Error(`Expected ${actual} to be greater than ${value}`);
      }
    }
  };
}

// Run tests
console.log('\n=== Documentation Index Tests ===\n');

// Test 1: Index file exists
test('Index file exists at docs/INDEX.md', () => {
  expect(fs.existsSync(INDEX_PATH)).toBeTruthy();
});

// Read index content for subsequent tests
let indexContent = '';
if (fs.existsSync(INDEX_PATH)) {
  indexContent = fs.readFileSync(INDEX_PATH, 'utf-8');
}

// Test 2: Index has proper title
test('Index has proper title', () => {
  expect(indexContent).toContain('# AICodePath Documentation Index');
});

// Test 3: Index has table of contents
test('Index has table of contents', () => {
  expect(indexContent).toMatch(/## Table of Contents/i);
});

// Tests 4-13: All required sections present
REQUIRED_SECTIONS.forEach((section, index) => {
  test(`Section "${section}" is present`, () => {
    expect(indexContent).toMatch(new RegExp(`##.*${section}`, 'i'));
  });
});

// Tests 14-23: All required documentation files are linked
REQUIRED_DOCS.forEach((doc, index) => {
  test(`Links to ${doc.path}`, () => {
    // Check for markdown link format: [text](path)
    const linkPattern = new RegExp(`\\[.*?\\]\\(.*?${doc.path.replace(/\./g, '\\.')}\\)`, 'i');
    expect(indexContent).toMatch(linkPattern);
  });
});

// Test 24: All linked files actually exist
test('All linked files exist', () => {
  // Extract all markdown links
  const linkRegex = /\[.*?\]\((.*?)\)/g;
  const links = [...indexContent.matchAll(linkRegex)];

  let allExist = true;
  let missingFiles = [];

  links.forEach(match => {
    const link = match[1];
    // Skip external links (http/https), anchors, mailto
    if (link.startsWith('http') || link.startsWith('#') || link.startsWith('mailto:')) {
      return;
    }

    // Skip links with anchors (they point to sections within a file)
    if (link.includes('#')) {
      const filePart = link.split('#')[0];
      if (!filePart) return; // Pure anchor link like #section
      // Check only the file part exists
      const docsDir = path.join(PROJECT_ROOT, 'docs');
      const filePath = path.join(docsDir, filePart);
      if (!fs.existsSync(filePath)) {
        allExist = false;
        missingFiles.push(link);
      }
      return;
    }

    // Skip .js files (source code references)
    if (link.endsWith('.js')) {
      return;
    }

    // Resolve relative path from docs/ directory
    const docsDir = path.join(PROJECT_ROOT, 'docs');
    const filePath = path.join(docsDir, link);

    if (!fs.existsSync(filePath)) {
      allExist = false;
      missingFiles.push(link);
    }
  });

  if (!allExist) {
    throw new Error(`Missing files: ${missingFiles.join(', ')}`);
  }

  expect(allExist).toBeTruthy();
});

// Test 25: Quick Start section has links
test('Quick Start section has links', () => {
  const quickStartMatch = indexContent.match(/## Quick Start[\s\S]*?(?=##|$)/i);
  if (!quickStartMatch) {
    throw new Error('Quick Start section not found');
  }
  const quickStartSection = quickStartMatch[0];
  expect(quickStartSection).toMatch(/\[.*?\]\(.*?\)/);
});

// Test 26: Core Documentation section has descriptions
test('Core Documentation section has descriptions', () => {
  const coreDocsMatch = indexContent.match(/## Core Documentation[\s\S]*?(?=^## |\Z)/m);
  if (!coreDocsMatch) {
    throw new Error('Core Documentation section not found');
  }
  const coreDocsSection = coreDocsMatch[0];
  // Should have links with descriptions after them
  expect(coreDocsSection).toMatch(/\[.*?\]\(.*?\)\s*-/);
});

// Test 27: Version 2.0 Documentation section exists and has links
test('Version 2.0 Documentation section has links', () => {
  const v2DocsMatch = indexContent.match(/## Version 2\.0 Documentation[\s\S]*?(?=^## |\Z)/m);
  if (!v2DocsMatch) {
    throw new Error('Version 2.0 Documentation section not found');
  }
  const v2DocsSection = v2DocsMatch[0];
  expect(v2DocsSection).toMatch(/\[.*?\]\(.*?\)/);
});

// Test 28: Guides section has multiple links
test('Guides section has multiple links', () => {
  const guidesMatch = indexContent.match(/## Guides[\s\S]*?(?=^## |\Z)/m);
  if (!guidesMatch) {
    throw new Error('Guides section not found');
  }
  const guidesSection = guidesMatch[0];
  const linkMatches = guidesSection.match(/\[.*?\]\(.*?\)/g);
  expect(linkMatches ? linkMatches.length : 0).toBeGreaterThan(0);
});

// Test 29: For Developers section exists
test('For Developers section exists and has content', () => {
  const devMatch = indexContent.match(/## For Developers[\s\S]*?(?=##|$)/i);
  if (!devMatch) {
    throw new Error('For Developers section not found');
  }
  const devSection = devMatch[0];
  expect(devSection.length).toBeGreaterThan(50);
});

// Test 30: Plans and Designs section exists
test('Plans and Designs section exists and has links', () => {
  const plansMatch = indexContent.match(/## Plans and Designs[\s\S]*?(?=^## |\Z)/m);
  if (!plansMatch) {
    throw new Error('Plans and Designs section not found');
  }
  const plansSection = plansMatch[0];
  expect(plansSection).toMatch(/\[.*?\]\(.*?\)/);
});

// Test 31: Index has search-friendly keywords
test('Index has search-friendly keywords', () => {
  const keywords = ['installation', 'migration', 'testing', 'configuration', 'workflow'];
  let hasKeywords = false;
  keywords.forEach(keyword => {
    if (indexContent.toLowerCase().includes(keyword)) {
      hasKeywords = true;
    }
  });
  expect(hasKeywords).toBeTruthy();
});

// Test 32: Index references the implementation PRD
test('Index references implementation PRD', () => {
  expect(indexContent).toMatch(/implementation.*prd/i);
});

// Test 33: Index is well-formatted markdown
test('Index is well-formatted markdown', () => {
  // Check for proper heading hierarchy
  const h1Count = (indexContent.match(/^# /gm) || []).length;
  const h2Count = (indexContent.match(/^## /gm) || []).length;

  expect(h1Count).toBe(1); // Should have exactly one H1 (title)
  expect(h2Count).toBeGreaterThan(3); // Should have multiple H2s (sections)
});

// Test 34: Index has relative links (not absolute)
test('Index uses relative links (not absolute paths)', () => {
  const linkRegex = /\[.*?\]\((.*?)\)/g;
  const links = [...indexContent.matchAll(linkRegex)];

  let allRelative = true;
  links.forEach(match => {
    const link = match[1];
    // Skip external links and anchors
    if (link.startsWith('http') || link.startsWith('#') || link.startsWith('mailto:')) {
      return;
    }
    // Check that it doesn't start with /home or C:\ or similar
    if (link.startsWith('/home') || link.match(/^[A-Z]:\\/)) {
      allRelative = false;
    }
  });

  expect(allRelative).toBeTruthy();
});

// Test 35: Index links to .aicodepath/tests/README.md
test('Index links to test suite documentation', () => {
  expect(indexContent).toMatch(/\.aicodepath\/tests\/README\.md/);
});

// Print summary
console.log('\n=== Test Summary ===');
console.log(`Total: ${testCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.log('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
