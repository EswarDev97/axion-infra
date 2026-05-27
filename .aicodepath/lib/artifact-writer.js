#!/usr/bin/env node
/**
 * Artifact Writer
 * Foundation library for managing the artifacts table in aicodepath.db
 *
 * Provides CRUD operations for:
 * - Requirements, designs, code, tests, deployment, documentation artifacts
 * - Links between artifacts (implements, derived_from, tests, etc.)
 * - Querying artifacts by type, phase, stage, unit
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { findProjectRoot , getDbPath } = require('./path-resolver');

class ArtifactWriter {
  constructor(projectPath = null) {
    const projectRoot = projectPath || findProjectRoot(process.cwd());
    const dbPath = getDbPath();

    if (!fs.existsSync(dbPath)) {
      throw new Error(
        `Database not found at ${dbPath}. ` +
        `Run ./scripts/init-knowledge-base.sh first.`
      );
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.projectRoot = projectRoot;
  }

  /**
   * Create a new artifact
   *
   * @param {string} type - Artifact type (requirements, design, code, test, deployment, documentation)
   * @param {string} title - Artifact title
   * @param {string} content - Markdown content
   * @param {string} filePath - Path to source file (optional)
   * @param {string} crNumber - Change Request number (optional)
   * @param {string} phase - Phase (inception, construction, operations)
   * @param {string} stage - Stage name (optional)
   * @param {string} unit - Unit name (optional)
   * @param {object} metadata - Additional metadata as JSON (optional)
   * @returns {number} - Artifact ID
   */
  createArtifact(type, title, content, filePath = null, crNumber = null, phase, stage = null, unit = null, metadata = {}) {
    // Validate artifact type
    const validTypes = [
      'requirement', 'requirements',
      'story', 'user-story',
      'design',
      'code',
      'test',
      'deployment',
      'documentation', 'docs',
      'decision',
      'plan'
    ];

    const normalizedType = type.toLowerCase();
    if (!validTypes.includes(normalizedType)) {
      throw new Error(
        `Invalid artifact type: ${type}. ` +
        `Valid types: ${validTypes.join(', ')}`
      );
    }

    // Validate phase
    const validPhases = ['inception', 'construction', 'operations'];
    const normalizedPhase = phase.toLowerCase();
    if (!validPhases.includes(normalizedPhase)) {
      throw new Error(
        `Invalid phase: ${phase}. ` +
        `Valid phases: ${validPhases.join(', ')}`
      );
    }

    // Add CR number to metadata if provided
    const enrichedMetadata = { ...metadata };
    if (crNumber) {
      enrichedMetadata.cr_number = crNumber;
    }

    const stmt = this.db.prepare(`
      INSERT INTO artifacts (
        artifact_type, title, content, file_path, cr_number,
        phase, stage, unit, metadata,
        status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'system')
    `);

    const result = stmt.run(
      normalizedType,
      title,
      content,
      filePath,
      crNumber || 'CR-LEGACY',
      normalizedPhase,
      stage,
      unit,
      JSON.stringify(enrichedMetadata)
    );

    return result.lastInsertRowid;
  }

  /**
   * Update artifact metadata
   *
   * @param {number} id - Artifact ID
   * @param {object} updates - Fields to update
   * @returns {object} - Update result
   */
  updateArtifact(id, updates) {
    const allowedFields = [
      'title', 'content', 'file_path', 'phase', 'stage', 'unit',
      'metadata', 'status', 'version'
    ];

    const updateFields = [];
    const values = [];

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        updateFields.push(`${field} = ?`);
        // JSON stringify metadata if it's an object
        if (field === 'metadata' && typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Always update updated_at timestamp
    updateFields.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE artifacts
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    return stmt.run(...values);
  }

  /**
   * Get artifacts by type
   *
   * @param {string} type - Artifact type
   * @param {object} options - Query options (limit, status)
   * @returns {Array} - Artifacts
   */
  getArtifactsByType(type, options = {}) {
    const { limit = 100, status = 'active' } = options;

    const stmt = this.db.prepare(`
      SELECT id, artifact_type, title, file_path, phase, stage, unit,
             metadata, status, version, created_at, updated_at
      FROM artifacts
      WHERE artifact_type = ? AND status = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(type.toLowerCase(), status, limit);

    // Parse metadata JSON
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * Get artifacts by phase
   *
   * @param {string} phase - Phase name
   * @param {object} options - Query options (stage, unit, limit, status)
   * @returns {Array} - Artifacts
   */
  getArtifactsByPhase(phase, options = {}) {
    const { stage = null, unit = null, limit = 100, status = 'active' } = options;

    let query = `
      SELECT id, artifact_type, title, file_path, phase, stage, unit,
             metadata, status, version, created_at, updated_at
      FROM artifacts
      WHERE phase = ? AND status = ?
    `;

    const params = [phase.toLowerCase(), status];

    if (stage) {
      query += ' AND stage = ?';
      params.push(stage);
    }

    if (unit) {
      query += ' AND unit = ?';
      params.push(unit);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);

    // Parse metadata JSON
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * Get artifact by ID
   *
   * @param {number} id - Artifact ID
   * @returns {object|null} - Artifact or null if not found
   */
  getArtifact(id) {
    const stmt = this.db.prepare(`
      SELECT id, artifact_type, title, content, file_path,
             phase, stage, unit, metadata, status, version,
             created_at, updated_at, created_by
      FROM artifacts
      WHERE id = ?
    `);

    const row = stmt.get(id);

    if (!row) {
      return null;
    }

    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  /**
   * Link artifact to code or other artifact
   *
   * @param {number} artifactId - Source artifact ID
   * @param {number} targetId - Target artifact ID
   * @param {string} linkType - Link type (implements, derived_from, tests, blocks, relates_to)
   * @param {string} description - Link description (optional)
   * @param {number} confidence - Confidence score 0.0-1.0 (default: 1.0)
   * @returns {number} - Link ID
   */
  linkArtifacts(artifactId, targetId, linkType, description = null, confidence = 1.0) {
    const validLinkTypes = [
      'implements', 'derived_from', 'tests', 'blocks', 'relates_to',
      'depends_on', 'supersedes', 'refines'
    ];

    if (!validLinkTypes.includes(linkType)) {
      throw new Error(
        `Invalid link type: ${linkType}. ` +
        `Valid types: ${validLinkTypes.join(', ')}`
      );
    }

    if (confidence < 0.0 || confidence > 1.0) {
      throw new Error('Confidence must be between 0.0 and 1.0');
    }

    const stmt = this.db.prepare(`
      INSERT INTO links (source_id, target_id, link_type, description, confidence)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(source_id, target_id, link_type) DO UPDATE
      SET description = excluded.description,
          confidence = excluded.confidence
    `);

    const result = stmt.run(artifactId, targetId, linkType, description, confidence);
    return result.lastInsertRowid;
  }

  /**
   * Create code traceability link
   *
   * Creates an artifact for the code reference and links it to the source artifact.
   *
   * @param {number} artifactId - Source artifact ID (e.g., requirement, design)
   * @param {string} filePath - Path to code file
   * @param {number} lineStart - Starting line number (optional)
   * @param {number} lineEnd - Ending line number (optional)
   * @param {string} linkType - Link type (default: 'implements')
   * @returns {object} - { codeArtifactId, linkId }
   */
  linkArtifactToCode(artifactId, filePath, lineStart = null, lineEnd = null, linkType = 'implements') {
    // Create code artifact
    const codeMetadata = {};
    if (lineStart !== null) {
      codeMetadata.line_start = lineStart;
    }
    if (lineEnd !== null) {
      codeMetadata.line_end = lineEnd;
    }

    const title = lineStart !== null
      ? `${path.basename(filePath)}:${lineStart}${lineEnd ? `-${lineEnd}` : ''}`
      : path.basename(filePath);

    // Get phase and unit from source artifact
    const sourceArtifact = this.getArtifact(artifactId);
    if (!sourceArtifact) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    const codeArtifactId = this.createArtifact(
      'code',
      title,
      null, // content will be in the file itself
      filePath,
      null, // crNumber
      sourceArtifact.phase,
      sourceArtifact.stage,
      sourceArtifact.unit,
      codeMetadata
    );

    // Link artifacts
    const linkId = this.linkArtifacts(
      artifactId,
      codeArtifactId,
      linkType,
      `Code implementation in ${filePath}`
    );

    return { codeArtifactId, linkId };
  }

  /**
   * Get artifact links
   *
   * @param {number} artifactId - Artifact ID
   * @param {string} direction - 'outbound' (this->other) or 'inbound' (other->this) or 'both'
   * @returns {Array} - Links
   */
  getArtifactLinks(artifactId, direction = 'both') {
    let query;

    if (direction === 'outbound') {
      query = `
        SELECT l.*, a.artifact_type, a.title, a.file_path
        FROM links l
        JOIN artifacts a ON l.target_id = a.id
        WHERE l.source_id = ?
        ORDER BY l.created_at DESC
      `;
    } else if (direction === 'inbound') {
      query = `
        SELECT l.*, a.artifact_type, a.title, a.file_path
        FROM links l
        JOIN artifacts a ON l.source_id = a.id
        WHERE l.target_id = ?
        ORDER BY l.created_at DESC
      `;
    } else {
      query = `
        SELECT l.*, a.artifact_type, a.title, a.file_path,
               CASE WHEN l.source_id = ? THEN 'outbound' ELSE 'inbound' END as direction
        FROM links l
        JOIN artifacts a ON (
          CASE WHEN l.source_id = ? THEN l.target_id ELSE l.source_id END = a.id
        )
        WHERE l.source_id = ? OR l.target_id = ?
        ORDER BY l.created_at DESC
      `;
    }

    const stmt = this.db.prepare(query);
    const params = direction === 'both'
      ? [artifactId, artifactId, artifactId, artifactId]
      : [artifactId];

    return stmt.all(...params);
  }

  /**
   * Search artifacts by title or content
   *
   * @param {string} query - Search query
   * @param {object} options - Search options (type, phase, limit)
   * @returns {Array} - Matching artifacts
   */
  searchArtifacts(query, options = {}) {
    const { type = null, phase = null, limit = 50 } = options;

    let sql = `
      SELECT a.id, a.artifact_type, a.title, a.file_path, a.phase, a.stage, a.unit,
             a.metadata, a.status, a.created_at,
             snippet(artifacts_fts, 1, '<mark>', '</mark>', '...', 32) as snippet
      FROM artifacts_fts
      JOIN artifacts a ON artifacts_fts.rowid = a.id
      WHERE artifacts_fts MATCH ?
    `;

    const params = [query];

    if (type) {
      sql += ' AND a.artifact_type = ?';
      params.push(type.toLowerCase());
    }

    if (phase) {
      sql += ' AND a.phase = ?';
      params.push(phase.toLowerCase());
    }

    sql += ' ORDER BY rank LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);

    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * Archive artifact (soft delete)
   *
   * @param {number} id - Artifact ID
   * @returns {object} - Update result
   */
  archiveArtifact(id) {
    return this.updateArtifact(id, { status: 'archived' });
  }

  /**
   * Delete artifact (hard delete)
   *
   * @param {number} id - Artifact ID
   * @returns {object} - Delete result
   */
  deleteArtifact(id) {
    const stmt = this.db.prepare('DELETE FROM artifacts WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * Get artifact statistics
   *
   * @returns {object} - Statistics by type, phase, and status
   */
  getStatistics() {
    const byType = this.db.prepare(`
      SELECT artifact_type, COUNT(*) as count
      FROM artifacts
      WHERE status = 'active'
      GROUP BY artifact_type
      ORDER BY count DESC
    `).all();

    const byPhase = this.db.prepare(`
      SELECT phase, COUNT(*) as count
      FROM artifacts
      WHERE status = 'active'
      GROUP BY phase
      ORDER BY count DESC
    `).all();

    const byStatus = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM artifacts
      GROUP BY status
    `).all();

    const total = this.db.prepare(`
      SELECT COUNT(*) as count FROM artifacts
    `).get();

    return {
      total: total.count,
      byType,
      byPhase,
      byStatus
    };
  }

  close() {
    this.db.close();
  }
}

