# Code Indexer Library

**Path**: `.aicodepath/lib/code-indexer.js`

## Overview

The Code Indexer is a powerful library for parsing, indexing, and analyzing code entities and their dependencies. It manages the `code_entities` and `code_relations` tables in the AICodePath knowledge base, enabling:

- **Dependency graphing**: Track imports, calls, inheritance, and implementations
- **Complexity analysis**: Calculate cyclomatic complexity metrics
- **Incremental indexing**: Skip unchanged files via content hashing
- **Multi-language support**: JavaScript, TypeScript, Python, SQL, and more
- **Full-text search**: Query entities by name and documentation

## Architecture

### Database Tables

#### `code_entities`
Stores all code entities (classes, functions, methods, imports, etc.)

**Key Fields**:
- `entity_type`: class, function, method, variable, constant, import, table, index
- `name`: Entity name
- `qualified_name`: Full path (e.g., `src/services/UserService.ts:UserService`)
- `language`: typescript, javascript, python, sql, etc.
- `file_path`: Relative file path
- `line_start`, `line_end`: Source location
- `signature`: Function/class signature
- `body`: Full entity body
- `documentation`: Extracted JSDoc/docstrings
- `entity_hash`: SHA-256 hash for duplication detection
- `file_hash`: Hash of entire file for incremental indexing
- `complexity`: Cyclomatic complexity score
- `exported`: Boolean flag for public entities

#### `code_relations`
Stores relations between entities

**Key Fields**:
- `from_entity_id`: Source entity ID
- `to_entity_id`: Target entity ID (can be null for external dependencies)
- `relation_type`: imports, calls, extends, implements, uses
- `from_entity_name`, `to_entity_name`: Names when IDs are unavailable

### Entity Types

| Type | Description | Example |
|------|-------------|---------|
| `class` | Class definition | `class UserService { }` |
| `function` | Function declaration | `function authenticate() { }` |
| `method` | Class method | `async login() { }` |
| `variable` | Variable declaration | `const config = { }` |
| `constant` | Constant declaration | `const API_KEY = '...'` |
| `import` | Import statement | `import { User } from './models'` |
| `table` | SQL table | `CREATE TABLE users (...)` |
| `index` | SQL index | `CREATE INDEX idx_users_email ...` |

### Relation Types

| Type | Description | Example |
|------|-------------|---------|
| `imports` | Module import | `import express from 'express'` |
| `calls` | Function call | `authenticate(user)` |
| `extends` | Class inheritance | `class Admin extends User` |
| `implements` | Interface implementation | `class UserService implements IService` |
| `uses` | General dependency | Any other reference |

## API Reference

### Constructor

```javascript
const CodeIndexer = require('./code-indexer');
const indexer = new CodeIndexer(projectPath);
```

**Parameters**:
- `projectPath` (optional): Project root path. Defaults to current project root.

### Methods

#### `indexFile(filePath, recursive = true)`

Index a file or directory.

**Parameters**:
- `filePath`: Absolute or relative path to file/directory
- `recursive`: Whether to recursively index directories (default: true)

**Returns**: Object with indexing statistics
```javascript
{
  filesScanned: 150,
  filesIndexed: 145,
  filesSkipped: 5,       // Unchanged files
  entitiesCreated: 432,
  relationsCreated: 789,
  errors: []             // Array of { file, error }
}
```

**Example**:
```javascript
const stats = indexer.indexFile('src/');
console.log(`Indexed ${stats.entitiesCreated} entities`);
```

#### `createEntity(filePath, entityType, name, lineStart, lineEnd, complexity, documentation, signature, body, exported, fileHash)`

Create a code entity record.

**Parameters**:
- `filePath`: Relative file path
- `entityType`: Entity type (class, function, etc.)
- `name`: Entity name
- `lineStart`: Starting line number
- `lineEnd`: Ending line number
- `complexity`: Cyclomatic complexity score
- `documentation`: JSDoc/docstring
- `signature`: Function/class signature (optional)
- `body`: Full entity body (optional)
- `exported`: Boolean, whether entity is exported (default: false)
- `fileHash`: Hash of file content for incremental indexing (optional)

**Returns**: Entity ID (integer)

**Example**:
```javascript
const entityId = indexer.createEntity(
  'src/auth.js',
  'function',
  'authenticate',
  10,
  25,
  3,
  '/** Authenticate user with JWT */',
  'function authenticate(token)',
  '{ ... }',
  true,
  'abc123...'
);
```

#### `createRelation(fromEntityId, toEntityId, relationType, toEntityName)`

Create a relation between entities.

