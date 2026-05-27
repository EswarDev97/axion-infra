/**
 * Link Manager Test Suite
 *
 * Demonstrates all link-manager features with practical examples
 */

const LinkManager = require('../link-manager');
const Database = require('better-sqlite3');
const path = require('path');
const { findProjectRoot } = require('../path-resolver');

// Test database path
const projectRoot = findProjectRoot(process.cwd());
const dbPath = path.join(projectRoot, 'aicodepath-docs', 'aicodepath.db');

console.log('Link Manager Feature Test\n');
console.log('='.repeat(60));

// Test 1: Basic Link Creation
console.log('\nTest 1: Create Links');
console.log('-'.repeat(60));

const manager = new LinkManager();

try {
  // Create requirement → design link
  const link1 = manager.createLink('requirement', 1, 'design', 2, 'implements', {
    description: 'Auth requirement implemented by design',
    confidence: 0.95,
    createdBy: 'test-suite'
  });
  console.log('✓ Created requirement → design link:', link1.id);

  // Create design → code link
  const link2 = manager.createLink('design', 2, 'code', 3, 'implements', {
    description: 'Design implemented by code',
    createdBy: 'test-suite'
  });
  console.log('✓ Created design → code link:', link2.id);

  // Create code → test link (if test exists)
  const testArtifact = manager.db.prepare(`
    SELECT id FROM artifacts WHERE artifact_type = 'test' LIMIT 1
  `).get();

  if (testArtifact) {
    const link3 = manager.createLink('code', 3, 'test', testArtifact.id, 'tests');
    console.log('✓ Created code → test link:', link3.id);
  } else {
    console.log('⊘ Skipped test link (no test artifacts)');
  }

} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 2: Get Links
console.log('\nTest 2: Get Links from Artifact');
console.log('-'.repeat(60));

try {
  const links = manager.getLinks('requirement', 1);
  console.log(`Found ${links.length} link(s) from requirement #1:`);

  links.forEach(link => {
    console.log(`  → [${link.link_type}] ${link.target_type}#${link.target_id}: ${link.target_title}`);
    console.log(`    Confidence: ${link.confidence}`);
  });
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 3: Traceability Chain
console.log('\nTest 3: Traceability Chain');
console.log('-'.repeat(60));

try {
  const chain = manager.getTraceabilityChain(1);

  console.log('Requirement:', chain.requirement?.title || 'NOT FOUND');
  console.log('Stories:', chain.stories.length);
  console.log('Designs:', chain.designs.length);
  console.log('Code:', chain.code.length);
  console.log('Tests:', chain.tests.length);

  if (chain.code.length > 0) {
    console.log('\nCode artifacts:');
    chain.code.forEach(c => console.log(`  - ${c.title}`));
  }
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 4: Coverage Validation
console.log('\nTest 4: Coverage Validation');
console.log('-'.repeat(60));

try {
  const coverage = manager.validateCoverage(1);

  console.log('Requirement:', coverage.requirement_title);
  console.log('Has Design:', coverage.has_design ? '✓' : '✗');
  console.log('Has Code:', coverage.has_code ? '✓' : '✗');
  console.log('Has Tests:', coverage.has_tests ? '✓' : '✗');
  console.log('Complete:', coverage.is_complete ? '✓ YES' : '✗ NO');

  if (coverage.issues.length > 0) {
    console.log('\nIssues:');
    coverage.issues.forEach(issue => console.log(`  - ${issue}`));
  }
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 5: Orphaned Code
console.log('\nTest 5: Orphaned Code Detection');
console.log('-'.repeat(60));

try {
  const orphans = manager.getOrphanedCode();
  console.log(`Found ${orphans.length} orphaned code artifact(s)`);

  if (orphans.length > 0) {
    orphans.slice(0, 3).forEach(orphan => {
      console.log(`  - ${orphan.title}`);
      console.log(`    File: ${orphan.file_path || 'no path'}`);
    });

    if (orphans.length > 3) {
      console.log(`  ... and ${orphans.length - 3} more`);
    }
  }
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 6: Missing Test Coverage
console.log('\nTest 6: Missing Test Coverage');
console.log('-'.repeat(60));

try {
  const missing = manager.getMissingTestCoverage();
  console.log(`Found ${missing.length} code artifact(s) without tests`);

  if (missing.length > 0) {
    missing.slice(0, 3).forEach(code => {
      console.log(`  - ${code.title}`);
    });

    if (missing.length > 3) {
      console.log(`  ... and ${missing.length - 3} more`);
    }
  }
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 7: Statistics
console.log('\nTest 7: Link Statistics');
console.log('-'.repeat(60));

try {
  const stats = manager.getStatistics();

  console.log('Links by Type:');
  stats.links_by_type.forEach(stat => {
    console.log(`  ${stat.link_type}: ${stat.count} (avg confidence: ${stat.avg_confidence.toFixed(2)})`);
  });

  console.log('\nArtifacts by Type:');
  stats.artifacts_by_type.forEach(stat => {
    console.log(`  ${stat.artifact_type}: ${stat.count}`);
  });

  console.log(`\nOrphaned Code: ${stats.orphaned_code_count}`);
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 8: Bulk Operations
console.log('\nTest 8: Bulk Link Creation');
console.log('-'.repeat(60));

try {
  // Get some artifacts to link
  const requirements = manager.db.prepare(`
    SELECT id FROM artifacts WHERE artifact_type = 'requirement' LIMIT 2
  `).all();

  const designs = manager.db.prepare(`
    SELECT id FROM artifacts WHERE artifact_type = 'design' LIMIT 2
  `).all();

  if (requirements.length >= 2 && designs.length >= 2) {
    const bulkLinks = [
      {
        source_id: requirements[0].id,
        target_id: designs[0].id,
        link_type: 'implements',
        description: 'Bulk link 1',
        createdBy: 'test-suite'
      },
      {
        source_id: requirements[1].id,
        target_id: designs[1].id,
        link_type: 'implements',
        description: 'Bulk link 2',
        createdBy: 'test-suite'
      }
    ];

    const results = manager.bulkCreateLinks(bulkLinks);
    console.log(`✓ Bulk operation complete:`);
    console.log(`  Created: ${results.created}`);
    console.log(`  Updated: ${results.updated}`);
    console.log(`  Errors: ${results.errors.length}`);
  } else {
    console.log('⊘ Skipped (not enough artifacts)');
  }
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 9: Direct ID Usage
console.log('\nTest 9: Direct ID Usage (Alternative API)');
console.log('-'.repeat(60));

try {
  // Using direct IDs without type validation
  const directLink = manager.createLink(1, 2, 'related_to', {
    description: 'Direct ID link',
    createdBy: 'test-suite'
  });
  console.log('✓ Created link using direct IDs:', directLink.id);
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Cleanup
console.log('\n' + '='.repeat(60));
console.log('Test suite complete!\n');

manager.close();