module.exports = ArtifactWriter;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    const writer = new ArtifactWriter();

    switch (command) {
      case 'create': {
        // create <type> <title> <phase> [--content=<content>] [--file=<path>] [--stage=<stage>] [--unit=<unit>]
        const type = args[1];
        const title = args[2];
        const phase = args[3];

        if (!type || !title || !phase) {
          console.error('Usage: artifact-writer.js create <type> <title> <phase> [options]');
          process.exit(1);
        }

        const options = {};
        for (let i = 4; i < args.length; i++) {
          const arg = args[i];
          if (arg.startsWith('--content=')) {
            options.content = arg.substring(10);
          } else if (arg.startsWith('--file=')) {
            options.filePath = arg.substring(7);
          } else if (arg.startsWith('--stage=')) {
            options.stage = arg.substring(8);
          } else if (arg.startsWith('--unit=')) {
            options.unit = arg.substring(7);
          }
        }

        const id = writer.createArtifact(
          type,
          title,
          options.content || '',
          options.filePath || null,
          null, // crNumber
          phase,
          options.stage || null,
          options.unit || null
        );

        console.log(`✓ Created artifact #${id}: ${title}`);
        break;
      }

      case 'update': {
        // update <id> <field> <value>
        const id = parseInt(args[1], 10);
        const field = args[2];
        const value = args[3];

        if (!id || !field || !value) {
          console.error('Usage: artifact-writer.js update <id> <field> <value>');
          process.exit(1);
        }

        const updates = { [field]: value };
        writer.updateArtifact(id, updates);

        console.log(`✓ Updated artifact #${id}: ${field} = ${value}`);
        break;
      }

      case 'list': {
        // list [type] [--phase=<phase>] [--stage=<stage>] [--unit=<unit>]
        const type = args[1];
        const options = {};

        for (let i = 2; i < args.length; i++) {
          const arg = args[i];
          if (arg.startsWith('--phase=')) {
            options.phase = arg.substring(8);
          } else if (arg.startsWith('--stage=')) {
            options.stage = arg.substring(8);
          } else if (arg.startsWith('--unit=')) {
            options.unit = arg.substring(7);
          }
        }

        let artifacts;
        if (type) {
          artifacts = writer.getArtifactsByType(type, options);
        } else if (options.phase) {
          artifacts = writer.getArtifactsByPhase(options.phase, options);
        } else {
          // Show statistics if no filters
          const stats = writer.getStatistics();
          console.log('\nArtifact Statistics:');
          console.log('─'.repeat(50));
          console.log(`Total artifacts: ${stats.total}\n`);

          console.log('By Type:');
          stats.byType.forEach(({ artifact_type, count }) => {
            console.log(`  ${artifact_type.padEnd(20)} ${count}`);
          });

          console.log('\nBy Phase:');
          stats.byPhase.forEach(({ phase, count }) => {
            console.log(`  ${phase.padEnd(20)} ${count}`);
          });

          console.log('\nBy Status:');
          stats.byStatus.forEach(({ status, count }) => {
            console.log(`  ${status.padEnd(20)} ${count}`);
          });

          writer.close();
          return;
        }

        console.log(`\nFound ${artifacts.length} artifact(s):\n`);
        artifacts.forEach(a => {
          console.log(`#${a.id.toString().padStart(4)} | ${a.artifact_type.padEnd(15)} | ${a.title}`);
          console.log(`       | ${a.phase}/${a.stage || 'none'}${a.unit ? `/${a.unit}` : ''}`);
          if (a.file_path) {
            console.log(`       | ${a.file_path}`);
          }
          console.log('');
        });
        break;
      }

      case 'show': {
        // show <id>
        const id = parseInt(args[1], 10);

        if (!id) {
          console.error('Usage: artifact-writer.js show <id>');
          process.exit(1);
        }

        const artifact = writer.getArtifact(id);

        if (!artifact) {
          console.error(`Artifact #${id} not found`);
          process.exit(1);
        }

        console.log('\n' + '='.repeat(70));
        console.log(`Artifact #${artifact.id}: ${artifact.title}`);
        console.log('='.repeat(70));
        console.log(`Type:       ${artifact.artifact_type}`);
        console.log(`Phase:      ${artifact.phase}`);
        console.log(`Stage:      ${artifact.stage || 'N/A'}`);
        console.log(`Unit:       ${artifact.unit || 'N/A'}`);
        console.log(`Status:     ${artifact.status}`);
        console.log(`Version:    ${artifact.version}`);
        console.log(`File:       ${artifact.file_path || 'N/A'}`);
        console.log(`Created:    ${artifact.created_at}`);
        console.log(`Updated:    ${artifact.updated_at}`);

        if (Object.keys(artifact.metadata).length > 0) {
          console.log(`\nMetadata:`);
          console.log(JSON.stringify(artifact.metadata, null, 2));
        }

        if (artifact.content) {
          console.log('\nContent:');
          console.log('-'.repeat(70));
          console.log(artifact.content);
        }

        // Show links
        const links = writer.getArtifactLinks(id);
        if (links.length > 0) {
          console.log('\nLinks:');
          console.log('-'.repeat(70));
          links.forEach(link => {
            const dir = link.direction || 'outbound';
            const symbol = dir === 'outbound' ? '→' : '←';
            console.log(`${symbol} ${link.link_type.padEnd(15)} #${link.id} ${link.title}`);
            if (link.file_path) {
              console.log(`  ${link.file_path}`);
            }
          });
        }

        console.log('');
        break;
      }

      case 'link': {
        // link <source-id> <target-id> <link-type> [description]
        const sourceId = parseInt(args[1], 10);
        const targetId = parseInt(args[2], 10);
        const linkType = args[3];
        const description = args[4] || null;

        if (!sourceId || !targetId || !linkType) {
          console.error('Usage: artifact-writer.js link <source-id> <target-id> <link-type> [description]');
          process.exit(1);
        }

        const linkId = writer.linkArtifacts(sourceId, targetId, linkType, description);
        console.log(`✓ Created link #${linkId}: #${sourceId} ${linkType} #${targetId}`);
        break;
      }

      case 'link-code': {
        // link-code <artifact-id> <file-path> [line-start] [line-end]
        const artifactId = parseInt(args[1], 10);
        const filePath = args[2];
        const lineStart = args[3] ? parseInt(args[3], 10) : null;
        const lineEnd = args[4] ? parseInt(args[4], 10) : null;

        if (!artifactId || !filePath) {
          console.error('Usage: artifact-writer.js link-code <artifact-id> <file-path> [line-start] [line-end]');
          process.exit(1);
        }

        const result = writer.linkArtifactToCode(artifactId, filePath, lineStart, lineEnd);
        console.log(`✓ Created code artifact #${result.codeArtifactId} and link #${result.linkId}`);
        break;
      }

      case 'search': {
        // search <query> [--type=<type>] [--phase=<phase>]
        const query = args[1];

        if (!query) {
          console.error('Usage: artifact-writer.js search <query> [options]');
          process.exit(1);
        }

        const options = {};
        for (let i = 2; i < args.length; i++) {
          const arg = args[i];
          if (arg.startsWith('--type=')) {
            options.type = arg.substring(7);
          } else if (arg.startsWith('--phase=')) {
            options.phase = arg.substring(8);
          }
        }

        const results = writer.searchArtifacts(query, options);

        console.log(`\nFound ${results.length} matching artifact(s):\n`);
        results.forEach(a => {
          console.log(`#${a.id.toString().padStart(4)} | ${a.artifact_type.padEnd(15)} | ${a.title}`);
          console.log(`       | ${a.phase}/${a.stage || 'none'}`);
          if (a.snippet) {
            console.log(`       | ${a.snippet}`);
          }
          console.log('');
        });
        break;
      }

      case 'stats': {
        const stats = writer.getStatistics();
        console.log('\nArtifact Statistics:');
        console.log('='.repeat(50));
        console.log(`Total artifacts: ${stats.total}\n`);

        console.log('By Type:');
        stats.byType.forEach(({ artifact_type, count }) => {
          console.log(`  ${artifact_type.padEnd(20)} ${count}`);
        });

        console.log('\nBy Phase:');
        stats.byPhase.forEach(({ phase, count }) => {
          console.log(`  ${phase.padEnd(20)} ${count}`);
        });

        console.log('\nBy Status:');
        stats.byStatus.forEach(({ status, count }) => {
          console.log(`  ${status.padEnd(20)} ${count}`);
        });
        console.log('');
        break;
      }

      case 'archive': {
        // archive <id>
        const id = parseInt(args[1], 10);

        if (!id) {
          console.error('Usage: artifact-writer.js archive <id>');
          process.exit(1);
        }

        writer.archiveArtifact(id);
        console.log(`✓ Archived artifact #${id}`);
        break;
      }

      default:
        console.log(`
Artifact Writer - Foundation library for AICodePath artifacts

Usage: artifact-writer.js <command> [options]

Commands:
  create <type> <title> <phase> [options]
      Create new artifact
      Options:
        --content=<text>      Artifact content (markdown)
        --file=<path>         Path to source file
        --stage=<stage>       Stage name
        --unit=<unit>         Unit name

  update <id> <field> <value>
      Update artifact field

  list [type] [options]
      List artifacts
      Options:
        --phase=<phase>       Filter by phase
        --stage=<stage>       Filter by stage
        --unit=<unit>         Filter by unit

  show <id>
      Show artifact details

  link <source-id> <target-id> <link-type> [description]
      Link two artifacts
      Link types: implements, derived_from, tests, blocks, relates_to

  link-code <artifact-id> <file-path> [line-start] [line-end]
      Link artifact to code file/lines

  search <query> [options]
      Search artifacts by title/content
      Options:
        --type=<type>         Filter by artifact type
        --phase=<phase>       Filter by phase

  stats
      Show artifact statistics

  archive <id>
      Archive artifact (soft delete)

Artifact Types:
  requirement, design, code, test, deployment, documentation,
  decision, plan, story

Phases:
  inception, construction, operations

Examples:
  # Create requirement
  artifact-writer.js create requirement "User Authentication" inception \\
    --content="Users must be able to log in with email and password" \\
    --stage="requirements-analysis"

  # Update artifact
  artifact-writer.js update 5 status completed

  # List all designs
  artifact-writer.js list design

  # Show artifact details
  artifact-writer.js show 10

  # Link requirement to design
  artifact-writer.js link 1 2 derived_from "Auth design derived from requirement"

  # Link design to code
  artifact-writer.js link-code 2 src/auth/auth.controller.ts 15 45

  # Search artifacts
  artifact-writer.js search authentication --type=design

  # Show statistics
  artifact-writer.js stats
        `);
    }

    writer.close();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
