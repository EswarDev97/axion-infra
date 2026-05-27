#!/usr/bin/env node
/**
 * Link Manager - Practical Examples
 *
 * This file contains real-world usage examples for the Link Manager library.
 * Use these as templates for integrating traceability into your workflow.
 */

const LinkManager = require('../link-manager');

// =============================================================================
// Example 1: Basic Workflow - Link Requirement to Implementation
// =============================================================================

function example1_BasicWorkflow() {
  console.log('\n=== Example 1: Basic Workflow ===\n');

  const manager = new LinkManager();

  try {
    // Scenario: After creating a design from a requirement
    const requirementId = 1;
    const designId = 2;

    const link = manager.createLink(
      'requirement',
      requirementId,
      'design',
      designId,
      'implements',
      {
        description: 'Authentication design implements login requirement',
        confidence: 1.0,
        createdBy: 'design-agent'
      }
    );

    console.log('✓ Linked requirement to design:', link.id);
  } finally {
    manager.close();
  }
}

// =============================================================================
// Example 2: Complete Traceability Chain
// =============================================================================

function example2_CompleteChain() {
  console.log('\n=== Example 2: Complete Traceability Chain ===\n');

  const manager = new LinkManager();

  try {
    // Build complete chain: requirement → design → code → test
    const links = [
      { source_id: 1, target_id: 2, link_type: 'implements' },  // req → design
      { source_id: 2, target_id: 3, link_type: 'implements' },  // design → code
      // { source_id: 3, target_id: 10, link_type: 'tests' }   // code → test (uncomment if test exists)
    ];

    const results = manager.bulkCreateLinks(links);
    console.log(`✓ Created ${results.created} links`);

    // Verify chain
    const chain = manager.getTraceabilityChain(1);
    console.log(`\nChain for requirement #1:`);
    console.log(`  Designs: ${chain.designs.length}`);
    console.log(`  Code: ${chain.code.length}`);
    console.log(`  Tests: ${chain.tests.length}`);
  } finally {
    manager.close();
  }
}

// =============================================================================
// Example 3: Pre-Deployment Validation
// =============================================================================

function example3_PreDeploymentCheck() {
  console.log('\n=== Example 3: Pre-Deployment Validation ===\n');

  const manager = new LinkManager();

  try {
    // Check all requirements for coverage
    const requirements = manager.db.prepare(`
      SELECT id, title FROM artifacts
      WHERE artifact_type = 'requirement' AND status = 'active'
    `).all();

    let incomplete = [];

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

    if (incomplete.length === 0) {
      console.log('✓ All requirements have code + tests');
      return true;
    } else {
      console.log(`✗ ${incomplete.length} requirements incomplete:`);
      incomplete.forEach(req => {
        console.log(`\n  ${req.title}:`);
        req.issues.forEach(issue => console.log(`    - ${issue}`));
      });
      return false;
    }
  } finally {
    manager.close();
  }
}

// =============================================================================
// Example 4: Orphaned Code Report
// =============================================================================

function example4_OrphanReport() {
  console.log('\n=== Example 4: Orphaned Code Report ===\n');

  const manager = new LinkManager();

  try {
    const orphans = manager.getOrphanedCode();

    if (orphans.length === 0) {
      console.log('✓ No orphaned code found!');
      return;
    }

    console.log(`Found ${orphans.length} orphaned code files:\n`);

    // Group by unit
    const byUnit = {};
    orphans.forEach(orphan => {
      const unit = orphan.unit || 'unassigned';
      if (!byUnit[unit]) byUnit[unit] = [];
      byUnit[unit].push(orphan);
    });

    Object.keys(byUnit).forEach(unit => {
      console.log(`[${unit}]`);
      byUnit[unit].forEach(orphan => {
        console.log(`  - ${orphan.title} (${orphan.file_path})`);
      });
      console.log('');
    });

    console.log('Action: Link these to requirements or document as infrastructure code.');
  } finally {
    manager.close();
  }
}

// =============================================================================
// Example 5: Test Coverage Report
// =============================================================================

function example5_TestCoverageReport() {
  console.log('\n=== Example 5: Test Coverage Report ===\n');

  const manager = new LinkManager();

  try {
    const missing = manager.getMissingTestCoverage();

    if (missing.length === 0) {
      console.log('✓ All code has test coverage!');
      return;
    }

    console.log(`${missing.length} code files missing tests:\n`);

    // Show by unit
    const byUnit = {};
    missing.forEach(code => {
      const unit = code.unit || 'unassigned';
      if (!byUnit[unit]) byUnit[unit] = [];
      byUnit[unit].push(code);
    });

    Object.keys(byUnit).forEach(unit => {
      console.log(`[${unit}] - ${byUnit[unit].length} files`);
      byUnit[unit].slice(0, 3).forEach(code => {
        console.log(`  - ${code.title}`);
      });
      if (byUnit[unit].length > 3) {
        console.log(`  ... and ${byUnit[unit].length - 3} more`);
      }
      console.log('');
    });
  } finally {
    manager.close();
  }
}

// =============================================================================
// Example 6: Link Dependency Graph
// =============================================================================

