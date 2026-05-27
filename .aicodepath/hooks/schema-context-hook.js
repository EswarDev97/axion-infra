#!/usr/bin/env node
/**
 * Schema Context PreToolUse Hook
 *
 * Prevents schema hallucination by injecting actual database schema
 * into Claude's context when writing data-layer files.
 *
 * Fires on Write|Edit, detects data-layer file targets, and returns
 * the real schema via hookSpecificOutput.additionalContext.
 *
 * Fast path: Uses cached .claude/rules/schema-context.md when fresh (<1 hour).
 * Discovery path: Scans project for schema sources (SQL, Prisma, Drizzle, ORM, ER diagrams).
 *
 * @module hooks/schema-context-hook
 */

const path = require('path');
const fs = require('fs');
const { findProjectRoot } = require('../lib/path-resolver');
const logger = require('../lib/logger');

// Cache staleness threshold (1 hour in milliseconds)
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;

// Data-layer file patterns (directory-based)
const DATA_LAYER_DIR_PATTERNS = [
  /[\\/]repositories[\\/]/i,
  /[\\/]models[\\/]/i,
  /[\\/]entities[\\/]/i,
  /[\\/]queries[\\/]/i,
  /[\\/]dao[\\/]/i,
  /[\\/]mappers[\\/]/i,
  /[\\/]controllers[\\/]/i,
  /[\\/]prisma[\\/]/i,
  /[\\/]drizzle[\\/]/i,
  /[\\/]migrations[\\/]/i,
];

// Data-layer file patterns (filename-based)
const DATA_LAYER_FILE_PATTERNS = [
  /\.repository\./i,
  /\.model\./i,
  /\.entity\./i,
  /\.query\./i,
  /\.dao\./i,
  /\.mapper\./i,
  /\.schema\./i,
  /\.prisma$/i,
  /\.sql$/i,
];

/**
 * Check if a file path targets the data layer
 * @param {string} filePath - File path to check
 * @returns {boolean}
 */
function isDataLayerFile(filePath) {
  if (!filePath) return false;

  for (const pattern of DATA_LAYER_DIR_PATTERNS) {
    if (pattern.test(filePath)) return true;
  }

  const basename = path.basename(filePath);
  for (const pattern of DATA_LAYER_FILE_PATTERNS) {
    if (pattern.test(basename)) return true;
  }

  return false;
}

/**
 * Check if cached schema-context.md is fresh
 * @param {string} cachePath - Path to .claude/rules/schema-context.md
 * @returns {boolean}
 */
