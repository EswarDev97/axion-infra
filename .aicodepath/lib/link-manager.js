#!/usr/bin/env node
/**
 * Link Manager
 * Manages requirement→design→code→test traceability links in the AICodePath database
 *
 * Purpose:
 * - Create and manage traceability links between artifacts
 * - Track requirement coverage (code + tests)
 * - Identify orphaned code (no requirements)
 * - Visualize traceability chains
 *
 * Usage:
 *   const LinkManager = require('./link-manager');
 *   const manager = new LinkManager();
 *   manager.createLink('requirement', reqId, 'code', codeId, 'implements');
 */

const Database = require('better-sqlite3');
const path = require('path');
const { findProjectRoot , getDbPath } = require('./path-resolver');

class LinkManager {
  constructor(projectPath = null) {
    const projectRoot = projectPath || findProjectRoot(process.cwd());
    const dbPath = getDbPath();

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Prepare common statements for performance
    this._prepareStatements();
  }

  /**
   * Prepare common SQL statements
   * @private
   */
  _prepareStatements() {
    this.stmts = {
      createLink: this.db.prepare(`
        INSERT INTO links (source_id, target_id, link_type, description, confidence, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id, target_id, link_type) DO UPDATE SET
          description = excluded.description,
          confidence = excluded.confidence
      `),

      deleteLink: this.db.prepare(`
        DELETE FROM links WHERE id = ?
      `),

      getLinks: this.db.prepare(`
        SELECT
          l.*,
          src.artifact_type AS source_type,
          src.title AS source_title,
          src.file_path AS source_path,
          tgt.artifact_type AS target_type,
          tgt.title AS target_title,
          tgt.file_path AS target_path
        FROM links l
        JOIN artifacts src ON l.source_id = src.id
        JOIN artifacts tgt ON l.target_id = tgt.id
        WHERE src.artifact_type = ? AND l.source_id = ?
        ORDER BY l.created_at DESC
      `),

      getArtifactById: this.db.prepare(`
        SELECT id, artifact_type, title, file_path, phase, unit
        FROM artifacts
        WHERE id = ?
      `),

      getArtifactByTypeAndTitle: this.db.prepare(`
        SELECT id, artifact_type, title, file_path, phase, unit
        FROM artifacts
        WHERE artifact_type = ? AND title LIKE ?
        LIMIT 1
      `)
    };
  }

  /**
   * Create a traceability link between artifacts
   *
   * @param {string|number} sourceTypeOrId - Source artifact type or ID
   * @param {string|number} sourceIdOrTarget - Source ID or target type (if sourceTypeOrId is numeric)
   * @param {string|number} targetTypeOrId - Target type or ID
   * @param {number} targetId - Target artifact ID (optional if using IDs directly)
   * @param {string} linkType - Link type: 'implements', 'tests', 'documents', 'depends_on', 'related_to'
   * @param {object} options - Optional parameters
   * @param {string} options.description - Link description
   * @param {number} options.confidence - Confidence score (0.0-1.0)
   * @param {string} options.createdBy - Creator name
   * @returns {object} Created link info
   *
   * @example
   * // Using artifact IDs directly
   * manager.createLink(1, 2, 'implements');
   *
   * // Using types and IDs
   * manager.createLink('requirement', 1, 'code', 2, 'implements');
   */
  createLink(sourceTypeOrId, sourceIdOrTarget, targetTypeOrId, targetId = null, linkType = null, options = {}) {
    // Handle overloaded parameters
    let sourceId, actualTargetId, actualLinkType;

    if (typeof sourceTypeOrId === 'number') {
      // Direct ID usage: createLink(sourceId, targetId, linkType, options)
      sourceId = sourceTypeOrId;
      actualTargetId = sourceIdOrTarget;
      actualLinkType = targetTypeOrId;
      options = targetId || {};
    } else {
      // Type-based usage: createLink(sourceType, sourceId, targetType, targetId, linkType, options)
      const sourceType = sourceTypeOrId;
      const sourceIdNum = sourceIdOrTarget;
      const targetType = targetTypeOrId;

      sourceId = sourceIdNum;
      actualTargetId = targetId;
      actualLinkType = linkType;

      // Validate artifacts exist and match types
      const sourceArtifact = this.stmts.getArtifactById.get(sourceId);
      const targetArtifact = this.stmts.getArtifactById.get(actualTargetId);

      if (!sourceArtifact) {
        throw new Error(`Source artifact ${sourceId} not found`);
      }
      if (!targetArtifact) {
        throw new Error(`Target artifact ${actualTargetId} not found`);
      }
      if (sourceArtifact.artifact_type !== sourceType) {
        throw new Error(`Source artifact ${sourceId} is ${sourceArtifact.artifact_type}, expected ${sourceType}`);
      }
      if (targetArtifact.artifact_type !== targetType) {
        throw new Error(`Target artifact ${actualTargetId} is ${targetArtifact.artifact_type}, expected ${targetType}`);
      }
    }

    // Validate link type
    const validLinkTypes = ['implements', 'tests', 'documents', 'depends_on', 'related_to', 'derived_from', 'blocks'];
    if (!validLinkTypes.includes(actualLinkType)) {
      throw new Error(`Invalid link type: ${actualLinkType}. Must be one of: ${validLinkTypes.join(', ')}`);
    }

    // Extract options
    const {
      description = null,
      confidence = 1.0,
      createdBy = 'system'
    } = options;

    // Create link
    const result = this.stmts.createLink.run(
      sourceId,
      actualTargetId,
      actualLinkType,
      description,
      confidence,
      createdBy
    );

    return {
      id: result.lastInsertRowid,
      source_id: sourceId,
      target_id: actualTargetId,
      link_type: actualLinkType,
      description,
      confidence,
      created_by: createdBy
    };
  }