**Parameters**:
- `fromEntityId`: Source entity ID
- `toEntityId`: Target entity ID (can be null for external deps)
- `relationType`: Relation type (imports, calls, etc.)
- `toEntityName`: Target entity name (when ID unknown)

**Returns**: Relation ID (integer)

**Example**:
```javascript
// Link function to its imports
indexer.createRelation(
  functionId,
  null,
  'imports',
  'express'
);

// Link class inheritance
indexer.createRelation(
  adminClassId,
  userClassId,
  'extends',
  null
);
```

#### `getEntitiesByFile(filePath)`

Get all entities in a file.

**Parameters**:
- `filePath`: File path (relative or absolute)

**Returns**: Array of entity objects

**Example**:
```javascript
const entities = indexer.getEntitiesByFile('src/services/UserService.ts');
entities.forEach(e => {
  console.log(`${e.entity_type}: ${e.name} (lines ${e.line_start}-${e.line_end})`);
});
```

#### `getDependencies(entityId, depth = 1)`

Get dependency graph for an entity.

**Parameters**:
- `entityId`: Entity ID
- `depth`: Depth of traversal (default: 1, not yet implemented for depth > 1)

**Returns**: Object with dependency information
```javascript
{
  entity: { ... },          // The entity itself
  outgoing: [ ... ],        // What this entity uses
  incoming: [ ... ]         // What uses this entity
}
```

**Example**:
```javascript
const deps = indexer.getDependencies(42);

console.log(`Entity: ${deps.entity.name}`);

console.log('\nOutgoing dependencies:');
deps.outgoing.forEach(rel => {
  console.log(`  ${rel.relation_type} -> ${rel.target_name}`);
});

console.log('\nIncoming dependencies:');
deps.incoming.forEach(rel => {
  console.log(`  ${rel.relation_type} <- ${rel.source_name}`);
});
```

#### `getComplexityMetrics()`

Get codebase-wide complexity statistics.

**Returns**: Object with metrics
```javascript
{
  entities: [                  // Count by entity type
    { entity_type: 'class', count: 42 },
    { entity_type: 'function', count: 156 }
  ],
  files: {
    total_files: 87,
    total_entities: 432
  },
  complexity: {
    avg_complexity: 4.2,
    max_complexity: 23,
    min_complexity: 1
  },
  mostComplex: [ ... ],        // Top 10 most complex entities
  relations: [                 // Count by relation type
    { relation_type: 'imports', count: 234 },
    { relation_type: 'calls', count: 567 }
  ]
}
```

**Example**:
```javascript
const metrics = indexer.getComplexityMetrics();
console.log(`Average complexity: ${metrics.complexity.avg_complexity}`);
console.log(`Most complex entities:`);
metrics.mostComplex.forEach((e, idx) => {
  console.log(`  ${idx + 1}. ${e.name} (complexity: ${e.complexity})`);
});
```

#### `searchEntities(query, limit = 20)`

Search entities using full-text search.

**Parameters**:
- `query`: Search query (FTS5 syntax)
- `limit`: Maximum results (default: 20)

**Returns**: Array of matching entities

**Example**:
```javascript
// Simple search
const results = indexer.searchEntities('authentication');

// FTS5 syntax
const results = indexer.searchEntities('auth* AND user*');
```

#### `close()`

Close database connection.

**Example**:
```javascript
indexer.close();
```

## CLI Usage

The Code Indexer can be used as a command-line tool.

### Index Files

```bash
# Index a directory
node .aicodepath/lib/code-indexer.js index src/

# Index a single file
node .aicodepath/lib/code-indexer.js index src/services/UserService.ts
```

**Output**:
```
Indexing: src/...

Indexing Complete:
  Files scanned: 150
  Files indexed: 145
  Files skipped (unchanged): 5
  Entities created: 432
  Relations created: 789
```

### List Entities in a File

```bash
node .aicodepath/lib/code-indexer.js list src/auth.js
```

**Output**:
```
Entities in src/auth.js:

  [42] function: authenticate
      Lines 10-25, Complexity: 3
      Doc: /** Authenticate user with JWT */...

  [43] function: verifyToken
      Lines 27-45, Complexity: 5
      Doc: /** Verify JWT token validity */...
```

### Show Dependency Graph

```bash
node .aicodepath/lib/code-indexer.js deps 42
```

**Output**:
```
Dependency Graph for: authenticate

Entity: function authenticate
File: src/auth.js:10

Outgoing Relations (what this entity uses):
  imports -> jsonwebtoken (external)
  calls -> verifyToken (src/auth.js)

Incoming Relations (what uses this entity):
  calls <- login (src/controllers/auth.controller.js)
  calls <- middleware (src/middleware/auth.js)
```

### Show Complexity Metrics

