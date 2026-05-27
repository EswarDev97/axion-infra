#!/usr/bin/env node
/**
 * Code Indexer
 * Manages code_entities and code_relations tables for dependency graphing
 *
 * Features:
 * - Parse and index code entities (classes, functions, methods, imports)
 * - Track relations between entities (imports, calls, extends, implements)
 * - Calculate complexity metrics
 * - Query dependency graphs
 * - Incremental indexing via file hashing
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { findProjectRoot , getDbPath } = require('./path-resolver');
const logger = require('./logger');

// graph-bridge is loaded lazily so missing deps don't break the module on require
let _graphBridge = null;
function _getGraphBridge() {
  if (_graphBridge) return _graphBridge;
  try {
    _graphBridge = require('../hooks/lib/graph-bridge');
  } catch (e) {
    _graphBridge = null;
  }
  return _graphBridge;
}

/**
 * Test hook: inject a mock graph-bridge (used by unit tests via require.cache injection).
 * Not intended for production use.
 * @param {Object|null} mock
 */
function _setGraphBridge(mock) {
  _graphBridge = mock;
}

class CodeIndexer {
  constructor(projectPath = null) {
    const projectRoot = projectPath || findProjectRoot(process.cwd());
    const dbPath = getDbPath();

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.projectRoot = projectRoot;
  }

  /**
   * Index a file or directory
   *
   * Delegates to the Python AST parser via graph-bridge.js when available.
   * Falls back to the built-in regex implementation if the Python call fails or
   * returns null (e.g. when graph dependencies are not installed).
   *
   * @param {string} filePath - Path to file or directory to index
   * @param {boolean} recursive - Whether to recursively index directories
   * @returns {Promise<Object>|Object} - Indexing statistics
   */
  async indexFile(filePath, recursive = true) {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.projectRoot, filePath);