  /**
   * Delete a link by ID
   *
   * @param {number} id - Link ID
   * @returns {boolean} True if deleted, false if not found
   */
  deleteLink(id) {
    const result = this.stmts.deleteLink.run(id);
    return result.changes > 0;
  }

  /**
   * Get all links from a source artifact
   *
   * @param {string} sourceType - Source artifact type
   * @param {number} sourceId - Source artifact ID
   * @returns {Array} Array of links with artifact details
   */
  getLinks(sourceType, sourceId) {
    return this.stmts.getLinks.all(sourceType, sourceId);
  }

  /**
   * Get full traceability chain for a requirement
   *
   * Chain structure: requirement → design → code → test
   *
   * @param {number} requirementId - Requirement artifact ID
   * @returns {object} Traceability chain with all linked artifacts
   */
  getTraceabilityChain(requirementId) {
    // Get requirement details
    const requirement = this.stmts.getArtifactById.get(requirementId);
    if (!requirement) {
      throw new Error(`Requirement ${requirementId} not found`);
    }
    if (requirement.artifact_type !== 'requirement') {
      throw new Error(`Artifact ${requirementId} is ${requirement.artifact_type}, not a requirement`);
    }

    // Build chain using recursive query
    const chain = this.db.prepare(`
      WITH RECURSIVE trace AS (
        -- Start with the requirement
        SELECT
          id,
          artifact_type,
          title,
          file_path,
          phase,
          unit,
          0 AS depth,
          '' AS link_type_to_here
        FROM artifacts
        WHERE id = ?

        UNION ALL

        -- Follow links to downstream artifacts
        SELECT
          a.id,
          a.artifact_type,
          a.title,
          a.file_path,
          a.phase,
          a.unit,
          t.depth + 1,
          l.link_type
        FROM trace t
        JOIN links l ON t.id = l.source_id
        JOIN artifacts a ON l.target_id = a.id
        WHERE t.depth < 10  -- Prevent infinite loops
      )
      SELECT * FROM trace
      ORDER BY depth, artifact_type
    `).all(requirementId);

    // Organize by artifact type
    const organized = {
      requirement: chain.find(a => a.artifact_type === 'requirement'),
      stories: chain.filter(a => a.artifact_type === 'story'),
      designs: chain.filter(a => a.artifact_type === 'design'),
      code: chain.filter(a => a.artifact_type === 'code'),
      tests: chain.filter(a => a.artifact_type === 'test')
    };

    return organized;
  }

