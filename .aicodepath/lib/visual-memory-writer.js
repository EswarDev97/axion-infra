#!/usr/bin/env node
/**
 * Visual Memory Writer
 * Manages visual diagrams storage in the AICodePath database and file system
 *
 * Features:
 * - Store Mermaid diagrams with metadata
 * - Track entity links for traceability
 * - Maintain version history
 * - Support staleness detection
 * - Write to file system (.aicodepath-docs/memory/)
 *
 * @module lib/visual-memory-writer
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { findProjectRoot , getDbPath } = require('./path-resolver');

class VisualMemoryWriter {
  constructor(projectPath = null) {
    const projectRoot = projectPath || findProjectRoot(process.cwd());
    const dbPath = getDbPath();

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.projectRoot = projectRoot;
    this.memoryDir = path.join(projectRoot, 'aicodepath-docs', 'memory');
  }

  /**
   * Initialize the memory folder structure
   * Creates the directory hierarchy for storing diagrams
   */
  initializeMemoryFolder() {
    const directories = [
      this.memoryDir,
      path.join(this.memoryDir, 'global'),
      path.join(this.memoryDir, 'global', 'flowcharts'),
      path.join(this.memoryDir, 'global', 'sequence'),
      path.join(this.memoryDir, 'global', 'class'),
      path.join(this.memoryDir, 'global', 'er'),
      path.join(this.memoryDir, 'global', 'journey'),
      path.join(this.memoryDir, 'global', 'c4'),
      path.join(this.memoryDir, 'units'),
      path.join(this.memoryDir, '_history')
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Initialize index.json if it doesn't exist
    const indexPath = path.join(this.memoryDir, 'index.json');
    if (!fs.existsSync(indexPath)) {
      this.writeIndexFile({
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        diagrams: [],
        tokenBudget: {
          default: 3000,
          max: 5000,
          min: 1500
        }
      });
    }

    // Initialize metadata.json if it doesn't exist
    const metadataPath = path.join(this.memoryDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      this.writeMetadataFile({
        version: '1.0',
        generatedAt: new Date().toISOString(),
        lastSync: null,
        staleDiagrams: [],
        statistics: {
          totalDiagrams: 0,
          byType: {},
          byScope: {}
        }
      });
    }

    return { initialized: true, path: this.memoryDir };
  }

  /**
   * Initialize unit-specific memory folder
   * @param {string} unitName - Name of the unit
   */
  initializeUnitFolder(unitName) {
    const unitDir = path.join(this.memoryDir, 'units', unitName);
    const subDirs = ['flowcharts', 'sequence', 'class', 'er', 'journey'];

    for (const subDir of subDirs) {
      const dir = path.join(unitDir, subDir);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Create unit metadata
    const metadataPath = path.join(unitDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      fs.writeFileSync(metadataPath, JSON.stringify({
        unitName,
        createdAt: new Date().toISOString(),
        diagrams: []
      }, null, 2));
    }

    return unitDir;
  }

  /**
   * Store a visual diagram
   * @param {Object} diagram - Diagram data
   * @returns {Object} - Created diagram record
   */
  storeDiagram(diagram) {
    const {
      diagramType,
      name,
      scope = 'global',
      unitName = null,
      title,
      description = null,
      mermaidContent,
      generationMethod = 'llm',
      confidence = 1.0,
      sourceFiles = [],
      syncStrategy = 'lazy',
      priority = 50,
      relevanceTags = [],
      crNumber = 'CR-VISUAL-MEMORY'
    } = diagram;

    // Validate required fields
    if (!diagramType || !name || !title || !mermaidContent) {
      throw new Error('Missing required fields: diagramType, name, title, mermaidContent');
    }

    // Ensure mermaidContent is a string (Buffers cause BLOB storage and downstream crashes)
    let safeContent = mermaidContent;
    if (typeof safeContent !== 'string') {
      if (Buffer.isBuffer(safeContent)) {
        safeContent = safeContent.toString('utf8');
      } else {
        throw new Error(`mermaidContent must be a string, got ${typeof safeContent}`);
      }
    }

    // Calculate source file hashes for staleness detection
    const sourceHashes = this.calculateSourceHashes(sourceFiles);

    // Generate file path
    const filePath = this.generateFilePath(diagramType, name, scope, unitName);

    // Check if diagram already exists (prevent duplicates)
    const existing = this.db.prepare(`
      SELECT id FROM visual_diagrams
      WHERE name = ? AND diagram_type = ? AND scope = ?
    `).get(name, diagramType, scope);

    let diagramId;
    if (existing) {
      // Update existing diagram instead of creating duplicate
      const updateStmt = this.db.prepare(`
        UPDATE visual_diagrams SET
          unit_name = ?, title = ?, description = ?,
          mermaid_content = ?, generation_method = ?, confidence = ?,
          source_files = ?, source_hashes = ?, sync_strategy = ?,
          priority = ?, relevance_tags = ?, file_path = ?,
          cr_number = ?, updated_at = CURRENT_TIMESTAMP,
          is_stale = 0, last_validated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      updateStmt.run(
        unitName, title, description, safeContent,
        generationMethod, confidence,
        JSON.stringify(sourceFiles), JSON.stringify(sourceHashes),
        syncStrategy, priority, JSON.stringify(relevanceTags),
        filePath, crNumber, existing.id
      );

      diagramId = existing.id;
    } else {
      // Insert new diagram
    const insertStmt = this.db.prepare(`
      INSERT INTO visual_diagrams (
        diagram_type, name, scope, unit_name, title, description,
        mermaid_content, generation_method, confidence,
        source_files, source_hashes, sync_strategy, priority,
        relevance_tags, file_path, cr_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      diagramType,
      name,
      scope,
      unitName,
      title,
      description,
      safeContent,
      generationMethod,
      confidence,
      JSON.stringify(sourceFiles),
      JSON.stringify(sourceHashes),
      syncStrategy,
      priority,
      JSON.stringify(relevanceTags),
      filePath,
      crNumber
    );

      diagramId = result.lastInsertRowid;
    }

    // Write to file system
    this.writeDiagramFile(filePath, {
      id: diagramId,
      title,
      description,
      diagramType,
      generationMethod,
      confidence,
      mermaidContent: safeContent,
      sourceFiles,
      relevanceTags,
      createdAt: new Date().toISOString()
    });

    // Update index
    this.updateIndex();

    return {
      id: diagramId,
      filePath,
      name,
      diagramType
    };
  }

  /**
   * Update an existing diagram
   * @param {number} diagramId - Diagram ID
   * @param {Object} updates - Fields to update
   * @returns {Object} - Updated diagram record
   */
  updateDiagram(diagramId, updates) {
    // Get existing diagram
    const existing = this.getDiagram(diagramId);
    if (!existing) {
      throw new Error(`Diagram not found: ${diagramId}`);
    }

    // Store history before updating
    this.storeHistory(diagramId, existing, updates.changeReason || 'Update');

    // Build update statement dynamically
    const allowedFields = [
      'title', 'description', 'mermaid_content', 'confidence',
      'source_files', 'source_hashes', 'priority', 'relevance_tags',
      'is_stale', 'last_validated_at', 'status'
    ];

    const setClauses = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey)) {
        setClauses.push(`${dbKey} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (setClauses.length === 0) {
      return existing;
    }

    // Increment version
    setClauses.push('version = version + 1');

    values.push(diagramId);

    const stmt = this.db.prepare(`
      UPDATE visual_diagrams
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    // Update file if mermaid content changed
    if (updates.mermaidContent) {
      const diagram = this.getDiagram(diagramId);
      this.writeDiagramFile(diagram.file_path, {
        id: diagramId,
        title: diagram.title,
        description: diagram.description,
        diagramType: diagram.diagram_type,
        generationMethod: diagram.generation_method,
        confidence: diagram.confidence,
        mermaidContent: updates.mermaidContent,
        sourceFiles: JSON.parse(diagram.source_files || '[]'),
        relevanceTags: JSON.parse(diagram.relevance_tags || '[]'),
        updatedAt: new Date().toISOString(),
        version: diagram.version + 1
      });
    }

    // Update index
    this.updateIndex();

    return this.getDiagram(diagramId);
  }

  /**
   * Store diagram history
   * @param {number} diagramId - Diagram ID
   * @param {Object} diagram - Current diagram state
   * @param {string} changeReason - Reason for the change
   */
  storeHistory(diagramId, diagram, changeReason) {
    const stmt = this.db.prepare(`
      INSERT INTO diagram_history (
        diagram_id, version, mermaid_content,
        source_files, source_hashes, change_reason
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      diagramId,
      diagram.version,
      diagram.mermaid_content,
      diagram.source_files,
      diagram.source_hashes,
      changeReason
    );
  }

  /**
   * Link diagram to code entities
   * @param {number} diagramId - Diagram ID
   * @param {Array} entities - Array of entity references
   */
  linkEntities(diagramId, entities) {
    const stmt = this.db.prepare(`
      INSERT INTO diagram_entity_links (
        diagram_id, entity_id, entity_type, entity_name,
        entity_file_path, link_type, position_in_diagram
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((entityList) => {
      for (const entity of entityList) {
        stmt.run(
          diagramId,
          entity.entityId || null,
          entity.entityType,
          entity.entityName,
          entity.filePath || null,
          entity.linkType || 'depicts',
          entity.position || null
        );
      }
    });

    insertMany(entities);
  }

  /**
   * Get diagram by ID
   * @param {number} diagramId - Diagram ID
   * @returns {Object|null} - Diagram record
   */
  getDiagram(diagramId) {
    return this.db.prepare('SELECT * FROM visual_diagrams WHERE id = ?').get(diagramId);
  }

  /**
   * Get diagrams by type
   * @param {string} diagramType - Diagram type
   * @param {Object} options - Query options
   * @returns {Array} - Matching diagrams
   */
  getDiagramsByType(diagramType, options = {}) {
    const { scope, unitName, includeStale = false, limit = 50 } = options;

    let query = 'SELECT * FROM visual_diagrams WHERE diagram_type = ? AND status = ?';
    const params = [diagramType, 'active'];

    if (!includeStale) {
      query += ' AND is_stale = 0';
    }

    if (scope) {
      query += ' AND scope = ?';
      params.push(scope);
    }

    if (unitName) {
      query += ' AND unit_name = ?';
      params.push(unitName);
    }

    query += ' ORDER BY priority DESC, updated_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Get all active diagrams for context loading
   * @param {Object} options - Query options
   * @returns {Array} - Active diagrams sorted by priority
   */
  getActiveDiagrams(options = {}) {
    const { includeStale = false, limit = 100 } = options;

    let query = 'SELECT * FROM visual_diagrams WHERE status = ?';
    const params = ['active'];

    if (!includeStale) {
      query += ' AND is_stale = 0';
    }

    query += ' ORDER BY priority DESC, updated_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Get diagrams needing sync (eager sync that are stale)
   * @returns {Array} - Stale eager diagrams
   */
  getDiagramsNeedingSync() {
    return this.db.prepare(`
      SELECT * FROM visual_diagrams
      WHERE status = 'active'
        AND is_stale = 1
        AND sync_strategy = 'eager'
      ORDER BY priority DESC
    `).all();
  }

  /**
   * Mark diagram as stale
   * @param {number} diagramId - Diagram ID
   */
  markStale(diagramId) {
    this.db.prepare(`
      UPDATE visual_diagrams
      SET is_stale = 1
      WHERE id = ?
    `).run(diagramId);
  }

  /**
   * Mark diagram as fresh (not stale)
   * @param {number} diagramId - Diagram ID
   */
  markFresh(diagramId) {
    this.db.prepare(`
      UPDATE visual_diagrams
      SET is_stale = 0, last_validated_at = datetime('now')
      WHERE id = ?
    `).run(diagramId);
  }

  /**
   * Check if a diagram is stale based on source file changes
   * @param {number} diagramId - Diagram ID
   * @returns {Object} - Staleness check result
   */
  checkStaleness(diagramId) {
    const diagram = this.getDiagram(diagramId);
    if (!diagram) {
      return { isStale: false, error: 'Diagram not found' };
    }

    const sourceFiles = JSON.parse(diagram.source_files || '[]');
    const oldHashes = JSON.parse(diagram.source_hashes || '{}');

    if (sourceFiles.length === 0) {
      return { isStale: false, reason: 'No source files to check' };
    }

    const currentHashes = this.calculateSourceHashes(sourceFiles);
    const changedFiles = [];

    for (const file of sourceFiles) {
      if (oldHashes[file] !== currentHashes[file]) {
        changedFiles.push(file);
      }
    }

    const isStale = changedFiles.length > 0;

    if (isStale) {
      this.markStale(diagramId);
    } else {
      this.markFresh(diagramId);
    }

    return {
      isStale,
      changedFiles,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Search diagrams using FTS
   * @param {string} query - Search query
   * @param {number} limit - Result limit
   * @returns {Array} - Matching diagrams
   */
  searchDiagrams(query, limit = 20) {
    return this.db.prepare(`
      SELECT vd.*
      FROM visual_diagrams vd
      JOIN visual_diagrams_fts fts ON vd.id = fts.rowid
      WHERE visual_diagrams_fts MATCH ?
        AND vd.status = 'active'
      ORDER BY rank
      LIMIT ?
    `).all(query, limit);
  }

  /**
   * Get entity links for a diagram
   * @param {number} diagramId - Diagram ID
   * @returns {Array} - Entity links
   */
  getEntityLinks(diagramId) {
    return this.db.prepare(`
      SELECT * FROM diagram_entity_links
      WHERE diagram_id = ?
    `).all(diagramId);
  }

  /**
   * Get diagram history
   * @param {number} diagramId - Diagram ID
   * @param {number} limit - History limit
   * @returns {Array} - History records
   */
  getHistory(diagramId, limit = 10) {
    return this.db.prepare(`
      SELECT * FROM diagram_history
      WHERE diagram_id = ?
      ORDER BY version DESC
      LIMIT ?
    `).all(diagramId, limit);
  }

  /**
   * Delete a diagram (soft delete - sets status to archived)
   * @param {number} diagramId - Diagram ID
   */
  archiveDiagram(diagramId) {
    this.db.prepare(`
      UPDATE visual_diagrams
      SET status = 'archived'
      WHERE id = ?
    `).run(diagramId);

    this.updateIndex();
  }

  /**
   * Calculate file hashes for source files
   * @param {Array} sourceFiles - Array of file paths
   * @returns {Object} - Map of file path to hash
   */
  calculateSourceHashes(sourceFiles) {
    const hashes = {};

    for (const filePath of sourceFiles) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.projectRoot, filePath);

      if (fs.existsSync(absolutePath)) {
        const content = fs.readFileSync(absolutePath, 'utf8');
        hashes[filePath] = crypto.createHash('sha256').update(content).digest('hex');
      }
    }

    return hashes;
  }

  /**
   * Generate file path for diagram
   * @param {string} diagramType - Diagram type
   * @param {string} name - Diagram name
   * @param {string} scope - Scope (global/unit)
   * @param {string} unitName - Unit name if scope is unit
   * @returns {string} - Relative file path
   */
  generateFilePath(diagramType, name, scope, unitName) {
    const typeToFolder = {
      'class': 'class',
      'er': 'er',
      'flowchart': 'flowcharts',
      'sequence': 'sequence',
      'journey': 'journey',
      'c4': 'c4',
      'c4-context': 'c4',
      'c4-container': 'c4',
      'c4-component': 'c4',
      'c4-deployment': 'c4',
      'state': 'state',
      'gantt': 'gantt'
    };

    const folder = typeToFolder[diagramType] || diagramType;
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (scope === 'unit' && unitName) {
      return `units/${unitName}/${folder}/${safeName}.md`;
    }

    return `global/${folder}/${safeName}.md`;
  }

  /**
   * Write diagram to file system
   * @param {string} relativePath - Relative path from memory dir
   * @param {Object} diagram - Diagram data
   */
  writeDiagramFile(relativePath, diagram) {
    const absolutePath = path.join(this.memoryDir, relativePath);
    const dir = path.dirname(absolutePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = this.formatDiagramFile(diagram);
    fs.writeFileSync(absolutePath, content);
  }

  /**
   * Format diagram as markdown file
   * @param {Object} diagram - Diagram data
   * @returns {string} - Markdown content
   */
  formatDiagramFile(diagram) {
    const lines = [
      '---',
      `id: ${diagram.id}`,
      `title: "${diagram.title}"`,
      `type: ${diagram.diagramType}`,
      `method: ${diagram.generationMethod}`,
      `confidence: ${diagram.confidence}`,
      diagram.version ? `version: ${diagram.version}` : null,
      diagram.createdAt ? `createdAt: ${diagram.createdAt}` : null,
      diagram.updatedAt ? `updatedAt: ${diagram.updatedAt}` : null,
      diagram.sourceFiles?.length ? `sourceFiles: ${JSON.stringify(diagram.sourceFiles)}` : null,
      diagram.relevanceTags?.length ? `tags: ${JSON.stringify(diagram.relevanceTags)}` : null,
      '---',
      '',
      `# ${diagram.title}`,
      ''
    ];

    if (diagram.description) {
      lines.push(diagram.description, '');
    }

    lines.push(
      '```mermaid',
      diagram.mermaidContent,
      '```',
      ''
    );

    return lines.filter(line => line !== null).join('\n');
  }

  /**
   * Write index.json file
   * @param {Object} index - Index data
   */
  writeIndexFile(index) {
    const indexPath = path.join(this.memoryDir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Write metadata.json file
   * @param {Object} metadata - Metadata
   */
  writeMetadataFile(metadata) {
    const metadataPath = path.join(this.memoryDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Update index.json with current diagrams
   */
  updateIndex() {
    const diagrams = this.getActiveDiagrams({ includeStale: true });

    const index = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      diagrams: diagrams.map(d => ({
        id: d.id,
        name: d.name,
        type: d.diagram_type,
        scope: d.scope,
        unitName: d.unit_name,
        title: d.title,
        priority: d.priority,
        isStale: !!d.is_stale,
        syncStrategy: d.sync_strategy,
        filePath: d.file_path,
        confidence: d.confidence,
        tags: JSON.parse(d.relevance_tags || '[]')
      })),
      tokenBudget: {
        default: 3000,
        max: 5000,
        min: 1500
      }
    };

    this.writeIndexFile(index);

    // Update metadata statistics
    const metadata = {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      staleDiagrams: diagrams.filter(d => d.is_stale).map(d => d.id),
      statistics: {
        totalDiagrams: diagrams.length,
        byType: this.countBy(diagrams, 'diagram_type'),
        byScope: this.countBy(diagrams, 'scope'),
        byStatus: {
          fresh: diagrams.filter(d => !d.is_stale).length,
          stale: diagrams.filter(d => d.is_stale).length
        }
      }
    };

    this.writeMetadataFile(metadata);
  }

  /**
   * Helper: Count items by property
   * @param {Array} items - Array of items
   * @param {string} property - Property to count by
   * @returns {Object} - Counts by value
   */
  countBy(items, property) {
    return items.reduce((acc, item) => {
      const value = item[property] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Helper: Convert camelCase to snake_case
   * @param {string} str - camelCase string
   * @returns {string} - snake_case string
   */
  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Get statistics about visual memory
   * @returns {Object} - Statistics
   */
  getStatistics() {
    const total = this.db.prepare(`
      SELECT COUNT(*) as count FROM visual_diagrams WHERE status = 'active'
    `).get();

    const byType = this.db.prepare(`
      SELECT diagram_type, COUNT(*) as count
      FROM visual_diagrams
      WHERE status = 'active'
      GROUP BY diagram_type
    `).all();

    const byScope = this.db.prepare(`
      SELECT scope, COUNT(*) as count
      FROM visual_diagrams
      WHERE status = 'active'
      GROUP BY scope
    `).all();

    const stale = this.db.prepare(`
      SELECT COUNT(*) as count FROM visual_diagrams
      WHERE status = 'active' AND is_stale = 1
    `).get();

    return {
      total: total.count,
      byType: byType.reduce((acc, r) => ({ ...acc, [r.diagram_type]: r.count }), {}),
      byScope: byScope.reduce((acc, r) => ({ ...acc, [r.scope]: r.count }), {}),
      stale: stale.count,
      fresh: total.count - stale.count
    };
  }

  close() {
    this.db.close();
  }
}

module.exports = VisualMemoryWriter;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const writer = new VisualMemoryWriter();

  try {
    switch (command) {
      case 'init':
        const result = writer.initializeMemoryFolder();
        console.log(`✓ Initialized visual memory folder at: ${result.path}`);
        break;

      case 'init-unit':
        const unitName = args[1];
        if (!unitName) {
          console.error('Usage: visual-memory-writer.js init-unit <unit-name>');
          process.exit(1);
        }
        const unitPath = writer.initializeUnitFolder(unitName);
        console.log(`✓ Initialized unit folder at: ${unitPath}`);
        break;

      case 'stats':
        const stats = writer.getStatistics();
        console.log('\n=== Visual Memory Statistics ===\n');
        console.log(`Total diagrams: ${stats.total}`);
        console.log(`Fresh: ${stats.fresh}`);
        console.log(`Stale: ${stats.stale}`);
        console.log('\nBy Type:');
        for (const [type, count] of Object.entries(stats.byType)) {
          console.log(`  ${type}: ${count}`);
        }
        console.log('\nBy Scope:');
        for (const [scope, count] of Object.entries(stats.byScope)) {
          console.log(`  ${scope}: ${count}`);
        }
        break;

      case 'list':
        const diagrams = writer.getActiveDiagrams({ includeStale: true, limit: 50 });
        console.log('\n=== Active Diagrams ===\n');
        if (diagrams.length === 0) {
          console.log('No diagrams found.');
        } else {
          for (const d of diagrams) {
            const staleIndicator = d.is_stale ? ' [STALE]' : '';
            console.log(`[${d.id}] ${d.diagram_type}: ${d.name}${staleIndicator}`);
            console.log(`    Title: ${d.title}`);
            console.log(`    Scope: ${d.scope}${d.unit_name ? ` (${d.unit_name})` : ''}`);
            console.log(`    Priority: ${d.priority}, Confidence: ${d.confidence}`);
            console.log('');
          }
        }
        break;

      case 'check-stale':
        const allDiagrams = writer.getActiveDiagrams({ includeStale: true });
        console.log('\n=== Staleness Check ===\n');
        for (const d of allDiagrams) {
          const check = writer.checkStaleness(d.id);
          if (check.isStale) {
            console.log(`[${d.id}] ${d.name}: STALE`);
            console.log(`    Changed files: ${check.changedFiles.join(', ')}`);
          } else {
            console.log(`[${d.id}] ${d.name}: Fresh`);
          }
        }
        break;

      case 'update-index':
        writer.updateIndex();
        console.log('✓ Index updated');
        break;

      case 'store': {
        // store --file <path> --type <type> --name <name> --title <title>
        //        [--scope global|unit] [--unit <name>] [--confidence 0.8]
        //        [--priority 50] [--tags tag1,tag2] [--source file1,file2]
        const storeArgs = {};
        for (let i = 1; i < args.length; i++) {
          if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            storeArgs[key] = args[i + 1];
            i++;
          }
        }
        const requiredFields = ['file', 'type', 'name', 'title'];
        const missing = requiredFields.filter(f => !storeArgs[f]);
        if (missing.length > 0) {
          console.error(`Missing required fields: ${missing.join(', ')}`);
          console.error('Usage: visual-memory-writer.js store --file <path> --type <type> --name <name> --title <title>');
          process.exit(1);
        }
        const filePath = path.isAbsolute(storeArgs.file) ? storeArgs.file : path.join(process.cwd(), storeArgs.file);
        if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          process.exit(1);
        }
        const rawContent = fs.readFileSync(filePath, 'utf8');
        // Extract mermaid block if wrapped in ```, else use raw content
        const mermaidMatch = rawContent.match(/```mermaid\s+([\s\S]+?)\s+```/);
        const mermaidContent = mermaidMatch ? mermaidMatch[1].trim() : rawContent.trim();
        const sourceFiles = storeArgs.source ? storeArgs.source.split(',').map(s => s.trim()) : [];
        const tags = storeArgs.tags ? storeArgs.tags.split(',').map(t => t.trim()) : [];
        const storeResult = writer.storeDiagram({
          diagramType: storeArgs.type,
          name: storeArgs.name,
          scope: storeArgs.scope || 'global',
          unitName: storeArgs.unit || null,
          title: storeArgs.title,
          mermaidContent,
          generationMethod: storeArgs.method || 'llm',
          confidence: parseFloat(storeArgs.confidence || '0.8'),
          sourceFiles,
          syncStrategy: storeArgs.sync || 'lazy',
          priority: parseInt(storeArgs.priority || '60', 10),
          relevanceTags: tags,
          crNumber: storeArgs.cr || 'CR-VISUAL-MEMORY'
        });
        console.log(`✓ Stored ${storeArgs.type}/${storeArgs.name} (id=${storeResult.id})`);
        break;
      }

      default:
        console.log(`
Visual Memory Writer - Manage AICodePath visual diagrams

Usage: visual-memory-writer.js <command> [options]

Commands:
  init              Initialize memory folder structure
  init-unit <name>  Initialize unit-specific folder
  stats             Show visual memory statistics
  list              List all active diagrams
  check-stale       Check all diagrams for staleness
  update-index      Update index.json with current diagrams
  store             Store a single diagram file into the DB
                    Required: --file <path> --type <type> --name <name> --title <title>
                    Optional: --scope global|unit --unit <name> --confidence 0.8
                              --priority 60 --tags tag1,tag2 --source file1,file2
                              --method llm|static-ast --sync lazy|eager

Examples:
  visual-memory-writer.js init
  visual-memory-writer.js list
  visual-memory-writer.js store --file aicodepath-docs/memory/global/flowcharts/vehicle-eval-flow.md \\
    --type flowchart --name vehicle-eval-flow --title "Vehicle Evaluator Flow"
  visual-memory-writer.js store --file aicodepath-docs/memory/global/sequence/vehicle-eval-sequence.md \\
    --type sequence --name vehicle-eval-sequence --title "Vehicle Evaluator Sequence" --confidence 0.85
        `);
    }
  } finally {
    writer.close();
  }
}