    // ── Delegation to Python AST parser ────────────────────────────────────
    const bridge = _getGraphBridge();
    if (bridge && bridge.reindexFile) {
      try {
        logger.info('code-indexer.js: delegating to Python AST parser (deprecated)', {
          context: 'code-indexer',
          filePath: absolutePath
        });
        const result = await bridge.reindexFile(absolutePath, getDbPath());
        if (result !== null && result !== undefined) {
          return result;
        }
        // null means Python failed — fall through to regex implementation
      } catch (e) {
        logger.warn('code-indexer.js: Python AST delegation failed, falling back to regex parser', {
          context: 'code-indexer',
          error: e.message
        });
        // fall through to regex implementation
      }
    }

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Path not found: ${absolutePath}`);
    }

    const stats = {
      filesScanned: 0,
      filesIndexed: 0,
      filesSkipped: 0,
      entitiesCreated: 0,
      relationsCreated: 0,
      errors: []
    };

    const stat = fs.statSync(absolutePath);

    if (stat.isDirectory()) {
      if (recursive) {
        this._indexDirectory(absolutePath, stats);
      } else {
        throw new Error('Use recursive=true to index directories');
      }
    } else {
      this._indexSingleFile(absolutePath, stats);
    }

    return stats;
  }

  /**
   * Index a directory recursively
   * @private
   */
  _indexDirectory(dirPath, stats) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      // Skip node_modules, .git, and other common directories
      if (stat.isDirectory()) {
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.aicodepath'];
        if (!skipDirs.includes(file)) {
          this._indexDirectory(filePath, stats);
        }
      } else if (this._shouldIndex(filePath)) {
        this._indexSingleFile(filePath, stats);
      }
    }
  }

  /**
   * Check if file should be indexed based on extension
   * @private
   */
  _shouldIndex(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const indexableExtensions = [
      '.js', '.jsx', '.ts', '.tsx',
      '.py', '.java', '.go', '.rb',
      '.php', '.cs', '.cpp', '.c', '.h',
      '.sql', '.graphql', '.proto'
    ];
    return indexableExtensions.includes(ext);
  }

  /**
   * Index a single file
   * @private
   */
  _indexSingleFile(filePath, stats) {
    stats.filesScanned++;

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileHash = this._hash(content);
      const relativePath = path.relative(this.projectRoot, filePath);

      // Check if file has changed since last index
      const existingEntity = this.db.prepare(`
        SELECT file_hash FROM code_entities
        WHERE file_path = ?
        LIMIT 1
      `).get(relativePath);

      if (existingEntity && existingEntity.file_hash === fileHash) {
        stats.filesSkipped++;
        return; // File unchanged, skip indexing
      }

      // Delete old entities for this file
      this.db.prepare('DELETE FROM code_entities WHERE file_path = ?').run(relativePath);

      // Parse and index entities
      const language = this._detectLanguage(filePath);
      const entities = this._parseFile(content, filePath, language);

      for (const entity of entities) {
        const entityId = this.createEntity(
          relativePath,
          entity.type,
          entity.name,
          entity.lineStart,
          entity.lineEnd,
          entity.complexity,
          entity.documentation,
          entity.signature,
          entity.body,
          entity.exported,
          fileHash
        );

        stats.entitiesCreated++;

        // Create relations
        if (entity.relations) {
          for (const relation of entity.relations) {
            this.createRelation(
              entityId,
              null, // Target entity ID (may not exist yet)
              relation.type,
              relation.targetName
            );
            stats.relationsCreated++;
          }
        }
      }

      stats.filesIndexed++;
    } catch (error) {
      stats.errors.push({ file: filePath, error: error.message });
    }
  }

  /**
   * Detect programming language from file extension
   * @private
   */
  _detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rb': 'ruby',
      '.php': 'php',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.sql': 'sql',
      '.graphql': 'graphql',
      '.proto': 'protobuf'
    };
    return languageMap[ext] || 'unknown';
  }

  /**
   * Parse file content to extract entities
   * @private
   */
  _parseFile(content, filePath, language) {
    const entities = [];

    // Simple regex-based parsing (can be enhanced with AST parsers)
    switch (language) {
      case 'javascript':
      case 'typescript':
        entities.push(...this._parseJavaScript(content));
        break;
      case 'python':
        entities.push(...this._parsePython(content));
        break;
      case 'sql':
        entities.push(...this._parseSQL(content));
        break;
      default:
        // Generic parsing for other languages
        entities.push(...this._parseGeneric(content));
    }

    return entities;
  }

  /**
   * Parse JavaScript/TypeScript files
   * @private
   */
  _parseJavaScript(content) {
    const entities = [];
    const lines = content.split('\n');

    // Track imports
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Import statements
      const importMatch = line.match(/^import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const imports = importMatch[1] ? importMatch[1].split(',').map(s => s.trim()) : [importMatch[2]];
        const source = importMatch[3];

        for (const importName of imports) {
          entities.push({
            type: 'import',
            name: importName,
            lineStart: i + 1,
            lineEnd: i + 1,
            complexity: 0,
            documentation: null,
            signature: line,
            body: null,
            exported: false,
            relations: [{
              type: 'imports',
              targetName: source
            }]
          });
        }
      }

      // Class definitions
      const classMatch = line.match(/^(?:export\s+)?(?:default\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/);
      if (classMatch) {
        const className = classMatch[1];
        const extendsClass = classMatch[2];
        const implementsInterfaces = classMatch[3] ? classMatch[3].split(',').map(s => s.trim()) : [];

        const classBody = this._extractBlock(lines, i);
        const relations = [];

        if (extendsClass) {
          relations.push({ type: 'extends', targetName: extendsClass });
        }

        for (const iface of implementsInterfaces) {
          relations.push({ type: 'implements', targetName: iface });
        }

        entities.push({
          type: 'class',
          name: className,
          lineStart: i + 1,
          lineEnd: classBody.endLine,
          complexity: this._calculateComplexity(classBody.content),
          documentation: this._extractDocumentation(lines, i),
          signature: line,
          body: classBody.content,
          exported: line.startsWith('export'),
          relations
        });

        i = classBody.endLine - 1; // Skip to end of class
      }

      // Function/Method definitions
      const functionMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
      if (functionMatch && !line.trim().startsWith('//')) {
        const functionName = functionMatch[1];
        const params = functionMatch[2];

        const functionBody = this._extractBlock(lines, i);

        entities.push({
          type: 'function',
          name: functionName,
          lineStart: i + 1,
          lineEnd: functionBody.endLine,
          complexity: this._calculateComplexity(functionBody.content),
          documentation: this._extractDocumentation(lines, i),
          signature: `function ${functionName}(${params})`,
          body: functionBody.content,
          exported: line.startsWith('export'),
          relations: this._extractFunctionCalls(functionBody.content)
        });

        i = functionBody.endLine - 1;
      }

      // Arrow functions
      const arrowMatch = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/);
      if (arrowMatch && !line.trim().startsWith('//')) {
        const functionName = arrowMatch[1];
        const params = arrowMatch[2];

        const functionBody = this._extractBlock(lines, i);

        entities.push({
          type: 'function',
          name: functionName,
          lineStart: i + 1,
          lineEnd: functionBody.endLine,
          complexity: this._calculateComplexity(functionBody.content),
          documentation: this._extractDocumentation(lines, i),
          signature: `const ${functionName} = (${params}) =>`,
          body: functionBody.content,
          exported: line.startsWith('export'),
          relations: this._extractFunctionCalls(functionBody.content)
        });

        i = functionBody.endLine - 1;
      }
    }

    return entities;
  }

  /**
   * Parse Python files
   * @private
   */
  _parsePython(content) {
    const entities = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Import statements
      const importMatch = line.match(/^(?:from\s+([\w.]+)\s+)?import\s+([\w,\s*]+)/);
      if (importMatch) {
        const module = importMatch[1] || importMatch[2];
        entities.push({
          type: 'import',
          name: module,
          lineStart: i + 1,
          lineEnd: i + 1,
          complexity: 0,
          documentation: null,
          signature: line,
          body: null,
          exported: false,
          relations: [{ type: 'imports', targetName: module }]
        });
      }

      // Class definitions
      const classMatch = line.match(/^class\s+(\w+)(?:\(([^)]+)\))?:/);
      if (classMatch) {
        const className = classMatch[1];
        const baseClasses = classMatch[2] ? classMatch[2].split(',').map(s => s.trim()) : [];

        const classBody = this._extractPythonBlock(lines, i);
        const relations = baseClasses.map(base => ({ type: 'extends', targetName: base }));

        entities.push({
          type: 'class',
          name: className,
          lineStart: i + 1,
          lineEnd: classBody.endLine,
          complexity: this._calculateComplexity(classBody.content),
          documentation: this._extractDocumentation(lines, i),
          signature: line,
          body: classBody.content,
          exported: true,
          relations
        });

        i = classBody.endLine - 1;
      }

      // Function definitions
      const functionMatch = line.match(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
      if (functionMatch) {
        const functionName = functionMatch[1];
        const params = functionMatch[2];

        const functionBody = this._extractPythonBlock(lines, i);

        entities.push({
          type: 'function',
          name: functionName,
          lineStart: i + 1,
          lineEnd: functionBody.endLine,
          complexity: this._calculateComplexity(functionBody.content),
          documentation: this._extractDocumentation(lines, i),
          signature: `def ${functionName}(${params})`,
          body: functionBody.content,
          exported: true,
          relations: []
        });

        i = functionBody.endLine - 1;
      }
    }

    return entities;
  }

  /**
   * Parse SQL files
   * @private
   */
  _parseSQL(content) {
    const entities = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Table creation
      const tableMatch = line.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const tableBody = this._extractSQLBlock(lines, i);

        entities.push({
          type: 'table',
          name: tableName,
          lineStart: i + 1,
          lineEnd: tableBody.endLine,
          complexity: 0,
          documentation: this._extractDocumentation(lines, i),
          signature: line,
          body: tableBody.content,
          exported: true,
          relations: []
        });

        i = tableBody.endLine - 1;
      }

      // Index creation
      const indexMatch = line.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      if (indexMatch) {
        const indexName = indexMatch[1];

        entities.push({
          type: 'index',
          name: indexName,
          lineStart: i + 1,
          lineEnd: i + 1,
          complexity: 0,
          documentation: null,
          signature: line,
          body: null,
          exported: true,
          relations: []
        });
      }
    }

    return entities;
  }

  /**
   * Generic parser for other languages
   * @private
   */
  _parseGeneric(content) {
    // Placeholder for generic parsing
    return [];
  }

  /**
   * Extract code block (JavaScript/TypeScript)
   * @private
   */
  _extractBlock(lines, startLine) {
    let braceCount = 0;
    let started = false;
    let content = [];

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      content.push(line);

      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      if (started && braceCount === 0) {
        return { content: content.join('\n'), endLine: i + 1 };
      }
    }

    return { content: content.join('\n'), endLine: startLine + content.length };
  }

  /**
   * Extract code block (Python)
   * @private
   */
  _extractPythonBlock(lines, startLine) {
    const baseIndent = lines[startLine].match(/^\s*/)[0].length;
    let content = [lines[startLine]];

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      const indent = line.match(/^\s*/)[0].length;

      if (line.trim() === '') {
        content.push(line);
        continue;
      }

      if (indent <= baseIndent) {
        return { content: content.join('\n'), endLine: i };
      }

      content.push(line);
    }

    return { content: content.join('\n'), endLine: startLine + content.length };
  }

  /**
   * Extract SQL block
   * @private
   */
  _extractSQLBlock(lines, startLine) {
    let content = [lines[startLine]];

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      content.push(line);

      if (line.trim().endsWith(';')) {
        return { content: content.join('\n'), endLine: i + 1 };
      }
    }

    return { content: content.join('\n'), endLine: startLine + content.length };
  }

  /**
   * Extract documentation comments
   * @private
   */
  _extractDocumentation(lines, lineIndex) {
    let docs = [];

    // Look backwards for documentation
    for (let i = lineIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();

      if (line.startsWith('/**') || line.startsWith('"""')) {
        // Start of doc block
        for (let j = i; j < lineIndex; j++) {
          docs.push(lines[j].trim());
        }
        return docs.join('\n');
      }

      if (line.startsWith('*') || line.startsWith('#')) {
        docs.unshift(lines[i].trim());
      } else if (line !== '') {
        break;
      }
    }

    return docs.length > 0 ? docs.join('\n') : null;
  }

  /**
   * Extract function calls from code
   * @private
   */
  _extractFunctionCalls(code) {
    const calls = [];
    const callPattern = /(\w+)\s*\(/g;
    let match;

    while ((match = callPattern.exec(code)) !== null) {
      const functionName = match[1];
      // Filter out keywords
      const keywords = ['if', 'for', 'while', 'switch', 'catch', 'function', 'class'];
      if (!keywords.includes(functionName)) {
        calls.push({
          type: 'calls',
          targetName: functionName
        });
      }
    }

    return calls;
  }

  /**
   * Calculate cyclomatic complexity
   * @private
   */
  _calculateComplexity(code) {
    let complexity = 1; // Base complexity

    // Count decision points
    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\b/g, // Ternary operator
      /\b&&\b/g,
      /\b\|\|\b/g
    ];

    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Generate hash for content
   * @private
   */
  _hash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create a code entity
   * @param {string} filePath - Relative file path
   * @param {string} entityType - Entity type (class, function, method, etc.)
   * @param {string} name - Entity name
   * @param {number} lineStart - Starting line number
   * @param {number} lineEnd - Ending line number
   * @param {number} complexity - Cyclomatic complexity
   * @param {string} documentation - Documentation string
   * @param {string} signature - Function/class signature
   * @param {string} body - Entity body content
   * @param {boolean} exported - Whether entity is exported
   * @param {string} fileHash - Hash of file content
   * @returns {number} - Entity ID
   */
  createEntity(filePath, entityType, name, lineStart, lineEnd, complexity, documentation, signature = null, body = null, exported = false, fileHash = null) {
    const language = this._detectLanguage(filePath);
    const qualifiedName = `${filePath}:${name}`;

    // Generate hashes for duplication detection
    const entityHash = body ? this._hash(body) : null;

    const stmt = this.db.prepare(`
      INSERT INTO code_entities (
        entity_type, name, qualified_name, language,
        file_path, line_start, line_end,
        signature, body, documentation,
        entity_hash, file_hash,
        complexity, exported
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      entityType, name, qualifiedName, language,
      filePath, lineStart, lineEnd,
      signature, body, documentation,
      entityHash, fileHash,
      complexity, exported ? 1 : 0
    );