```bash
node .aicodepath/lib/code-indexer.js metrics
```

**Output**:
```
=== Codebase Complexity Metrics ===

Entity Distribution:
  class: 42
  function: 156
  method: 89
  import: 234

File Statistics:
  Total files indexed: 87
  Total entities: 521

Complexity Statistics:
  Average complexity: 4.23
  Max complexity: 23
  Min complexity: 1

Most Complex Entities:
  1. processPayment (function)
     Complexity: 23, File: src/services/payment.js:45
  2. validateRequest (function)
     Complexity: 18, File: src/middleware/validator.js:12
  ...

Relation Statistics:
  imports: 234
  calls: 567
  extends: 12
  implements: 8
```

### Search Entities

```bash
node .aicodepath/lib/code-indexer.js search "authentication"
```

**Output**:
```
Search Results for: "authentication"

  authenticate (function)
  File: src/auth.js
  Doc: /** Authenticate user with JWT token */...

  AuthenticationService (class)
  File: src/services/auth.service.js
  Doc: /** Handle user authentication and authorization */...
```

## Language Support

### JavaScript / TypeScript

**Detected Entities**:
- Classes with inheritance and interfaces
- Functions (standard and arrow functions)
- Import statements
- Exported entities

**Detected Relations**:
- `imports`: Module imports
- `calls`: Function calls
- `extends`: Class inheritance
- `implements`: Interface implementations

**Example**:
```javascript
import express from 'express';

export class UserService extends BaseService implements IUserService {
  async findUser(id) {
    // ...
  }
}
```

### Python

**Detected Entities**:
- Classes with base classes
- Functions (sync and async)
- Import statements

**Detected Relations**:
- `imports`: Module imports
- `extends`: Class inheritance

**Example**:
```python
from flask import Flask

class UserService(BaseService):
    def find_user(self, user_id):
        # ...
```

### SQL

**Detected Entities**:
- Tables
- Indexes

**Example**:
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE
);

CREATE INDEX idx_users_email ON users(email);
```

### Other Languages

For languages without specific parsers (Java, Go, Ruby, PHP, C, etc.), the indexer:
- Detects language by file extension
- Stores file path and metadata
- Can be extended with custom parsers

## Incremental Indexing

The Code Indexer uses **file hashing** to avoid re-indexing unchanged files:

1. On first index, compute SHA-256 hash of file content
2. Store hash in `code_entities.file_hash`
3. On subsequent indexes, check if hash matches
4. Skip parsing if file unchanged

**Benefits**:
- 10-100x faster on large codebases
- Only re-index modified files
- Preserves entity IDs for unchanged code

**Example**:
```bash
# First run: Index 150 files
node code-indexer.js index src/
# Files indexed: 150

# Modify 3 files, run again
node code-indexer.js index src/
# Files indexed: 3
# Files skipped (unchanged): 147
```

## Complexity Calculation

The indexer calculates **cyclomatic complexity** by counting decision points:

**Decision Points**:
- `if` statements
- `else if` statements
- `for` loops
- `while` loops
- `case` statements
- `catch` blocks
- Ternary operators (`? :`)
- Logical operators (`&&`, `||`)

**Formula**: `Complexity = 1 + decision_points`

**Interpretation**:
- 1-5: Simple, low risk
- 6-10: Moderate complexity
- 11-20: High complexity, hard to test
- 21+: Very high complexity, refactor recommended

**Example**:
```javascript
function authenticate(user, password) {  // Complexity = 1 (base)
  if (!user) return false;               // +1 = 2
  if (!password) return false;           // +1 = 3

  if (user.locked && !user.admin) {      // +1 (if) +1 (&&) = 5
    return false;
  }

  return verifyPassword(password);       // Total: 5
}
```

## Integration Examples

### With GICL Loop

```javascript
// In construction workflow
const CodeIndexer = require('./.aicodepath/lib/code-indexer');
const indexer = new CodeIndexer();

// Index newly generated code
const stats = indexer.indexFile('src/services/UserService.ts');

// Check complexity of generated functions
const entities = indexer.getEntitiesByFile('src/services/UserService.ts');
const highComplexity = entities.filter(e => e.complexity > 10);

if (highComplexity.length > 0) {
  console.log('Warning: High complexity detected, consider refactoring:');
  highComplexity.forEach(e => {
    console.log(`  ${e.name}: complexity ${e.complexity}`);
  });
}

indexer.close();
```

### With Duplication Detection

```javascript
// Find duplicate code by hash
const duplicates = db.prepare(`
  SELECT
    e1.name, e1.file_path, e1.line_start,
    e2.name as dup_name, e2.file_path as dup_file, e2.line_start as dup_line
  FROM code_entities e1
  JOIN code_entities e2 ON e1.entity_hash = e2.entity_hash
  WHERE e1.id < e2.id
    AND e1.entity_hash IS NOT NULL
`).all();