  /**
   * Validate requirement coverage
   *
   * Checks if a requirement has:
   * - At least one code implementation
   * - At least one test
   *
   * @param {number} requirementId - Requirement artifact ID
   * @returns {object} Coverage status
   */
  validateCoverage(requirementId) {
    const chain = this.getTraceabilityChain(requirementId);

    const hasCode = chain.code.length > 0;
    const hasTests = chain.tests.length > 0;
    const hasDesign = chain.designs.length > 0;

    const coverage = {
      requirement_id: requirementId,
      requirement_title: chain.requirement?.title,
      has_design: hasDesign,
      has_code: hasCode,
      has_tests: hasTests,
      is_complete: hasCode && hasTests,
      design_count: chain.designs.length,
      code_count: chain.code.length,
      test_count: chain.tests.length,
      story_count: chain.stories.length,
      issues: []
    };

    // Identify issues
    if (!hasDesign) {
      coverage.issues.push('No design artifacts linked');
    }
    if (!hasCode) {
      coverage.issues.push('No code implementation linked');
    }
    if (!hasTests) {
      coverage.issues.push('No tests linked');
    }

    return coverage;
  }

  /**
   * Find orphaned code (code without requirements)
   *
   * Orphaned code is risky because:
   * - No requirements = unclear purpose
   * - No traceability = can't validate correctness
   * - Maintenance risk = unclear impact of changes
   *
   * @returns {Array} Array of code artifacts without requirement links
   */
  getOrphanedCode() {
    const orphans = this.db.prepare(`
      SELECT
        c.id,
        c.artifact_type,
        c.title,
        c.file_path,
        c.phase,
        c.unit,
        c.created_at
      FROM artifacts c
      WHERE c.artifact_type = 'code'
        AND c.status = 'active'
        AND NOT EXISTS (
          -- Check if there's any path to a requirement
          WITH RECURSIVE upstream AS (
            SELECT target_id AS artifact_id, 0 AS depth
            FROM links
            WHERE source_id = c.id

            UNION ALL

            SELECT l.target_id, u.depth + 1
            FROM upstream u
            JOIN links l ON u.artifact_id = l.source_id
            WHERE u.depth < 10
          )
          SELECT 1
          FROM upstream u
          JOIN artifacts a ON u.artifact_id = a.id
          WHERE a.artifact_type = 'requirement'
        )
      ORDER BY c.created_at DESC
    `).all();

    return orphans;
  }

  /**
   * Get link statistics
   *
   * @returns {object} Link statistics by type
   */
  getStatistics() {
    const stats = this.db.prepare(`
      SELECT
        link_type,
        COUNT(*) AS count,
        AVG(confidence) AS avg_confidence
      FROM links
      GROUP BY link_type
      ORDER BY count DESC
    `).all();

    const artifactCounts = this.db.prepare(`
      SELECT
        artifact_type,
        COUNT(*) AS count
      FROM artifacts
      WHERE status = 'active'
      GROUP BY artifact_type
    `).all();

    const orphanedCount = this.getOrphanedCode().length;

    return {
      links_by_type: stats,
      artifacts_by_type: artifactCounts,
      orphaned_code_count: orphanedCount
    };
  }

  /**
   * Bulk create links from a mapping file
   *
   * @param {Array} links - Array of link objects
   * @returns {object} Creation results
   */
  bulkCreateLinks(links) {
    const createMany = this.db.transaction((linkList) => {
      const results = {
        created: 0,
        updated: 0,
        errors: []
      };

      for (const link of linkList) {
        try {
          const info = this.createLink(
            link.source_id,
            link.target_id,
            link.link_type,
            link
          );

          if (info.id) {
            results.created++;
          } else {
            results.updated++;
          }
        } catch (error) {
          results.errors.push({
            link,
            error: error.message
          });
        }
      }

      return results;
    });

    return createMany(links);
  }