function isCacheFresh(cachePath) {
  try {
    if (!fs.existsSync(cachePath)) return false;
    const stat = fs.statSync(cachePath);
    const age = Date.now() - stat.mtimeMs;
    return age < CACHE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * Discover schema source files in the project
 * @param {string} projectRoot - Project root directory
 * @returns {Array<{path: string, type: string}>}
 */
function discoverSchemaSources(projectRoot) {
  const sources = [];

  const searchPatterns = [
    // AICodePath ER diagrams
    { dir: 'aicodepath-docs/memory/global/er', glob: '*.md', type: 'er-diagram' },
    // AICodePath schema designs (wildcard unit name)
    { dir: 'aicodepath-docs/construction', glob: '**/database-design/schema-design.md', type: 'schema-design' },
    // SQL migrations
    { dir: '', glob: '**/migrations/*.sql', type: 'sql' },
    { dir: '', glob: '**/db/migrations/*.sql', type: 'sql' },
    // Prisma
    { dir: '', glob: '**/schema.prisma', type: 'prisma' },
    { dir: '', glob: '**/prisma/schema.prisma', type: 'prisma' },
    // Drizzle
    { dir: '', glob: '**/drizzle/schema.ts', type: 'drizzle' },
    { dir: '', glob: '**/db/schema.ts', type: 'drizzle' },
    // Raw SQL schema
    { dir: '', glob: '**/schema.sql', type: 'sql' },
    { dir: '', glob: '**/init.sql', type: 'sql' },
    { dir: '', glob: '**/create-tables.sql', type: 'sql' },
  ];

  for (const pattern of searchPatterns) {
    const baseDir = pattern.dir
      ? path.join(projectRoot, pattern.dir)
      : projectRoot;

    if (!fs.existsSync(baseDir)) continue;

    try {
      const files = findFilesMatching(baseDir, pattern.glob, projectRoot);
      for (const file of files) {
        sources.push({ path: file, type: pattern.type });
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  return sources;
}

/**
 * Simple recursive file finder with glob-like matching
 * @param {string} baseDir - Base directory to search
 * @param {string} glob - Glob pattern (supports ** and *)
 * @param {string} projectRoot - Project root (to skip node_modules etc)
 * @returns {Array<string>}
 */
function findFilesMatching(baseDir, glob, projectRoot) {
  const results = [];
  const skipDirs = ['node_modules', '.git', '.aicodepath', 'dist', 'build', '.next', 'coverage'];

  // Convert glob to regex
  const globRegex = new RegExp(
    '^' +
    glob
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/\\\\]*')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*')
    + '$'
  );

  function walk(dir, depth) {
    if (depth > 10) return; // Prevent deep recursion

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (skipDirs.includes(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        if (globRegex.test(relativePath)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(baseDir, 0);
  return results;
}

/**
 * Parse SQL content to extract all data objects: tables, views, materialized views, indexes
 * @param {string} content - SQL file content
 * @param {Object} [options] - Parse options
 * @param {string} [options.database] - Database name for multi-database grouping
 * @returns {Array<{table: string, schema: string|null, database: string|null, objectType: string, columns: Array<{name: string, type: string, constraints: string, nullable: boolean}>, indexes: Array<{name: string, columns: string[], unique: boolean}>}>}
 */
function parseSQL(content, options = {}) {
  const objects = [];
  const standaloneIndexes = [];

  // Remove comments
  const clean = content
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  // --- Parse CREATE TABLE ---
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:[`"']?(\w+)[`"']?)\.)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\);/gi;
  let match;

  while ((match = tableRegex.exec(clean)) !== null) {
    const schemaName = match[1] || null;
    const tableName = match[2];
    const body = match[3];
    const columns = [];
    const tableIndexes = [];

    const lines = body.split(',').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (!line || /^\s*(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)/i.test(line)) continue;

      const colMatch = line.match(/^[`"']?(\w+)[`"']?\s+(\w+(?:\([^)]+\))?)/);
      if (colMatch) {
        const constraints = [];
        const isPK = /PRIMARY\s+KEY/i.test(line);
        const isFK = /REFERENCES/i.test(line);
        const isNotNull = /NOT\s+NULL/i.test(line);
        const isUnique = /UNIQUE/i.test(line);
        const hasDefault = /DEFAULT/i.test(line);
        const isNullable = !isPK && !isNotNull;

        if (isPK) constraints.push('PK');
        if (isFK) constraints.push('FK');
        if (isNotNull) constraints.push('NOT NULL');
        if (isNullable) constraints.push('NULLABLE');
        if (isUnique) constraints.push('UNIQUE');
        if (hasDefault) constraints.push('DEFAULT');

        columns.push({
          name: colMatch[1],
          type: colMatch[2].toUpperCase(),
          constraints: constraints.join(', '),
          nullable: isNullable,
        });
      }
    }

    if (columns.length > 0) {
      objects.push({
        table: tableName,
        schema: schemaName,
        database: options.database || null,
        objectType: 'TABLE',
        columns,
        indexes: tableIndexes,
      });
    }
  }

  // --- Parse CREATE [OR REPLACE] [MATERIALIZED] VIEW ---
  const viewRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:(MATERIALIZED)\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:[`"']?(\w+)[`"']?)\.)?[`"']?(\w+)[`"']?\s+AS\s+([\s\S]*?)(?:;\s*$|;\s*(?=CREATE|ALTER|DROP|INSERT|UPDATE|DELETE))/gim;

  while ((match = viewRegex.exec(clean)) !== null) {
    const isMaterialized = !!match[1];
    const schemaName = match[2] || null;
    const viewName = match[3];
    const selectBody = match[4];

    const columns = parseViewColumns(selectBody);

    objects.push({
      table: viewName,
      schema: schemaName,
      database: options.database || null,
      objectType: isMaterialized ? 'MATERIALIZED VIEW' : 'VIEW',
      columns,
      indexes: [],
      viewDefinition: selectBody.trim(),
    });
  }

  // --- Parse CREATE [UNIQUE] INDEX ---
  const indexRegex = /CREATE\s+(?:(UNIQUE)\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s+ON\s+(?:(?:[`"']?(\w+)[`"']?)\.)?[`"']?(\w+)[`"']?\s*\(([^)]+)\)/gi;

  while ((match = indexRegex.exec(clean)) !== null) {
    const isUnique = !!match[1];
    const indexName = match[2];
    const indexSchema = match[3] || null;
    const tableName = match[4];
    const indexCols = match[5].split(',').map(c => c.replace(/[`"']/g, '').trim());

    standaloneIndexes.push({
      name: indexName,
      table: tableName,
      schema: indexSchema,
      columns: indexCols,
      unique: isUnique,
    });
  }

  // Attach standalone indexes to their tables
  for (const idx of standaloneIndexes) {
    const tableObj = objects.find(
      o => o.table === idx.table && (o.schema === idx.schema || !idx.schema)
    );
    if (tableObj) {
      tableObj.indexes.push({
        name: idx.name,
        columns: idx.columns,
        unique: idx.unique,
      });
    } else {
      // Index references a table not in this file - create a stub entry
      objects.push({
        table: idx.table,
        schema: idx.schema,
        database: options.database || null,
        objectType: 'TABLE',
        columns: [],
        indexes: [{
          name: idx.name,
          columns: idx.columns,
          unique: idx.unique,
        }],
      });
    }
  }

  return objects;
}

/**
 * Extract column definitions from a VIEW's SELECT statement
 * @param {string} selectBody - The SELECT portion of a CREATE VIEW
 * @returns {Array<{name: string, type: string, constraints: string, nullable: boolean}>}
 */
function parseViewColumns(selectBody) {
  const columns = [];

  // Extract the SELECT clause (before FROM)
  const selectMatch = selectBody.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
  if (!selectMatch) return columns;

  const selectClause = selectMatch[1];

  // Handle SELECT *
  if (selectClause.trim() === '*') {
    columns.push({ name: '*', type: 'unknown', constraints: '', nullable: true });
    return columns;
  }

  // Split by comma (respecting parentheses for function calls)
  const parts = splitSelectColumns(selectClause);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Match: expression AS alias
    const aliasMatch = trimmed.match(/(?:.*\s+AS\s+)[`"']?(\w+)[`"']?\s*$/i);
    if (aliasMatch) {
      columns.push({
        name: aliasMatch[1],
        type: inferViewColumnType(trimmed),
        constraints: '',
        nullable: true,
      });
      continue;
    }

    // Match: table.column or just column (last word)
    const colMatch = trimmed.match(/(?:\w+\.)?[`"']?(\w+)[`"']?\s*$/);
    if (colMatch) {
      columns.push({
        name: colMatch[1],
        type: inferViewColumnType(trimmed),
        constraints: '',
        nullable: true,
      });
    }
  }

  return columns;
}

/**
 * Split SELECT column list respecting parentheses
 * @param {string} clause - SELECT column list
 * @returns {string[]}
 */
function splitSelectColumns(clause) {
  const parts = [];
  let depth = 0;
  let current = '';

  for (const char of clause) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current);

  return parts;
}

/**
 * Infer column type from a view SELECT expression
 * @param {string} expr - Column expression
 * @returns {string}
 */
function inferViewColumnType(expr) {
  const lower = expr.toLowerCase().trim();
  if (/^count\s*\(/i.test(lower)) return 'INTEGER';
  if (/^sum\s*\(/i.test(lower)) return 'NUMERIC';
  if (/^avg\s*\(/i.test(lower)) return 'NUMERIC';
  if (/^max\s*\(/i.test(lower) || /^min\s*\(/i.test(lower)) return 'varies';
  if (/::(?:int|integer|bigint)/i.test(lower)) return 'INTEGER';
  if (/::(?:text|varchar|char)/i.test(lower)) return 'TEXT';
  if (/::(?:bool|boolean)/i.test(lower)) return 'BOOLEAN';
  if (/::(?:timestamp|date|time)/i.test(lower)) return 'TIMESTAMP';
  if (/::(?:numeric|decimal|float|real|double)/i.test(lower)) return 'NUMERIC';
  return 'varies';
}

/**
 * Parse Prisma schema to extract model definitions with indexes
 * @param {string} content - Prisma schema content
 * @returns {Array<{table: string, schema: string|null, database: string|null, objectType: string, columns: Array<{name: string, type: string, constraints: string, nullable: boolean}>, indexes: Array<{name: string, columns: string[], unique: boolean}>}>}
 */
function parsePrisma(content) {
  const tables = [];

  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let match;

  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const columns = [];
    const indexes = [];

    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.startsWith('//')) continue;

      // Extract @@index directives
      const indexMatch = line.match(/@@index\(\[([^\]]+)\](?:,\s*map:\s*"(\w+)")?\)/);
      if (indexMatch) {
        const indexCols = indexMatch[1].split(',').map(c => c.trim());
        indexes.push({
          name: indexMatch[2] || `idx_${modelName}_${indexCols.join('_')}`,
          columns: indexCols,
          unique: false,
        });
        continue;
      }

      // Extract @@unique directives (compound unique index)
      const uniqueMatch = line.match(/@@unique\(\[([^\]]+)\](?:,\s*map:\s*"(\w+)")?\)/);
      if (uniqueMatch) {
        const uniqueCols = uniqueMatch[1].split(',').map(c => c.trim());
        indexes.push({
          name: uniqueMatch[2] || `uq_${modelName}_${uniqueCols.join('_')}`,
          columns: uniqueCols,
          unique: true,
        });
        continue;
      }

      // Skip other @@ directives (@@map, @@id, etc.)
      if (line.startsWith('@@')) continue;

      const fieldMatch = line.match(/^(\w+)\s+(\w+[\[\]?]*)/);
      if (fieldMatch) {
        const constraints = [];
        const isPK = /@id/.test(line);
        const isUnique = /@unique/.test(line);
        const isFK = /@relation/.test(line);
        const isNullable = line.includes('?');
        const hasDefault = /@default/.test(line);

        if (isPK) constraints.push('PK');
        if (isFK) constraints.push('FK');
        if (!isNullable && !isPK) constraints.push('NOT NULL');
        if (isNullable) constraints.push('NULLABLE');
        if (isUnique) constraints.push('UNIQUE');
        if (hasDefault) constraints.push('DEFAULT');

        columns.push({
          name: fieldMatch[1],
          type: fieldMatch[2],
          constraints: constraints.join(', '),
          nullable: isNullable,
        });
      }
    }

    if (columns.length > 0) {
      tables.push({
        table: modelName,
        schema: null,
        database: null,
        objectType: 'TABLE',
        columns,
        indexes,
      });
    }
  }

  return tables;
}

/**
 * Parse a schema source file based on its type
 * @param {string} filePath - Absolute path to the file
 * @param {string} type - File type (sql, prisma, er-diagram, schema-design, drizzle)
 * @param {Object} [options] - Parse options (database name, etc.)
 * @returns {{tables: Array, rawContent: string|null}}
 */
function parseSchemaSource(filePath, type, options = {}) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return { tables: [], rawContent: null };
  }

  switch (type) {
    case 'sql':
      return { tables: parseSQL(content, options), rawContent: null };

    case 'prisma':
      return { tables: parsePrisma(content), rawContent: null };

    case 'er-diagram':
    case 'schema-design':
      // These are already human-readable markdown - extract relevant sections
      return { tables: [], rawContent: extractSchemaSection(content) };

    case 'drizzle':
      // Drizzle schemas are TS - extract table definitions as raw text
      return { tables: [], rawContent: extractDrizzleTables(content) };

    default:
      return { tables: [], rawContent: null };
  }
}

/**
 * Extract schema-relevant sections from markdown content
 * @param {string} content - Markdown content
 * @returns {string|null}
 */
function extractSchemaSection(content) {
  // Extract mermaid ER diagrams
  const mermaidMatch = content.match(/```mermaid\s*\n([\s\S]*?)```/);
  if (mermaidMatch) return mermaidMatch[1].trim();

  // Extract SQL code blocks
  const sqlBlocks = [];
  const sqlRegex = /```sql\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = sqlRegex.exec(content)) !== null) {
    sqlBlocks.push(match[1].trim());
  }
  if (sqlBlocks.length > 0) return sqlBlocks.join('\n\n');

  // Extract table definition sections
  const tableSection = content.match(/## Table Definitions[\s\S]*?(?=## [^T]|$)/i);
  if (tableSection) return tableSection[0].trim();

  return null;
}

/**
 * Extract Drizzle table definitions from TypeScript
 * @param {string} content - TypeScript content
 * @returns {string|null}
 */
function extractDrizzleTables(content) {
  // Match pgTable/mysqlTable/sqliteTable definitions
  const tableRegex = /export\s+const\s+(\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*['"](\w+)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g;
  const tables = [];
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    tables.push(`Table: ${match[2]} (${match[1]})\n  ${match[3].trim()}`);
  }

  return tables.length > 0 ? tables.join('\n\n') : null;
}

/**
 * Format parsed data objects into a comprehensive schema reference
 * Groups by database/schema, distinguishes object types, includes indexes
 * @param {Array} objects - Parsed data objects (tables, views, etc.)
 * @returns {string}
 */
function formatTablesAsContext(objects) {
  const lines = [];

  // Group by database then schema
  const grouped = groupByDatabaseAndSchema(objects);

  for (const [dbKey, schemas] of Object.entries(grouped)) {
    if (dbKey !== '_default') {
      lines.push(`## Database: ${dbKey}`);
      lines.push('');
    }

    for (const [schemaKey, schemaObjects] of Object.entries(schemas)) {
      if (schemaKey !== '_default') {
        lines.push(`## Schema: ${schemaKey}`);
        lines.push('');
      }

      for (const obj of schemaObjects) {
        const qualifiedName = obj.schema ? `${obj.schema}.${obj.table}` : obj.table;
        const typeLabel = obj.objectType && obj.objectType !== 'TABLE'
          ? ` (${obj.objectType})`
          : '';

        lines.push(`### ${qualifiedName}${typeLabel}`);
        lines.push('| Column | Type | PK | FK | Nullable | Constraints |');
        lines.push('|--------|------|----|----|----------|-------------|');

        for (const col of obj.columns) {
          const isPK = col.constraints.includes('PK') ? 'Y' : '';
          const isFK = col.constraints.includes('FK') ? 'Y' : '';
          const nullable = col.nullable ? 'Y' : 'N';
          // Build other constraints (exclude PK/FK/NULLABLE/NOT NULL as they have dedicated columns)
          const otherConstraints = col.constraints
            .split(', ')
            .filter(c => !['PK', 'FK', 'NULLABLE', 'NOT NULL'].includes(c))
            .join(', ');

          lines.push(`| ${col.name} | ${col.type} | ${isPK} | ${isFK} | ${nullable} | ${otherConstraints} |`);
        }
        lines.push('');

        // Show indexes for this object
        if (obj.indexes && obj.indexes.length > 0) {
          lines.push('**Indexes:**');
          for (const idx of obj.indexes) {
            const uniqueLabel = idx.unique ? 'UNIQUE ' : '';
            lines.push(`- \`${idx.name}\`: ${uniqueLabel}(${idx.columns.join(', ')})`);
          }
          lines.push('');
        }

        // Show view definition summary if available
        if (obj.viewDefinition) {
          const shortDef = obj.viewDefinition.length > 200
            ? obj.viewDefinition.substring(0, 200) + '...'
            : obj.viewDefinition;
          lines.push(`**Definition:** \`${shortDef}\``);
          lines.push('');
        }
      }
    }
  }

  return lines.join('\n');
}

/**
 * Group data objects by database and schema for organized output
 * @param {Array} objects - Parsed data objects
 * @returns {Object} - Nested { database: { schema: [objects] } }
 */
function groupByDatabaseAndSchema(objects) {
  const grouped = {};

  for (const obj of objects) {
    const dbKey = obj.database || '_default';
    const schemaKey = obj.schema || '_default';

    if (!grouped[dbKey]) grouped[dbKey] = {};
    if (!grouped[dbKey][schemaKey]) grouped[dbKey][schemaKey] = [];

    grouped[dbKey][schemaKey].push(obj);
  }

  return grouped;
}

/**
 * Build complete schema context from discovered sources
 * Groups by database/schema, includes all data objects
 * @param {string} projectRoot - Project root
 * @returns {{context: string, sourceCount: number}}
 */
function buildSchemaContext(projectRoot) {
  const sources = discoverSchemaSources(projectRoot);

  if (sources.length === 0) {
    return { context: '', sourceCount: 0 };
  }

  const allObjects = [];
  const rawSections = [];
  const sourceFiles = [];

  for (const source of sources) {
    // Infer database name from file path for multi-database projects
    const database = inferDatabaseFromPath(source.path, projectRoot);
    const { tables, rawContent } = parseSchemaSource(source.path, source.type, { database });

    if (tables.length > 0) {
      allObjects.push(...tables);
      sourceFiles.push(path.relative(projectRoot, source.path));
    }

    if (rawContent) {
      rawSections.push({
        file: path.relative(projectRoot, source.path),
        content: rawContent,
      });
      sourceFiles.push(path.relative(projectRoot, source.path));
    }
  }

  if (allObjects.length === 0 && rawSections.length === 0) {
    return { context: '', sourceCount: 0 };
  }

  // Build context string
  const parts = [];

  parts.push('# Database Schema Reference');
  parts.push('');
  parts.push('IMPORTANT: When writing data-layer code, you MUST use ONLY the tables,');
  parts.push('views, and columns defined below. Do NOT invent or assume column names.');
  parts.push('');

  // Summary counts
  const tables = allObjects.filter(o => o.objectType === 'TABLE');
  const views = allObjects.filter(o => o.objectType === 'VIEW');
  const matViews = allObjects.filter(o => o.objectType === 'MATERIALIZED VIEW');
  const totalIndexes = allObjects.reduce((n, o) => n + (o.indexes ? o.indexes.length : 0), 0);

  parts.push(`**Objects:** ${tables.length} tables, ${views.length} views, ${matViews.length} materialized views, ${totalIndexes} indexes`);
  parts.push('');

  if (allObjects.length > 0) {
    parts.push(formatTablesAsContext(allObjects));
  }

  if (rawSections.length > 0) {
    parts.push('## Schema Sources');
    parts.push('');
    for (const section of rawSections) {
      parts.push(`### From: ${section.file}`);
      parts.push('');
      parts.push(section.content);
      parts.push('');
    }
  }

  parts.push('---');
  parts.push(`*Sources: ${sourceFiles.join(', ')}*`);

  const context = parts.join('\n');

  return { context, sourceCount: sources.length };
}

/**
 * Infer database name from file path for multi-database projects
 * Detects patterns like db/<dbname>/migrations/ or databases/<dbname>/
 * @param {string} filePath - Absolute path to schema file
 * @param {string} projectRoot - Project root
 * @returns {string|null}
 */
function inferDatabaseFromPath(filePath, projectRoot) {
  const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/');

  // Pattern: db/<dbname>/migrations/ or databases/<dbname>/
  const dbMatch = rel.match(/(?:databases?|dbs?)\/(\w+)\//i);
  if (dbMatch) return dbMatch[1];

  return null;
}

/**
 * Write schema context to .claude/rules/schema-context.md as a path-specific rule
 * @param {string} projectRoot - Project root
 * @param {string} context - Schema context content
 */
function persistSchemaContext(projectRoot, context) {
  const rulesDir = path.join(projectRoot, '.claude', 'rules');

  try {
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }

    const frontmatter = [
      '---',
      'paths:',
      '  - "src/**/repositories/**"',
      '  - "src/**/models/**"',
      '  - "src/**/entities/**"',
      '  - "src/**/queries/**"',
      '  - "src/**/dao/**"',
      '  - "src/**/mappers/**"',
      '  - "src/**/controllers/**"',
      '  - "**/*.repository.*"',
      '  - "**/*.model.*"',
      '  - "**/*.entity.*"',
      '  - "**/*.query.*"',
      '  - "**/*.prisma"',
      '  - "**/migrations/**"',
      '---',
      '',
    ].join('\n');

    const fullContent = frontmatter + context;
    const cachePath = path.join(rulesDir, 'schema-context.md');
    fs.writeFileSync(cachePath, fullContent, 'utf8');

    logger.info('Schema context persisted to .claude/rules/schema-context.md', {
      context: 'schema-context-hook',
      size: fullContent.length,
    });
  } catch (error) {
    logger.warn('Failed to persist schema context', {
      context: 'schema-context-hook',
      error: error.message,
    });
  }
}

/**
 * Main hook function for PreToolUse (Write|Edit)
 * @param {Object} params - Hook params from Claude Code
 * @returns {Object} Hook result with optional additionalContext
 */
async function hook(params) {
  // Only process Write/Edit tools
  if (!params || !params.tool_name) {
    return { proceed: true };
  }

  if (!['Write', 'Edit'].includes(params.tool_name)) {
    return { proceed: true };
  }

  const filePath = params.tool_input?.file_path;
  if (!filePath) {
    return { proceed: true };
  }

  // Check if file targets data layer
  if (!isDataLayerFile(filePath)) {
    return { proceed: true };
  }

  let projectRoot;
  try {
    projectRoot = findProjectRoot(process.cwd());
  } catch {
    return { proceed: true };
  }

  // Fast path: check if cached schema-context.md is fresh
  const cachePath = path.join(projectRoot, '.claude', 'rules', 'schema-context.md');
  if (isCacheFresh(cachePath)) {
    try {
      const cached = fs.readFileSync(cachePath, 'utf8');
      // Strip YAML frontmatter for the additionalContext injection
      const contentOnly = cached.replace(/^---[\s\S]*?---\s*\n/, '');

      if (contentOnly.trim()) {
        logger.info('Schema context loaded from cache', {
          context: 'schema-context-hook',
          file: filePath,
        });

        return {
          proceed: true,
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            additionalContext: contentOnly,
          },
        };
      }
    } catch {
      // Cache read failed, fall through to discovery
    }
  }

  // Discovery path: scan project for schema sources
  const { context, sourceCount } = buildSchemaContext(projectRoot);

  if (!context || sourceCount === 0) {
    logger.info('No schema sources found in project', {
      context: 'schema-context-hook',
      file: filePath,
    });
    return { proceed: true };
  }

  // Persist to .claude/rules/ for native loading in future sessions
  persistSchemaContext(projectRoot, context);

  logger.info('Schema context discovered and injected', {
    context: 'schema-context-hook',
    file: filePath,
    sourceCount,
    contextSize: context.length,
  });

  return {
    proceed: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: context,
    },
  };
}

// Export for testing and Claude Code hooks system
module.exports = {
  hook,
  isDataLayerFile,
  isCacheFresh,
  discoverSchemaSources,
  parseSQL,
  parsePrisma,
  parseViewColumns,
  buildSchemaContext,
  persistSchemaContext,
  formatTablesAsContext,
  groupByDatabaseAndSchema,
  extractSchemaSection,
  extractDrizzleTables,
  inferDatabaseFromPath,
  CACHE_MAX_AGE_MS,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(hook, { name: 'schema-context-hook' });
}