duplicates.forEach(dup => {
  console.log(`Duplicate found:`);
  console.log(`  ${dup.file_path}:${dup.line_start} (${dup.name})`);
  console.log(`  ${dup.dup_file}:${dup.dup_line} (${dup.dup_name})`);
});
```

### With Dependency Analysis

```javascript
// Find circular dependencies
const entities = db.prepare('SELECT id, name FROM code_entities').all();

for (const entity of entities) {
  const deps = indexer.getDependencies(entity.id);

  for (const outgoing of deps.outgoing) {
    if (outgoing.target_id) {
      const reverseDeps = indexer.getDependencies(outgoing.target_id);

      const circular = reverseDeps.outgoing.find(
        r => r.target_id === entity.id
      );

      if (circular) {
        console.log(`Circular dependency: ${entity.name} <-> ${outgoing.target_name}`);
      }
    }
  }
}
```

## Best Practices

### 1. Index Early and Often

Run indexing after major code generation phases:
```bash
# After inception: index existing code
node code-indexer.js index src/

# After construction: index generated code
node code-indexer.js index src/services/
node code-indexer.js index src/controllers/
```

### 2. Monitor Complexity

Set up complexity thresholds in guidelines:
```json
{
  "rule": "cyclomatic-complexity",
  "threshold": 10,
  "severity": "high",
  "message": "Function complexity exceeds threshold"
}
```

### 3. Track Dependencies

Use dependency graphs to:
- Identify tightly coupled modules
- Find candidates for refactoring
- Detect circular dependencies
- Plan module boundaries

### 4. Use Full-Text Search

Search by domain concepts:
```bash
# Find all auth-related code
node code-indexer.js search "auth*"

# Find user management code
node code-indexer.js search "user AND (create OR update OR delete)"
```

### 5. Integrate with Validation

Check for duplication in pre-commit hooks:
```javascript
const indexer = new CodeIndexer();
const stats = indexer.indexFile('src/');

const duplicates = db.prepare(`
  SELECT COUNT(*) as count
  FROM code_entities e1
  JOIN code_entities e2 ON e1.entity_hash = e2.entity_hash
  WHERE e1.id < e2.id AND e1.entity_hash IS NOT NULL
`).get();

if (duplicates.count > 0) {
  console.error(`Found ${duplicates.count} duplicate code entities`);
  process.exit(1);
}
```

## Limitations and Future Enhancements

### Current Limitations

1. **Regex-based parsing**: Not as accurate as AST parsing
2. **Limited type inference**: No TypeScript type checking
3. **Single-level dependencies**: Depth parameter not fully implemented
4. **No cross-file resolution**: Cannot resolve imports to actual entities

### Planned Enhancements

1. **AST-based parsing**: Use `@babel/parser` for JavaScript/TypeScript
2. **Type resolution**: Integrate with TypeScript compiler API
3. **Recursive dependencies**: Implement multi-level dependency traversal
4. **Import resolution**: Resolve imports to actual file paths
5. **Semantic analysis**: Detect design patterns, anti-patterns
6. **Visualizations**: Generate dependency graphs, call trees
7. **Incremental updates**: Watch mode for real-time indexing

## Troubleshooting

### "Path not found" Error

**Problem**: File or directory does not exist

**Solution**:
```bash
# Use absolute path
node code-indexer.js index /home/user/project/src/

# Or relative to project root
node code-indexer.js index src/
```

### "No entities found" When Listing

**Problem**: File not yet indexed

**Solution**:
```bash
# Index the file first
node code-indexer.js index src/services/UserService.ts

# Then list entities
node code-indexer.js list src/services/UserService.ts
```

### Slow Indexing

**Problem**: Large codebase takes long to index

**Solution**:
- First run is always slow (must parse all files)
- Subsequent runs are fast (incremental indexing)
- Exclude large directories: Edit `_shouldIndex()` method

### Database Locked Error

**Problem**: Multiple processes accessing database

**Solution**:
- WAL mode is enabled (supports concurrent reads)
- Close previous indexer instances
- Wait for ongoing operations to complete

## See Also

- `kb-writer.js`: Write workflow state to knowledge base
- `kb-query.js`: Query knowledge base
- `path-resolver.js`: Resolve AICodePath directory paths
- Schema: `.aicodepath/db/schema.sql` (tables: `code_entities`, `code_relations`)

## License

Part of AICodePath v2.0 - AI-Guided Development Path Framework

---

*Last Updated: 2026-02-02*