function example6_DependencyGraph() {
  console.log('\n=== Example 6: Dependency Graph ===\n');

  const manager = new LinkManager();

  try {
    // Get all dependencies
    const dependencies = manager.db.prepare(`
      SELECT
        src.title AS source,
        tgt.title AS target,
        l.link_type
      FROM links l
      JOIN artifacts src ON l.source_id = src.id
      JOIN artifacts tgt ON l.target_id = tgt.id
      WHERE l.link_type = 'depends_on'
      ORDER BY src.title
    `).all();

    if (dependencies.length === 0) {
      console.log('No dependency links found.');
      return;
    }

    console.log('Dependency Graph:\n');
    dependencies.forEach(dep => {
      console.log(`  ${dep.source} → ${dep.target}`);
    });
  } finally {
    manager.close();
  }
}

// =============================================================================
// Example 7: Auto-Link Code to Design (Pattern Matching)
// =============================================================================

function example7_AutoLinkPattern() {
  console.log('\n=== Example 7: Auto-Link by Pattern ===\n');

  const manager = new LinkManager();

  try {
    // Find code files that match design artifact names
    const designs = manager.db.prepare(`
      SELECT id, title FROM artifacts WHERE artifact_type = 'design'
    `).all();

    const code = manager.db.prepare(`
      SELECT id, title, file_path FROM artifacts WHERE artifact_type = 'code'
    `).all();

    let linked = 0;

    designs.forEach(design => {
      // Extract key terms from design title
      const designTerms = design.title.toLowerCase().split(/\s+/);

      code.forEach(c => {
        // Check if code title/path contains design terms
        const codeText = (c.title + ' ' + (c.file_path || '')).toLowerCase();

        const matches = designTerms.some(term => {
          return term.length > 3 && codeText.includes(term);
        });

        if (matches) {
          try {
            manager.createLink('design', design.id, 'code', c.id, 'implements', {
              description: 'Auto-linked by pattern matching',
              confidence: 0.7,  // Lower confidence for automated links
              createdBy: 'auto-linker'
            });
            console.log(`  Linked: "${design.title}" → "${c.title}"`);
            linked++;
          } catch (e) {
            // Link may already exist
          }
        }
      });
    });

    console.log(`\n✓ Auto-linked ${linked} code files to designs`);
    console.log('Note: Review and adjust confidence scores manually.');
  } finally {
    manager.close();
  }
}

// =============================================================================
// Example 8: Requirement Impact Analysis
// =============================================================================

function example8_ImpactAnalysis(requirementId) {
  console.log('\n=== Example 8: Requirement Impact Analysis ===\n');

  const manager = new LinkManager();

  try {
    const chain = manager.getTraceabilityChain(requirementId);

    console.log(`Impact of changing requirement #${requirementId}:\n`);
    console.log(`Requirement: ${chain.requirement?.title}\n`);

    console.log(`Affected Artifacts:`);
    console.log(`  ${chain.designs.length} design document(s)`);
    console.log(`  ${chain.code.length} code file(s)`);
    console.log(`  ${chain.tests.length} test file(s)\n`);

    if (chain.code.length > 0) {
      console.log('Code Files to Update:');
      chain.code.forEach(c => console.log(`  - ${c.file_path || c.title}`));
    }

    if (chain.tests.length > 0) {
      console.log('\nTests to Update:');
      chain.tests.forEach(t => console.log(`  - ${t.file_path || t.title}`));
    }

    console.log(`\nTotal Impact: ${chain.designs.length + chain.code.length + chain.tests.length} files`);
  } finally {
    manager.close();
  }
}

// =============================================================================
// Run Examples
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const example = args[0] || 'all';

  console.log('Link Manager - Practical Examples');
  console.log('='.repeat(60));

  switch (example) {
    case '1':
      example1_BasicWorkflow();
      break;
    case '2':
      example2_CompleteChain();
      break;
    case '3':
      example3_PreDeploymentCheck();
      break;
    case '4':
      example4_OrphanReport();
      break;
    case '5':
      example5_TestCoverageReport();
      break;
    case '6':
      example6_DependencyGraph();
      break;
    case '7':
      example7_AutoLinkPattern();
      break;
    case '8':
      example8_ImpactAnalysis(1);
      break;
    case 'all':
      example1_BasicWorkflow();
      example2_CompleteChain();
      example3_PreDeploymentCheck();
      example4_OrphanReport();
      example5_TestCoverageReport();
      example6_DependencyGraph();
      example7_AutoLinkPattern();
      example8_ImpactAnalysis(1);
      break;
    default:
      console.log(`
Usage: node link-manager-examples.js [example-number]

Examples:
  1 - Basic Workflow
  2 - Complete Traceability Chain
  3 - Pre-Deployment Validation
  4 - Orphaned Code Report
  5 - Test Coverage Report
  6 - Dependency Graph
  7 - Auto-Link by Pattern
  8 - Requirement Impact Analysis
  all - Run all examples

Run specific example:
  node link-manager-examples.js 3
      `);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Examples complete!\n');
}

module.exports = {
  example1_BasicWorkflow,
  example2_CompleteChain,
  example3_PreDeploymentCheck,
  example4_OrphanReport,
  example5_TestCoverageReport,
  example6_DependencyGraph,
  example7_AutoLinkPattern,
  example8_ImpactAnalysis
};