    return result.lastInsertRowid;
  }

  /**
   * Create a relation between entities
   * @param {number} fromEntityId - Source entity ID
   * @param {number} toEntityId - Target entity ID (can be null)
   * @param {string} relationType - Relation type
   * @param {string} toEntityName - Target entity name (when ID unknown)
   * @returns {number} - Relation ID
   */
  createRelation(fromEntityId, toEntityId, relationType, toEntityName = null) {
    const stmt = this.db.prepare(`
      INSERT INTO code_relations (
        from_entity_id, to_entity_id,
        relation_type, to_entity_name
      ) VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(fromEntityId, toEntityId, relationType, toEntityName);
    return result.lastInsertRowid;
  }

  /**
   * Get all entities in a file
   * @param {string} filePath - File path (relative or absolute)
   * @returns {Array} - Array of entities
   */
  getEntitiesByFile(filePath) {
    const relativePath = path.isAbsolute(filePath)
      ? path.relative(this.projectRoot, filePath)
      : filePath;

    return this.db.prepare(`
      SELECT * FROM code_entities
      WHERE file_path = ?
      ORDER BY line_start
    `).all(relativePath);
  }

  /**
   * Get dependencies for an entity
   * @param {number} entityId - Entity ID
   * @param {number} depth - Depth of dependency traversal (default: 1)
   * @returns {Object} - Dependency graph
   */
  getDependencies(entityId, depth = 1) {
    const entity = this.db.prepare('SELECT * FROM code_entities WHERE id = ?').get(entityId);

    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const dependencies = {
      entity,
      outgoing: [],
      incoming: []
    };

    // Get outgoing relations
    const outgoing = this.db.prepare(`
      SELECT
        r.*,
        e.id as target_id,
        e.name as target_name,
        e.entity_type as target_type,
        e.file_path as target_file
      FROM code_relations r
      LEFT JOIN code_entities e ON r.to_entity_id = e.id
      WHERE r.from_entity_id = ?
    `).all(entityId);

    dependencies.outgoing = outgoing;

    // Get incoming relations
    const incoming = this.db.prepare(`
      SELECT
        r.*,
        e.id as source_id,
        e.name as source_name,
        e.entity_type as source_type,
        e.file_path as source_file
      FROM code_relations r
      JOIN code_entities e ON r.from_entity_id = e.id
      WHERE r.to_entity_id = ?
    `).all(entityId);

    dependencies.incoming = incoming;

    return dependencies;
  }

  /**
   * Get codebase complexity metrics
   * @returns {Object} - Complexity statistics
   */
  getComplexityMetrics() {
    const totalEntities = this.db.prepare(`
      SELECT
        COUNT(*) as count,
        entity_type
      FROM code_entities
      GROUP BY entity_type
    `).all();

    const complexityStats = this.db.prepare(`
      SELECT
        AVG(complexity) as avg_complexity,
        MAX(complexity) as max_complexity,
        MIN(complexity) as min_complexity
      FROM code_entities
      WHERE complexity > 0
    `).get();

    const fileStats = this.db.prepare(`
      SELECT
        COUNT(DISTINCT file_path) as total_files,
        COUNT(*) as total_entities
      FROM code_entities
    `).get();

    const mostComplex = this.db.prepare(`
      SELECT
        name, entity_type, file_path,
        complexity, line_start, line_end
      FROM code_entities
      WHERE complexity > 0
      ORDER BY complexity DESC
      LIMIT 10
    `).all();

    const relationStats = this.db.prepare(`
      SELECT
        relation_type,
        COUNT(*) as count
      FROM code_relations
      GROUP BY relation_type
    `).all();

    return {
      entities: totalEntities,
      files: fileStats,
      complexity: complexityStats,
      mostComplex,
      relations: relationStats
    };
  }

  /**
   * Search entities by name
   * @param {string} query - Search query
   * @param {number} limit - Result limit
   * @returns {Array} - Matching entities
   */
  searchEntities(query, limit = 20) {
    // Use LIKE for now (FTS table may have incompatible schema)
    return this.db.prepare(`
      SELECT * FROM code_entities
      WHERE name LIKE ? OR qualified_name LIKE ? OR documentation LIKE ?
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, limit);
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

module.exports = CodeIndexer;
module.exports._setGraphBridge = _setGraphBridge;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const indexer = new CodeIndexer();

  try {
    switch (command) {
      case 'index':
        const indexPath = args[1];
        if (!indexPath) {
          console.error('Usage: code-indexer.js index <path>');
          process.exit(1);
        }

        console.log(`Indexing: ${indexPath}...`);
        const stats = indexer.indexFile(indexPath);
        console.log('\nIndexing Complete:');
        console.log(`  Files scanned: ${stats.filesScanned}`);
        console.log(`  Files indexed: ${stats.filesIndexed}`);
        console.log(`  Files skipped (unchanged): ${stats.filesSkipped}`);
        console.log(`  Entities created: ${stats.entitiesCreated}`);
        console.log(`  Relations created: ${stats.relationsCreated}`);

        if (stats.errors.length > 0) {
          console.log(`\nErrors: ${stats.errors.length}`);
          stats.errors.forEach(err => {
            console.log(`  - ${err.file}: ${err.error}`);
          });
        }
        break;

      case 'list':
        const filePath = args[1];
        if (!filePath) {
          console.error('Usage: code-indexer.js list <file>');
          process.exit(1);
        }

        const entities = indexer.getEntitiesByFile(filePath);
        console.log(`\nEntities in ${filePath}:\n`);

        if (entities.length === 0) {
          console.log('  No entities found. Run "code-indexer.js index <path>" first.');
        } else {
          entities.forEach(entity => {
            console.log(`  [${entity.id}] ${entity.entity_type}: ${entity.name}`);
            console.log(`      Lines ${entity.line_start}-${entity.line_end}, Complexity: ${entity.complexity}`);
            if (entity.documentation) {
              console.log(`      Doc: ${entity.documentation.substring(0, 60)}...`);
            }
            console.log('');
          });
        }
        break;

      case 'deps':
        const entityId = parseInt(args[1]);
        if (!entityId) {
          console.error('Usage: code-indexer.js deps <entity-id>');
          process.exit(1);
        }

        const deps = indexer.getDependencies(entityId);
        console.log(`\nDependency Graph for: ${deps.entity.name}\n`);
        console.log(`Entity: ${deps.entity.entity_type} ${deps.entity.name}`);
        console.log(`File: ${deps.entity.file_path}:${deps.entity.line_start}`);
        console.log('');

        console.log('Outgoing Relations (what this entity uses):');
        if (deps.outgoing.length === 0) {
          console.log('  None');
        } else {
          deps.outgoing.forEach(rel => {
            const target = rel.target_name || rel.to_entity_name || 'unknown';
            console.log(`  ${rel.relation_type} -> ${target} (${rel.target_file || 'external'})`);
          });
        }
        console.log('');

        console.log('Incoming Relations (what uses this entity):');
        if (deps.incoming.length === 0) {
          console.log('  None');
        } else {
          deps.incoming.forEach(rel => {
            console.log(`  ${rel.relation_type} <- ${rel.source_name} (${rel.source_file})`);
          });
        }
        break;

      case 'metrics':
        const metrics = indexer.getComplexityMetrics();
        console.log('\n=== Codebase Complexity Metrics ===\n');

        console.log('Entity Distribution:');
        metrics.entities.forEach(e => {
          console.log(`  ${e.entity_type}: ${e.count}`);
        });
        console.log('');

        console.log('File Statistics:');
        console.log(`  Total files indexed: ${metrics.files.total_files}`);
        console.log(`  Total entities: ${metrics.files.total_entities}`);
        console.log('');

        console.log('Complexity Statistics:');
        console.log(`  Average complexity: ${metrics.complexity.avg_complexity?.toFixed(2) || 'N/A'}`);
        console.log(`  Max complexity: ${metrics.complexity.max_complexity || 'N/A'}`);
        console.log(`  Min complexity: ${metrics.complexity.min_complexity || 'N/A'}`);
        console.log('');

        console.log('Most Complex Entities:');
        metrics.mostComplex.forEach((entity, idx) => {
          console.log(`  ${idx + 1}. ${entity.name} (${entity.entity_type})`);
          console.log(`     Complexity: ${entity.complexity}, File: ${entity.file_path}:${entity.line_start}`);
        });
        console.log('');

        console.log('Relation Statistics:');
        if (metrics.relations.length === 0) {
          console.log('  No relations found');
        } else {
          metrics.relations.forEach(r => {
            console.log(`  ${r.relation_type}: ${r.count}`);
          });
        }
        break;

      case 'search':
        const searchQuery = args[1];
        if (!searchQuery) {
          console.error('Usage: code-indexer.js search <query>');
          process.exit(1);
        }

        const results = indexer.searchEntities(searchQuery);
        console.log(`\nSearch Results for: "${searchQuery}"\n`);

        if (results.length === 0) {
          console.log('  No results found');
        } else {
          results.forEach(result => {
            console.log(`  ${result.name} (${result.entity_type})`);
            console.log(`  File: ${result.file_path}`);
            if (result.documentation) {
              console.log(`  Doc: ${result.documentation.substring(0, 80)}...`);
            }
            console.log('');
          });
        }
        break;

      default:
        console.log(`
AICodePath Code Indexer
Manages code_entities and code_relations tables for dependency graphing

Usage: code-indexer.js <command> [options]

Commands:
  index <path>          Index a file or directory
  list <file>           List entities in a file
  deps <entity-id>      Show dependency graph for entity
  metrics               Show codebase complexity metrics
  search <query>        Search entities by name or documentation

Entity Types:
  class, function, method, variable, constant, import, table, index

Relation Types:
  imports, calls, extends, implements, uses

Examples:
  code-indexer.js index src/
  code-indexer.js list src/services/UserService.ts
  code-indexer.js deps 42
  code-indexer.js metrics
  code-indexer.js search "authentication"
        `);
    }
  } finally {
    indexer.close();
  }
}
