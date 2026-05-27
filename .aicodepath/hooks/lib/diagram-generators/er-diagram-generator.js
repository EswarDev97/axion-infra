#!/usr/bin/env node
/**
 * ER Diagram Generator
 * Generates Mermaid Entity-Relationship diagrams from schema files
 *
 * Features:
 * - Parses SQL CREATE TABLE statements
 * - Extracts foreign key relationships
 * - Supports SQLite, PostgreSQL, MySQL syntax
 * - Parses ORM model definitions (TypeORM, Prisma, Sequelize)
 *
 * @module hooks/lib/diagram-generators/er-diagram-generator
 */

const path = require('path');
const fs = require('fs');
const pathResolver = require('../../../lib/path-resolver');

class ERDiagramGenerator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.tables = new Map();       // All data objects (tables, views, materialized views)
    this.relations = [];
    this.indexes = new Map();      // tableName -> [{name, columns, unique}]
    this.objectTypes = new Map();  // tableName -> 'TABLE' | 'VIEW' | 'MATERIALIZED VIEW'
    this.schemas = new Map();      // tableName -> schemaName (for multi-schema)
  }

  /**
   * Generate ER diagram from schema files
   * @param {Array} sourceFiles - Array of file paths to analyze
   * @param {Object} options - Generation options
   * @returns {Object} - Generated diagram and metadata
   */
  generate(sourceFiles, options = {}) {
    const {
      maxColumns = 15,
      title = 'Database Schema',
      includeIndexes = true,
      separateByDatabase = true,
    } = options;

    // Reset state
    this.tables.clear();
    this.relations = [];
    this.indexes.clear();
    this.objectTypes.clear();
    this.schemas.clear();

    // Analyze each file
    for (const filePath of sourceFiles) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.projectRoot, filePath);

      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, 'utf8');
      const fileType = this.detectFileType(absolutePath);

      this.analyzeFile(content, filePath, fileType);
    }

    // Generate Mermaid diagram(s) - one per database if multiple found
    const mermaid = this.generateMermaid({ maxColumns, includeIndexes, separateByDatabase });

    // Collect stats
    const tableCount = Array.from(this.objectTypes.values()).filter(t => t === 'TABLE').length;
    const viewCount = Array.from(this.objectTypes.values()).filter(t => t === 'VIEW').length;
    const matViewCount = Array.from(this.objectTypes.values()).filter(t => t === 'MATERIALIZED VIEW').length;
    const indexCount = Array.from(this.indexes.values()).reduce((n, arr) => n + arr.length, 0);

    return {
      title,
      mermaidContent: mermaid,
      sourceFiles,
      entities: {
        tables: Array.from(this.tables.keys()),
        relations: this.relations.length,
        views: viewCount,
        materializedViews: matViewCount,
        indexes: indexCount,
      },
      confidence: this.calculateConfidence()
    };
  }

  /**
   * Detect file type from extension and content
   */
  detectFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath).toLowerCase();

    if (ext === '.sql') return 'sql';
    if (ext === '.prisma' || basename === 'schema.prisma') return 'prisma';
    if (ext === '.ts' || ext === '.js') {
      // Could be TypeORM or Sequelize
      return 'orm';
    }
    return 'unknown';
  }

  /**
   * Analyze a file and extract table information
   */
  analyzeFile(content, filePath, fileType) {
    switch (fileType) {
      case 'sql':
        this.analyzeSQL(content, filePath);
        break;
      case 'prisma':
        this.analyzePrisma(content, filePath);
        break;
      case 'orm':
        this.analyzeORM(content, filePath);
        break;
    }
  }

  /**
   * Analyze SQL file - tables, views, materialized views, indexes
   */
  analyzeSQL(content, filePath) {
    // Remove comments
    const cleanContent = content
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    // --- Extract CREATE TABLE statements ---
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:[`"']?(\w+)[`"']?)\.)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\);/gi;
    let match;

    while ((match = tableRegex.exec(cleanContent)) !== null) {
      const schemaName = match[1] || null;
      const tableName = match[2];
      const tableBody = match[3];
      const displayName = schemaName ? `${schemaName}.${tableName}` : tableName;

      const tableInfo = {
        name: displayName,
        columns: [],
        primaryKey: null,
        foreignKeys: [],
        filePath
      };

      this.parseTableBody(tableBody, tableInfo);
      this.tables.set(displayName, tableInfo);
      this.objectTypes.set(displayName, 'TABLE');
      if (schemaName) this.schemas.set(displayName, schemaName);
    }

    // --- Extract CREATE [OR REPLACE] [MATERIALIZED] VIEW ---
    const viewRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:(MATERIALIZED)\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:[`"']?(\w+)[`"']?)\.)?[`"']?(\w+)[`"']?\s+AS\s+([\s\S]*?)(?:;\s*$|;\s*(?=CREATE|ALTER|DROP|INSERT|UPDATE|DELETE))/gim;

    while ((match = viewRegex.exec(cleanContent)) !== null) {
      const isMaterialized = !!match[1];
      const schemaName = match[2] || null;
      const viewName = match[3];
      const selectBody = match[4];
      const displayName = schemaName ? `${schemaName}.${viewName}` : viewName;
      const objectType = isMaterialized ? 'MATERIALIZED VIEW' : 'VIEW';

      const viewInfo = {
        name: displayName,
        columns: this.parseViewSelect(selectBody),
        primaryKey: null,
        foreignKeys: [],
        filePath
      };

      this.tables.set(displayName, viewInfo);
      this.objectTypes.set(displayName, objectType);
      if (schemaName) this.schemas.set(displayName, schemaName);
    }

    // --- Extract CREATE [UNIQUE] INDEX ---
    const indexRegex = /CREATE\s+(?:(UNIQUE)\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s+ON\s+(?:(?:[`"']?(\w+)[`"']?)\.)?[`"']?(\w+)[`"']?\s*\(([^)]+)\)/gi;

    while ((match = indexRegex.exec(cleanContent)) !== null) {
      const isUnique = !!match[1];
      const indexName = match[2];
      const indexSchema = match[3] || null;
      const tableName = match[4];
      const indexCols = match[5].split(',').map(c => c.replace(/[`"']/g, '').trim());

      // Find the table this index belongs to (try schema.table first, then just table)
      const qualifiedName = indexSchema ? `${indexSchema}.${tableName}` : tableName;
      const targetTable = this.tables.has(qualifiedName)
        ? qualifiedName
        : this.tables.has(tableName) ? tableName : qualifiedName;

      if (!this.indexes.has(targetTable)) {
        this.indexes.set(targetTable, []);
      }
      this.indexes.get(targetTable).push({
        name: indexName,
        columns: indexCols,
        unique: isUnique,
      });
    }

    // --- Extract ALTER TABLE for additional foreign keys ---
    const alterRegex = /ALTER\s+TABLE\s+[`"']?(\w+)[`"']?\s+ADD\s+(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)/gi;
    while ((match = alterRegex.exec(cleanContent)) !== null) {
      const fromTable = match[1];
      const fromColumn = match[2].replace(/[`"']/g, '').trim();
      const toTable = match[3];
      const toColumn = match[4].replace(/[`"']/g, '').trim();

      this.relations.push({
        from: fromTable,
        to: toTable,
        fromColumn,
        toColumn,
        type: 'many-to-one'
      });
    }
  }

  /**
   * Parse column aliases from a VIEW's SELECT statement
   */
  parseViewSelect(selectBody) {
    const columns = [];
    const selectMatch = selectBody.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
    if (!selectMatch) return columns;

    const selectClause = selectMatch[1].trim();
    if (selectClause === '*') {
      columns.push({ name: '*', type: 'unknown', isPrimaryKey: false, isForeignKey: false, isNotNull: false, isUnique: false });
      return columns;
    }

    // Split by comma respecting parentheses
    let depth = 0;
    let current = '';
    const parts = [];
    for (const char of selectClause) {
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) parts.push(current.trim());

    for (const part of parts) {
      const aliasMatch = part.match(/\s+AS\s+[`"']?(\w+)[`"']?\s*$/i);
      const colName = aliasMatch ? aliasMatch[1] : part.match(/(?:\w+\.)?[`"']?(\w+)[`"']?\s*$/)?.[1];
      if (colName) {
        columns.push({
          name: colName,
          type: this.inferViewColumnType(part),
          isPrimaryKey: false,
          isForeignKey: false,
          isNotNull: false,
          isUnique: false
        });
      }
    }

    return columns;
  }

  /**
   * Infer column type from a view SELECT expression
   */
  inferViewColumnType(expr) {
    const lower = expr.toLowerCase();
    if (/^count\s*\(/i.test(lower)) return 'int';
    if (/^(?:sum|avg)\s*\(/i.test(lower)) return 'numeric';
    if (/::(?:int|integer|bigint)/i.test(lower)) return 'int';
    if (/::(?:text|varchar|char)/i.test(lower)) return 'text';
    if (/::(?:bool|boolean)/i.test(lower)) return 'bool';
    if (/::(?:timestamp|date|time)/i.test(lower)) return 'timestamp';
    return 'varies';
  }

  /**
   * Parse table body to extract columns and constraints
   */
  parseTableBody(body, tableInfo) {
    const lines = body.split(',').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line || line.startsWith('--')) continue;

      // Check for PRIMARY KEY constraint
      const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        tableInfo.primaryKey = pkMatch[1].replace(/[`"']/g, '').split(',').map(s => s.trim());
        continue;
      }

      // Check for FOREIGN KEY constraint (supports schema.table references)
      const fkMatch = line.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:(?:[`"']?(\w+)[`"']?)\.)?[`"']?(\w+)[`"']?\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const fromColumn = fkMatch[1].replace(/[`"']/g, '').trim();
        const fkSchema = fkMatch[2] || null;
        const toTableName = fkMatch[3];
        const toColumn = fkMatch[4].replace(/[`"']/g, '').trim();
        const toTable = fkSchema ? `${fkSchema}.${toTableName}` : toTableName;

        tableInfo.foreignKeys.push({ fromColumn, toTable, toColumn });
        this.relations.push({
          from: tableInfo.name,
          to: toTable,
          fromColumn,
          toColumn,
          type: 'many-to-one'
        });
        continue;
      }

      // Check for column definition
      const colMatch = line.match(/^[`"']?(\w+)[`"']?\s+(\w+(?:\([^)]+\))?)/);
      if (colMatch) {
        const colName = colMatch[1];
        const colType = this.normalizeType(colMatch[2]);

        const isPK = line.match(/PRIMARY\s+KEY/i) !== null;
        const isFK = line.match(/REFERENCES\s+/i) !== null;
        const isNotNull = line.match(/NOT\s+NULL/i) !== null;
        const isUnique = line.match(/UNIQUE/i) !== null;
        const isNullable = !isPK && !isNotNull;

        tableInfo.columns.push({
          name: colName,
          type: colType,
          isPrimaryKey: isPK,
          isForeignKey: isFK,
          isNotNull,
          isUnique,
          isNullable,
        });

        if (isPK) {
          tableInfo.primaryKey = tableInfo.primaryKey || [];
          tableInfo.primaryKey.push(colName);
        }

        // Inline foreign key (supports schema.table references)
        if (isFK) {
          const inlineFkMatch = line.match(/REFERENCES\s+(?:(?:[`"']?(\w+)[`"']?)\.)?[`"']?(\w+)[`"']?\s*\(([^)]+)\)/i);
          if (inlineFkMatch) {
            const fkSchema = inlineFkMatch[1] || null;
            const toTableName = inlineFkMatch[2];
            const toColumn = inlineFkMatch[3].replace(/[`"']/g, '').trim();
            const toTable = fkSchema ? `${fkSchema}.${toTableName}` : toTableName;

            tableInfo.foreignKeys.push({ fromColumn: colName, toTable, toColumn });
            this.relations.push({
              from: tableInfo.name,
              to: toTable,
              fromColumn: colName,
              toColumn,
              type: 'many-to-one'
            });
          }
        }
      }
    }
  }

  /**
   * Analyze Prisma schema file - models, indexes, relations
   */
  analyzePrisma(content, filePath) {
    const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const tableName = match[1];
      const modelBody = match[2];

      const tableInfo = {
        name: tableName,
        columns: [],
        primaryKey: null,
        foreignKeys: [],
        filePath
      };

      const modelIndexes = [];
      const lines = modelBody.split('\n').map(l => l.trim()).filter(Boolean);

      for (const line of lines) {
        // Skip comments
        if (line.startsWith('//')) continue;

        // Extract @@index directives
        const indexMatch = line.match(/@@index\(\[([^\]]+)\](?:,\s*map:\s*"(\w+)")?\)/);
        if (indexMatch) {
          const indexCols = indexMatch[1].split(',').map(c => c.trim());
          modelIndexes.push({
            name: indexMatch[2] || `idx_${tableName}_${indexCols.join('_')}`,
            columns: indexCols,
            unique: false,
          });
          continue;
        }

        // Extract @@unique directives
        const uniqueMatch = line.match(/@@unique\(\[([^\]]+)\](?:,\s*map:\s*"(\w+)")?\)/);
        if (uniqueMatch) {
          const uniqueCols = uniqueMatch[1].split(',').map(c => c.trim());
          modelIndexes.push({
            name: uniqueMatch[2] || `uq_${tableName}_${uniqueCols.join('_')}`,
            columns: uniqueCols,
            unique: true,
          });
          continue;
        }

        // Skip other @@ directives
        if (line.startsWith('@@')) continue;

        // Parse field
        const fieldMatch = line.match(/^(\w+)\s+(\w+)(\?)?(\[\])?/);
        if (fieldMatch) {
          const colName = fieldMatch[1];
          const colType = fieldMatch[2];
          const isOptional = fieldMatch[3] === '?';
          const isArray = fieldMatch[4] === '[]';

          // Check for @id
          const isPK = line.includes('@id');
          const isUnique = line.includes('@unique');

          // Check for relation
          const relationMatch = line.match(/@relation\([^)]*references:\s*\[(\w+)\]/);
          if (relationMatch) {
            // This is a relation field, skip adding as column
            continue;
          }

          // Check if it's a scalar type or a relation
          const scalarTypes = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Decimal', 'BigInt'];
          if (scalarTypes.includes(colType) || colType.startsWith('Enum')) {
            tableInfo.columns.push({
              name: colName,
              type: this.prismaToSQLType(colType),
              isPrimaryKey: isPK,
              isForeignKey: false,
              isNotNull: !isOptional,
              isUnique,
              isNullable: isOptional,
            });

            if (isPK) {
              tableInfo.primaryKey = tableInfo.primaryKey || [];
              tableInfo.primaryKey.push(colName);
            }
          } else if (!isArray) {
            // Foreign key reference
            const fkField = line.match(/@relation\([^)]*fields:\s*\[(\w+)\]/);
            if (fkField) {
              tableInfo.foreignKeys.push({
                fromColumn: fkField[1],
                toTable: colType,
                toColumn: 'id'
              });
              this.relations.push({
                from: tableName,
                to: colType,
                fromColumn: fkField[1],
                toColumn: 'id',
                type: isArray ? 'one-to-many' : 'many-to-one'
              });
            }
          }
        }
      }

      this.tables.set(tableName, tableInfo);
      this.objectTypes.set(tableName, 'TABLE');

      // Store indexes
      if (modelIndexes.length > 0) {
        this.indexes.set(tableName, modelIndexes);
      }
    }
  }

  /**
   * Analyze ORM model files (TypeORM/Sequelize patterns)
   */
  analyzeORM(content, filePath) {
    // TypeORM Entity detection
    const entityMatch = content.match(/@Entity\([^)]*\)\s*(?:export\s+)?class\s+(\w+)/);
    if (entityMatch) {
      this.analyzeTypeORM(content, filePath, entityMatch[1]);
      return;
    }

    // Sequelize model detection
    const seqMatch = content.match(/class\s+(\w+)\s+extends\s+Model/);
    if (seqMatch) {
      this.analyzeSequelize(content, filePath, seqMatch[1]);
    }
  }

  /**
   * Analyze TypeORM entity
   */
  analyzeTypeORM(content, filePath, tableName) {
    const tableInfo = {
      name: tableName,
      columns: [],
      primaryKey: null,
      foreignKeys: [],
      filePath
    };

    // Extract columns with @Column decorator
    const colRegex = /@(?:Primary(?:Generated)?Column|Column)\([^)]*\)\s*(\w+)(?:\??:\s*(\w+))?/g;
    let match;

    while ((match = colRegex.exec(content)) !== null) {
      const colName = match[1];
      const colType = match[2] || 'unknown';
      const isPK = match[0].includes('PrimaryColumn') || match[0].includes('PrimaryGeneratedColumn');

      tableInfo.columns.push({
        name: colName,
        type: this.normalizeType(colType),
        isPrimaryKey: isPK,
        isForeignKey: false,
        isNotNull: !match[0].includes('nullable: true')
      });

      if (isPK) {
        tableInfo.primaryKey = tableInfo.primaryKey || [];
        tableInfo.primaryKey.push(colName);
      }
    }

    // Extract relations
    const relRegex = /@(?:ManyToOne|OneToMany|OneToOne|ManyToMany)\([^)]*\)\s*(?:@JoinColumn\([^)]*\)\s*)?(\w+)(?:\??:\s*(\w+))/g;
    while ((match = relRegex.exec(content)) !== null) {
      const relName = match[1];
      const relType = match[2];

      if (relType && relType !== 'unknown') {
        const type = match[0].includes('ManyToOne') ? 'many-to-one' :
                    match[0].includes('OneToMany') ? 'one-to-many' :
                    match[0].includes('ManyToMany') ? 'many-to-many' : 'one-to-one';

        this.relations.push({
          from: tableName,
          to: relType,
          fromColumn: relName,
          toColumn: 'id',
          type
        });
      }
    }

    this.tables.set(tableName, tableInfo);
  }

  /**
   * Analyze Sequelize model
   */
  analyzeSequelize(content, filePath, tableName) {
    const tableInfo = {
      name: tableName,
      columns: [],
      primaryKey: null,
      foreignKeys: [],
      filePath
    };

    // Extract columns from init() or define()
    const initMatch = content.match(/init\s*\(\s*\{([\s\S]*?)\}\s*,/);
    if (initMatch) {
      const columnsBody = initMatch[1];
      const colRegex = /(\w+)\s*:\s*\{[^}]*type\s*:\s*DataTypes\.(\w+)/g;
      let match;

      while ((match = colRegex.exec(columnsBody)) !== null) {
        const colName = match[1];
        const colType = match[2].toLowerCase();

        tableInfo.columns.push({
          name: colName,
          type: colType,
          isPrimaryKey: match[0].includes('primaryKey: true'),
          isForeignKey: false,
          isNotNull: !match[0].includes('allowNull: true')
        });
      }
    }

    this.tables.set(tableName, tableInfo);
  }

  /**
   * Normalize SQL type for display
   */
  normalizeType(type) {
    const typeMap = {
      'INTEGER': 'int',
      'BIGINT': 'bigint',
      'TEXT': 'text',
      'VARCHAR': 'varchar',
      'BOOLEAN': 'bool',
      'REAL': 'float',
      'DATETIME': 'datetime',
      'TIMESTAMP': 'timestamp',
      'JSON': 'json',
      'BLOB': 'blob',
      'string': 'varchar',
      'number': 'int',
      'boolean': 'bool',
      'Date': 'datetime'
    };

    const upperType = type.toUpperCase().replace(/\([^)]+\)/, '');
    return typeMap[upperType] || typeMap[type] || type.toLowerCase();
  }

  /**
   * Convert Prisma type to SQL-like type
   */
  prismaToSQLType(prismaType) {
    const typeMap = {
      'String': 'varchar',
      'Int': 'int',
      'Float': 'float',
      'Boolean': 'bool',
      'DateTime': 'datetime',
      'Json': 'json',
      'Bytes': 'blob',
      'Decimal': 'decimal',
      'BigInt': 'bigint'
    };
    return typeMap[prismaType] || prismaType.toLowerCase();
  }

  /**
   * Generate Mermaid ER diagram(s)
   * Groups by schema when multiple schemas exist
   * Includes PK, FK, data type, nullable, and indexes per entity
   */
  generateMermaid(options) {
    const { maxColumns, includeIndexes, separateByDatabase } = options;

    // Determine if we need schema grouping
    const schemaNames = new Set(this.schemas.values());
    const hasMultipleSchemas = schemaNames.size > 1;

    // If multiple schemas and separate requested, generate one diagram per schema
    if (hasMultipleSchemas && separateByDatabase) {
      return this.generateMultiSchemaMermaid(options);
    }

    return this.generateSingleMermaid(options);
  }

  /**
   * Generate a single Mermaid ER diagram (all objects)
   */
  generateSingleMermaid(options) {
    const { maxColumns, includeIndexes } = options;
    const lines = ['erDiagram'];

    // Add entities (tables, views, materialized views)
    for (const [name, table] of this.tables) {
      const objectType = this.objectTypes.get(name) || 'TABLE';
      const entityIndexes = this.indexes.get(name) || [];

      // Add comment for non-table objects
      if (objectType !== 'TABLE') {
        lines.push(`    %% ${objectType}`);
      }

      // Mermaid entity names cannot contain dots - replace with underscore
      const safeName = name.replace(/\./g, '_');
      lines.push(`    ${safeName} {`);

      // Add columns (limited)
      const cols = table.columns.slice(0, maxColumns);
      for (const col of cols) {
        const pkMark = col.isPrimaryKey ? ' PK' : '';
        const fkMark = col.isForeignKey ? ' FK' : '';
        const uniqueMark = col.isUnique ? ' UK' : '';

        // Build comment with nullable and index info
        const commentParts = [];
        const isNullable = col.isNullable !== undefined ? col.isNullable : (!col.isPrimaryKey && !col.isNotNull);
        if (isNullable) commentParts.push('NULLABLE');
        if (col.isNotNull && !col.isPrimaryKey) commentParts.push('NOT NULL');

        // Check if column is part of any index
        if (includeIndexes) {
          for (const idx of entityIndexes) {
            if (idx.columns.includes(col.name)) {
              commentParts.push(`IDX:${idx.name}`);
            }
          }
        }

        const comment = commentParts.length > 0 ? ` "${commentParts.join(', ')}"` : '';
        lines.push(`        ${col.type} ${col.name}${pkMark}${fkMark}${uniqueMark}${comment}`);
      }

      if (table.columns.length > maxColumns) {
        lines.push(`        text _truncated "${table.columns.length - maxColumns} more columns"`);
      }

      lines.push('    }');
    }

    // Add relations
    this.addRelationsToLines(lines);

    return lines.join('\n');
  }

  /**
   * Generate multiple Mermaid ER diagrams grouped by schema
   */
  generateMultiSchemaMermaid(options) {
    const { maxColumns, includeIndexes } = options;
    const diagrams = [];

    // Group entities by schema
    const schemaGroups = new Map();
    const noSchemaEntities = [];

    for (const [name] of this.tables) {
      const schema = this.schemas.get(name);
      if (schema) {
        if (!schemaGroups.has(schema)) schemaGroups.set(schema, []);
        schemaGroups.get(schema).push(name);
      } else {
        noSchemaEntities.push(name);
      }
    }

    // Generate one erDiagram per schema
    for (const [schema, entityNames] of schemaGroups) {
      const lines = [`%% Schema: ${schema}`, 'erDiagram'];

      for (const name of entityNames) {
        const table = this.tables.get(name);
        const objectType = this.objectTypes.get(name) || 'TABLE';
        const entityIndexes = this.indexes.get(name) || [];

        if (objectType !== 'TABLE') {
          lines.push(`    %% ${objectType}`);
        }

        const safeName = name.replace(/\./g, '_');
        lines.push(`    ${safeName} {`);

        const cols = table.columns.slice(0, maxColumns);
        for (const col of cols) {
          const pkMark = col.isPrimaryKey ? ' PK' : '';
          const fkMark = col.isForeignKey ? ' FK' : '';
          const uniqueMark = col.isUnique ? ' UK' : '';
          const commentParts = [];
          const isNullable = col.isNullable !== undefined ? col.isNullable : (!col.isPrimaryKey && !col.isNotNull);
          if (isNullable) commentParts.push('NULLABLE');
          if (col.isNotNull && !col.isPrimaryKey) commentParts.push('NOT NULL');
          if (includeIndexes) {
            for (const idx of entityIndexes) {
              if (idx.columns.includes(col.name)) {
                commentParts.push(`IDX:${idx.name}`);
              }
            }
          }
          const comment = commentParts.length > 0 ? ` "${commentParts.join(', ')}"` : '';
          lines.push(`        ${col.type} ${col.name}${pkMark}${fkMark}${uniqueMark}${comment}`);
        }

        if (table.columns.length > maxColumns) {
          lines.push(`        text _truncated "${table.columns.length - maxColumns} more columns"`);
        }

        lines.push('    }');
      }

      // Add relations for entities in this schema
      this.addRelationsToLines(lines, new Set(entityNames));

      diagrams.push(lines.join('\n'));
    }

    // Add entities without schema
    if (noSchemaEntities.length > 0) {
      const lines = ['erDiagram'];
      for (const name of noSchemaEntities) {
        const table = this.tables.get(name);
        const objectType = this.objectTypes.get(name) || 'TABLE';
        const entityIndexes = this.indexes.get(name) || [];

        if (objectType !== 'TABLE') {
          lines.push(`    %% ${objectType}`);
        }

        lines.push(`    ${name} {`);
        const cols = table.columns.slice(0, maxColumns);
        for (const col of cols) {
          const pkMark = col.isPrimaryKey ? ' PK' : '';
          const fkMark = col.isForeignKey ? ' FK' : '';
          const uniqueMark = col.isUnique ? ' UK' : '';
          const commentParts = [];
          const isNullable = col.isNullable !== undefined ? col.isNullable : (!col.isPrimaryKey && !col.isNotNull);
          if (isNullable) commentParts.push('NULLABLE');
          if (col.isNotNull && !col.isPrimaryKey) commentParts.push('NOT NULL');
          if (includeIndexes) {
            for (const idx of entityIndexes) {
              if (idx.columns.includes(col.name)) {
                commentParts.push(`IDX:${idx.name}`);
              }
            }
          }
          const comment = commentParts.length > 0 ? ` "${commentParts.join(', ')}"` : '';
          lines.push(`        ${col.type} ${col.name}${pkMark}${fkMark}${uniqueMark}${comment}`);
        }
        if (table.columns.length > maxColumns) {
          lines.push(`        text _truncated "${table.columns.length - maxColumns} more columns"`);
        }
        lines.push('    }');
      }
      this.addRelationsToLines(lines, new Set(noSchemaEntities));
      diagrams.push(lines.join('\n'));
    }

    return diagrams.join('\n\n');
  }

  /**
   * Add relationship lines to the diagram
   * @param {string[]} lines - Lines array to append to
   * @param {Set} [filterEntities] - If provided, only add relations involving these entities
   */
  addRelationsToLines(lines, filterEntities) {
    const addedRelations = new Set();
    for (const rel of this.relations) {
      // Only add if both tables exist
      if (!this.tables.has(rel.from) || !this.tables.has(rel.to)) continue;

      // Filter by entity set if provided
      if (filterEntities && !filterEntities.has(rel.from) && !filterEntities.has(rel.to)) continue;

      // Avoid duplicate relations
      const relKey = `${rel.from}-${rel.to}`;
      if (addedRelations.has(relKey)) continue;
      addedRelations.add(relKey);

      // Determine cardinality
      let cardinality;
      switch (rel.type) {
        case 'one-to-one':
          cardinality = '||--||';
          break;
        case 'one-to-many':
          cardinality = '||--o{';
          break;
        case 'many-to-one':
          cardinality = '}o--||';
          break;
        case 'many-to-many':
          cardinality = '}o--o{';
          break;
        default:
          cardinality = '||--o{';
      }

      const safeFrom = rel.from.replace(/\./g, '_');
      const safeTo = rel.to.replace(/\./g, '_');
      lines.push(`    ${safeFrom} ${cardinality} ${safeTo} : "${rel.fromColumn}"`);
    }
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence() {
    const totalEntities = this.tables.size;
    if (totalEntities === 0) return 0;

    let confidence = 0.5;

    // Higher confidence if we found columns
    let hasColumns = false;
    for (const table of this.tables.values()) {
      if (table.columns.length > 0) {
        hasColumns = true;
        break;
      }
    }
    if (hasColumns) confidence += 0.2;

    // Higher confidence if we found relations
    if (this.relations.length > 0) confidence += 0.15;

    // Higher confidence if we found indexes
    if (this.indexes.size > 0) confidence += 0.1;

    // Higher confidence if we found views (schema completeness)
    const hasViews = Array.from(this.objectTypes.values()).some(t => t !== 'TABLE');
    if (hasViews) confidence += 0.05;

    return Math.min(1.0, confidence);
  }
}

module.exports = ERDiagramGenerator;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
ER Diagram Generator - Generate Mermaid ER diagrams from schema files

Usage: er-diagram-generator.js <file1> [file2] [...]

Supported files:
  - SQL files (.sql) - CREATE TABLE statements
  - Prisma schema (schema.prisma)
  - TypeORM entities (.ts with @Entity decorator)
  - Sequelize models (.ts/.js with Model class)

Options:
  --title <title>       Set diagram title
  --max-columns <n>     Maximum columns per table (default: 15)

Examples:
  er-diagram-generator.js db/schema.sql
  er-diagram-generator.js prisma/schema.prisma --title "Database Schema"
  er-diagram-generator.js src/entities/*.ts
    `);
    process.exit(0);
  }

  const files = args.filter(a => !a.startsWith('--'));
  const titleIdx = args.indexOf('--title');
  const title = titleIdx >= 0 ? args[titleIdx + 1] : 'Database Schema';
  const maxColIdx = args.indexOf('--max-columns');
  const maxColumns = maxColIdx >= 0 ? parseInt(args[maxColIdx + 1]) : 15;

  const projectRoot = pathResolver.findProjectRoot();
  const generator = new ERDiagramGenerator(projectRoot);
  const result = generator.generate(files, { title, maxColumns });

  console.log(`\n# ${result.title}\n`);
  console.log('```mermaid');
  console.log(result.mermaidContent);
  console.log('```\n');
  console.log(`Tables: ${result.entities.tables.length}`);
  console.log(`Relations: ${result.entities.relations}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
}