  /**
   * Find missing test coverage
   *
   * @returns {Array} Code artifacts without test links
   */
  getMissingTestCoverage() {
    return this.db.prepare(`
      SELECT
        c.id,
        c.title,
        c.file_path,
        c.unit
      FROM artifacts c
      WHERE c.artifact_type = 'code'
        AND c.status = 'active'
        AND NOT EXISTS (
          SELECT 1
          FROM links l
          JOIN artifacts t ON l.target_id = t.id
          WHERE l.source_id = c.id
            AND l.link_type = 'tests'
            AND t.artifact_type = 'test'
        )
      ORDER BY c.created_at DESC
    `).all();
  }

  close() {
    this.db.close();
  }
}

module.exports = LinkManager;

// ============================================================================
// CLI INTERFACE
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const manager = new LinkManager();

  try {
    switch (command) {
      case 'link': {
        // link <source-type> <source-id> <target-type> <target-id> [link-type]
        const [, sourceType, sourceId, targetType, targetId, linkType] = args;

        if (!sourceType || !sourceId || !targetType || !targetId) {
          console.error('Usage: link <source-type> <source-id> <target-type> <target-id> [link-type]');
          process.exit(1);
        }

        const actualLinkType = linkType || 'related_to';
        const result = manager.createLink(
          sourceType,
          parseInt(sourceId),
          targetType,
          parseInt(targetId),
          actualLinkType
        );

        console.log(`✓ Created ${actualLinkType} link: ${sourceType}#${sourceId} → ${targetType}#${targetId}`);
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'delete': {
        // delete <link-id>
        const [, linkId] = args;

        if (!linkId) {
          console.error('Usage: delete <link-id>');
          process.exit(1);
        }

        const deleted = manager.deleteLink(parseInt(linkId));
        if (deleted) {
          console.log(`✓ Deleted link #${linkId}`);
        } else {
          console.log(`✗ Link #${linkId} not found`);
          process.exit(1);
        }
        break;
      }

      case 'links': {
        // links <source-type> <source-id>
        const [, sourceType, sourceId] = args;

        if (!sourceType || !sourceId) {
          console.error('Usage: links <source-type> <source-id>');
          process.exit(1);
        }

        const links = manager.getLinks(sourceType, parseInt(sourceId));

        if (links.length === 0) {
          console.log(`No links found for ${sourceType}#${sourceId}`);
        } else {
          console.log(`\nLinks from ${sourceType}#${sourceId}:\n`);
          for (const link of links) {
            console.log(`  [${link.link_type}] → ${link.target_type}#${link.target_id}: ${link.target_title}`);
            if (link.description) {
              console.log(`    Description: ${link.description}`);
            }
            console.log(`    Confidence: ${link.confidence}, Created: ${link.created_at}`);
            console.log('');
          }
        }
        break;
      }

      case 'chain': {
        // chain <requirement-id>
        const [, requirementId] = args;

        if (!requirementId) {
          console.error('Usage: chain <requirement-id>');
          process.exit(1);
        }

        const chain = manager.getTraceabilityChain(parseInt(requirementId));

        console.log(`\nTraceability Chain for Requirement #${requirementId}:\n`);
        console.log(`Requirement: ${chain.requirement?.title || 'NOT FOUND'}`);

        console.log(`\nStories (${chain.stories.length}):`);
        chain.stories.forEach(s => console.log(`  - ${s.title} (${s.file_path || 'no path'})`));

        console.log(`\nDesigns (${chain.designs.length}):`);
        chain.designs.forEach(d => console.log(`  - ${d.title} (${d.file_path || 'no path'})`));

        console.log(`\nCode (${chain.code.length}):`);
        chain.code.forEach(c => console.log(`  - ${c.title} (${c.file_path || 'no path'})`));

        console.log(`\nTests (${chain.tests.length}):`);
        chain.tests.forEach(t => console.log(`  - ${t.title} (${t.file_path || 'no path'})`));

        console.log('');
        break;
      }

      case 'coverage': {
        // coverage <requirement-id>
        const [, requirementId] = args;

        if (!requirementId) {
          console.error('Usage: coverage <requirement-id>');
          process.exit(1);
        }

        const coverage = manager.validateCoverage(parseInt(requirementId));

        console.log(`\nCoverage Report for: ${coverage.requirement_title}\n`);
        console.log(`  Design:  ${coverage.has_design ? '✓' : '✗'} (${coverage.design_count} artifacts)`);
        console.log(`  Code:    ${coverage.has_code ? '✓' : '✗'} (${coverage.code_count} artifacts)`);
        console.log(`  Tests:   ${coverage.has_tests ? '✓' : '✗'} (${coverage.test_count} artifacts)`);
        console.log(`\n  Overall: ${coverage.is_complete ? '✓ COMPLETE' : '✗ INCOMPLETE'}`);

        if (coverage.issues.length > 0) {
          console.log(`\nIssues:`);
          coverage.issues.forEach(issue => console.log(`  - ${issue}`));
        }
        console.log('');
        break;
      }

      case 'orphans': {
        // orphans
        const orphans = manager.getOrphanedCode();

        console.log(`\nOrphaned Code (${orphans.length}):\n`);

        if (orphans.length === 0) {
          console.log('  No orphaned code found! All code is linked to requirements.');
        } else {
          orphans.forEach(orphan => {
            console.log(`  - ${orphan.title}`);
            console.log(`    File: ${orphan.file_path || 'no path'}`);
            console.log(`    Unit: ${orphan.unit || 'no unit'}`);
            console.log(`    Created: ${orphan.created_at}`);
            console.log('');
          });
        }
        break;
      }

      case 'missing-tests': {
        // missing-tests
        const missing = manager.getMissingTestCoverage();

        console.log(`\nCode Missing Test Coverage (${missing.length}):\n`);

        if (missing.length === 0) {
          console.log('  All code has test coverage!');
        } else {
          missing.forEach(code => {
            console.log(`  - ${code.title}`);
            console.log(`    File: ${code.file_path || 'no path'}`);
            console.log(`    Unit: ${code.unit || 'no unit'}`);
            console.log('');
          });
        }
        break;
      }

      case 'stats': {
        // stats
        const stats = manager.getStatistics();

        console.log(`\nLink Statistics:\n`);
        console.log('Links by Type:');
        stats.links_by_type.forEach(stat => {
          console.log(`  ${stat.link_type}: ${stat.count} (avg confidence: ${stat.avg_confidence.toFixed(2)})`);
        });

        console.log(`\nArtifacts by Type:`);
        stats.artifacts_by_type.forEach(stat => {
          console.log(`  ${stat.artifact_type}: ${stat.count}`);
        });

        console.log(`\nOrphaned Code: ${stats.orphaned_code_count}`);
        console.log('');
        break;
      }

      default:
        console.log(`
AICodePath Link Manager - Traceability Link Management

Usage: link-manager.js <command> [options]

Commands:
  link <source-type> <source-id> <target-type> <target-id> [link-type]
      Create a traceability link between artifacts
      Link types: implements, tests, documents, depends_on, related_to

  delete <link-id>
      Delete a link by ID

  links <source-type> <source-id>
      Show all links from a source artifact

  chain <requirement-id>
      Show full traceability chain: requirement → design → code → test

  coverage <requirement-id>
      Check if requirement has code + tests

  orphans
      List code artifacts without requirement links

  missing-tests
      List code artifacts without test links

  stats
      Show link statistics

Examples:
  # Link requirement to code
  link-manager.js link requirement 1 code 5 implements

  # Show all links from requirement
  link-manager.js links requirement 1

  # Check requirement coverage
  link-manager.js coverage 1

  # Find orphaned code
  link-manager.js orphans

  # View traceability chain
  link-manager.js chain 1

Link Types:
  - implements: Target implements source (design → code, requirement → design)
  - tests: Target tests source (code → test)
  - documents: Target documents source (design → documentation)
  - depends_on: Source depends on target (code → library)
  - related_to: Generic relationship
  - derived_from: Target derived from source (story → requirement)
  - blocks: Source blocks target (issue → feature)

Traceability Best Practices:
  1. Link requirements to designs: requirement → design (implements)
  2. Link designs to code: design → code (implements)
  3. Link code to tests: code → test (tests)
  4. Link stories to requirements: story → requirement (derived_from)
  5. Run 'orphans' regularly to find unlinked code
  6. Run 'missing-tests' to ensure test coverage
        `);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    manager.close();
  }
}
