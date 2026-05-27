# Artifact Writer (artifact-writer.js)

Foundation library for managing artifacts in the AICodePath knowledge base.

## Purpose

The `artifact-writer` library provides CRUD operations for the `artifacts` table, enabling:
- **Artifact Management**: Create, update, query, and archive artifacts
- **Traceability**: Link artifacts to each other and to code implementations
- **Full-Text Search**: Search artifacts by title and content
- **Statistics**: Track artifact counts by type, phase, and status

## What is an Artifact?

An **artifact** is any work product created during the software development lifecycle:

| Type | Description | Examples |
|------|-------------|----------|
| `requirement` | Functional or NFR requirements | User authentication requirement, performance SLA |
| `story` | User stories with acceptance criteria | "As a user, I want to log in..." |
| `design` | Design documents and decisions | Auth design, database schema, API design |
| `code` | Code implementations | Controller, service, component |
| `test` | Test cases and results | Unit test, integration test, E2E test |
| `deployment` | Deployment artifacts | Docker config, K8s manifest, CI/CD pipeline |
| `documentation` | Technical documentation | API docs, runbook, architecture guide |
| `decision` | Architectural decision records | ADR for database choice |
| `plan` | Workflow and sprint plans | Inception plan, sprint backlog |

---

## Installation

The library is automatically included with AICodePath.

### Dependencies

- `better-sqlite3` - Already in package.json
- `path-resolver.js` - Already in lib/

### Database Requirements

The knowledge base must be initialized before using this library:

```bash
./scripts/init-knowledge-base.sh
```

This creates:
- `aicodepath-docs/aicodepath.db`
- `artifacts` table with FTS5 index
- `links` table for traceability

---

## CLI Usage

### Create Artifact

```bash
# Basic creation
node .aicodepath/lib/artifact-writer.js create requirement \
  "User Authentication" \
  inception

# With all options
node .aicodepath/lib/artifact-writer.js create design \
  "Auth Service Design" \
  construction \
  --content="OAuth2 + JWT authentication with refresh tokens" \
  --file=aicodepath-docs/construction/auth-design/auth-design.md \
  --stage="auth-design" \
  --unit="user-management"
```

**Output**:
```
✓ Created artifact #12: Auth Service Design
```

### Update Artifact

```bash
# Update single field
node .aicodepath/lib/artifact-writer.js update 12 status completed

# Update content
node .aicodepath/lib/artifact-writer.js update 12 content "Updated design with refresh token rotation"
```

**Output**:
```
✓ Updated artifact #12: status = completed
```

### List Artifacts

```bash
# List all (shows statistics)
node .aicodepath/lib/artifact-writer.js list

# List by type
node .aicodepath/lib/artifact-writer.js list design

# List by phase and stage
node .aicodepath/lib/artifact-writer.js list design \
  --phase=construction \
  --stage=auth-design

# List by unit
node .aicodepath/lib/artifact-writer.js list code \
  --unit=user-management
```

**Output**:
```
Found 3 artifact(s):

#  12 | design          | Auth Service Design
       | construction/auth-design/user-management
       | aicodepath-docs/construction/auth-design/auth-design.md

#  15 | design          | Database Schema
       | construction/database-design/user-management

#  18 | design          | API Gateway Design
       | construction/api-gateway-design
```

### Show Artifact Details

```bash
node .aicodepath/lib/artifact-writer.js show 12
```

**Output**:
```
======================================================================
Artifact #12: Auth Service Design
======================================================================
Type:       design
Phase:      construction
Stage:      auth-design
Unit:       user-management
Status:     active
Version:    1
File:       aicodepath-docs/construction/auth-design/auth-design.md
Created:    2026-02-01 10:30:00
Updated:    2026-02-01 14:22:00

Metadata:
{
  "cr_number": "CR-123",
  "reviewed_by": "security-team"
}

Content:
----------------------------------------------------------------------
# Authentication Service Design

## Strategy
OAuth2 with JWT access tokens and refresh tokens.

## Components
- Auth Controller (login, logout, refresh)
- JWT Service (token generation, validation)
- User Repository (credential verification)

## Security
- bcrypt password hashing (cost factor 12)
- Refresh token rotation
- Rate limiting on login endpoint

Links:
----------------------------------------------------------------------
→ implements        #25 src/auth/auth.controller.ts
→ derived_from      #8  User Authentication Requirement
→ tests             #32 Auth Integration Tests
```

### Link Artifacts

```bash
# Link design to requirement
node .aicodepath/lib/artifact-writer.js link 12 8 derived_from \
  "Auth design implements user auth requirement"

# Link test to design
node .aicodepath/lib/artifact-writer.js link 32 12 tests \
  "Integration tests verify auth design"
```

**Output**:
```
✓ Created link #5: #12 derived_from #8
```

**Link Types**:
- `implements` - Code implements design/requirement
- `derived_from` - Design/code derived from requirement
- `tests` - Test verifies design/code
- `blocks` - Blocker relationship
- `relates_to` - General relationship
- `depends_on` - Dependency relationship
- `supersedes` - Replacement relationship
- `refines` - Refinement relationship

### Link Artifact to Code

```bash
# Link to entire file
node .aicodepath/lib/artifact-writer.js link-code 12 \
  src/auth/auth.controller.ts

# Link to specific lines
node .aicodepath/lib/artifact-writer.js link-code 12 \
  src/auth/auth.controller.ts 15 45
```

**Output**:
```
✓ Created code artifact #25 and link #6
```

This creates:
1. A `code` artifact for the file/lines
2. An `implements` link from design to code artifact

### Search Artifacts

```bash
# Simple search
node .aicodepath/lib/artifact-writer.js search authentication

# Search with filters
node .aicodepath/lib/artifact-writer.js search authentication \
  --type=design \
  --phase=construction
```

**Output**:
```
Found 2 matching artifact(s):

#  12 | design          | Auth Service Design
       | construction/auth-design
       | OAuth2 + JWT <mark>authentication</mark> with refresh tokens

#  18 | design          | API Gateway Design
       | construction/api-gateway-design
       | API gateway handles <mark>authentication</mark> and routing
```

### Show Statistics

```bash
node .aicodepath/lib/artifact-writer.js stats
```

**Output**:
```
Artifact Statistics:
==================================================
Total artifacts: 45

By Type:
  design               12
  code                 18
  requirement          8
  test                 5
  documentation        2

By Phase:
  construction         28
  inception            12
  operations           5

By Status:
  active               42
  archived             3
```

### Archive Artifact

```bash
node .aicodepath/lib/artifact-writer.js archive 12
```

**Output**:
```
✓ Archived artifact #12
```

Archived artifacts are soft-deleted (status = 'archived') and excluded from queries by default.

---

## Programmatic Usage

### Import the Library

```javascript
const ArtifactWriter = require('./.aicodepath/lib/artifact-writer');

const writer = new ArtifactWriter();
```

### Create Artifacts

```javascript
// Simple requirement
const reqId = writer.createArtifact(
  'requirement',
  'User Authentication',
  'Users must be able to authenticate with email and password',
  null, // filePath
  'CR-123', // crNumber
  'inception',
  'requirements-analysis'
);

// Design with metadata
const designId = writer.createArtifact(
  'design',
  'Auth Service Design',
  'OAuth2 + JWT authentication...',
  'aicodepath-docs/construction/auth-design/auth-design.md',
  'CR-123',
  'construction',
  'auth-design',
  'user-management',
  { reviewed_by: 'security-team', design_version: '1.0' }
);

// Code artifact
const codeId = writer.createArtifact(
  'code',
  'Auth Controller',
  null, // content in file
  'src/auth/auth.controller.ts',
  'CR-123',
  'construction',
  'code-generation',
  'user-management'
);
```

### Update Artifacts

```javascript
// Update status
writer.updateArtifact(designId, { status: 'completed' });

// Update content
writer.updateArtifact(reqId, {
  content: 'Updated requirement with MFA support',
  version: 2
});

// Update metadata (merges with existing)
writer.updateArtifact(designId, {
  metadata: { reviewed_by: 'security-team', approved: true }
});
```

### Query Artifacts

```javascript
// Get by type
const designs = writer.getArtifactsByType('design');

// Get by phase with filters
const authDesigns = writer.getArtifactsByPhase('construction', {
  stage: 'auth-design',
  unit: 'user-management'
});

// Get by ID
const artifact = writer.getArtifact(12);
console.log(artifact.title); // "Auth Service Design"
console.log(artifact.metadata); // { cr_number: 'CR-123', ... }

// Search
const results = writer.searchArtifacts('authentication', {
  type: 'design',
  phase: 'construction',
  limit: 10
});
```

### Link Artifacts

```javascript
// Link design to requirement
writer.linkArtifacts(
  designId,
  reqId,
  'derived_from',
  'Design implements requirement'
);

// Link test to design
writer.linkArtifacts(
  testId,
  designId,
  'tests',
  'Integration test verifies design'
);

// Get all links for an artifact
const links = writer.getArtifactLinks(designId, 'both');
links.forEach(link => {
  console.log(`${link.link_type}: ${link.title}`);
});
```

### Link to Code

```javascript
// Link design to code file
const { codeArtifactId, linkId } = writer.linkArtifactToCode(
  designId,
  'src/auth/auth.controller.ts',
  15,  // lineStart
  45   // lineEnd
);

console.log(`Created code artifact #${codeArtifactId}`);
```

### Search and Statistics

```javascript
// Full-text search
const results = writer.searchArtifacts('authentication JWT', {
  type: 'design',
  limit: 20
});

// Get statistics
const stats = writer.getStatistics();
console.log(`Total artifacts: ${stats.total}`);
console.log('By type:', stats.byType);
console.log('By phase:', stats.byPhase);
```

### Close Connection

```javascript
writer.close();
```

---

## Integration Examples

### Auto-Create Artifacts in Workflow

Automatically create artifacts when designs are generated:

```javascript
// In construction workflow
const ArtifactWriter = require('./.aicodepath/lib/artifact-writer');

async function generateAuthDesign(unit, crNumber) {
  const writer = new ArtifactWriter();

  // Generate design content
  const designContent = await generateDesignMarkdown();
  const filePath = `aicodepath-docs/construction/auth-design/auth-design.md`;

  // Write file
  fs.writeFileSync(filePath, designContent);

  // Create artifact
  const artifactId = writer.createArtifact(
    'design',
    'Auth Service Design',
    designContent,
    filePath,
    crNumber,
    'construction',
    'auth-design',
    unit,
    { design_type: 'security', reviewed: false }
  );

  // Link to requirement if exists
  const requirements = writer.searchArtifacts('authentication', {
    type: 'requirement'
  });

  if (requirements.length > 0) {
    writer.linkArtifacts(
      artifactId,
      requirements[0].id,
      'derived_from',
      'Design implements authentication requirement'
    );
  }

  writer.close();
  return artifactId;
}
```

### Code Generation Hook

Auto-link generated code to designs:

```javascript
// In code-generation hook
const ArtifactWriter = require('./.aicodepath/lib/artifact-writer');

function linkGeneratedCode(designId, generatedFiles) {
  const writer = new ArtifactWriter();

  generatedFiles.forEach(file => {
    writer.linkArtifactToCode(designId, file.path, file.lineStart, file.lineEnd);
  });

  writer.close();
}
```

### Traceability Report

Generate requirements-to-code traceability:

```javascript
const ArtifactWriter = require('./.aicodepath/lib/artifact-writer');

function generateTraceabilityReport() {
  const writer = new ArtifactWriter();

  // Get all requirements
  const requirements = writer.getArtifactsByType('requirement');

  console.log('Requirements Traceability Matrix\n');
  console.log('='.repeat(80));

  requirements.forEach(req => {
    console.log(`\nREQ-${req.id}: ${req.title}`);

    // Get derived designs
    const links = writer.getArtifactLinks(req.id, 'inbound');
    const designs = links.filter(l => l.link_type === 'derived_from');

    designs.forEach(design => {
      console.log(`  └─ DESIGN-${design.source_id}: ${design.title}`);

      // Get implementing code
      const codeLinks = writer.getArtifactLinks(design.source_id, 'outbound');
      const code = codeLinks.filter(l => l.link_type === 'implements');

      code.forEach(c => {
        console.log(`      └─ CODE: ${c.file_path}`);
      });
    });
  });

  writer.close();
}
```

---

## Artifact Lifecycle

### Creation

```javascript
const id = writer.createArtifact(
  'design',
  'Auth Design',
  content,
  filePath,
  crNumber,
  'construction',
  'auth-design',
  'user-management'
);
// Status: active, Version: 1
```

### Update

```javascript
writer.updateArtifact(id, {
  content: 'Updated design',
  version: 2,
  metadata: { reviewed: true }
});
// Status: active, Version: 2
```

### Archive

```javascript
writer.archiveArtifact(id);
// Status: archived (soft delete)
```

### Delete

```javascript
writer.deleteArtifact(id);
// Hard delete (use with caution)
```

---

## Artifact Schema

### Artifacts Table

```sql
CREATE TABLE artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Identity
    artifact_type TEXT NOT NULL,  -- 'requirement', 'design', 'code', etc.
    phase TEXT NOT NULL,          -- 'inception', 'construction', 'operations'
    stage TEXT,                   -- 'requirements-analysis', 'code-generation', etc.
    unit TEXT,                    -- Unit name if applicable

    -- Content
    title TEXT NOT NULL,
    content TEXT,                 -- Markdown content
    file_path TEXT,               -- Path to source file

    -- Metadata (flexible JSON)
    metadata JSON DEFAULT '{}',

    -- Tracking
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active', -- 'active', 'archived', 'superseded'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system'
);
```

### Links Table

```sql
CREATE TABLE links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,   -- Links from this artifact
    target_id INTEGER NOT NULL,   -- Links to this artifact
    link_type TEXT NOT NULL,      -- 'implements', 'derived_from', 'tests', etc.
    description TEXT,
    confidence REAL DEFAULT 1.0,  -- 0.0-1.0 confidence
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system',

    FOREIGN KEY (source_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES artifacts(id) ON DELETE CASCADE,
    UNIQUE(source_id, target_id, link_type)
);
```

---

## Troubleshooting

### Database Not Found

**Error**: `Database not found at /path/to/aicodepath.db`

**Solution**: Initialize knowledge base:
```bash
./scripts/init-knowledge-base.sh
```

### Invalid Artifact Type

**Error**: `Invalid artifact type: xyz`

**Solution**: Use one of the valid types:
- `requirement`, `requirements`
- `story`, `user-story`
- `design`
- `code`
- `test`
- `deployment`
- `documentation`, `docs`
- `decision`
- `plan`

### Invalid Phase

**Error**: `Invalid phase: xyz`

**Solution**: Use one of the valid phases:
- `inception`
- `construction`
- `operations`

### Link Not Created

**Error**: `Invalid link type: xyz`

**Solution**: Use one of the valid link types:
- `implements` - Code implements design/requirement
- `derived_from` - Design derived from requirement
- `tests` - Test verifies design/code
- `blocks` - Blocker relationship
- `relates_to` - General relationship
- `depends_on` - Dependency
- `supersedes` - Replacement
- `refines` - Refinement

### Search Returns No Results

**Issue**: Full-text search not finding artifacts

**Solutions**:
1. **Check FTS5 index**:
   ```bash
   sqlite3 aicodepath-docs/aicodepath.db "SELECT * FROM artifacts_fts LIMIT 5;"
   ```

2. **Rebuild index** (if corrupted):
   ```bash
   sqlite3 aicodepath-docs/aicodepath.db "INSERT INTO artifacts_fts(artifacts_fts) VALUES('rebuild');"
   ```

3. **Use wildcards**:
   ```javascript
   writer.searchArtifacts('auth*'); // Matches 'auth', 'authentication', etc.
   ```

---

## Best Practices

### 1. Create Artifacts as You Go

Don't wait until the end. Create artifacts when you generate designs:

```javascript
// Good: Create artifact immediately
const designContent = generateAuthDesign();
fs.writeFileSync(filePath, designContent);
writer.createArtifact('design', title, designContent, filePath, ...);

// Bad: Generate many files, then try to create artifacts later
```

### 2. Link Early and Often

Create traceability links as soon as both artifacts exist:

```javascript
// Good: Link immediately after creation
const designId = writer.createArtifact('design', ...);
writer.linkArtifacts(designId, requirementId, 'derived_from');

// Bad: Create all artifacts first, then try to remember what links to what
```

### 3. Use Meaningful Titles

Make titles searchable and unique:

```javascript
// Good
createArtifact('design', 'Auth Service Design - OAuth2 + JWT', ...);

// Bad (too generic)
createArtifact('design', 'Design', ...);
```

### 4. Store Rich Metadata

Use the metadata field for searchable attributes:

```javascript
createArtifact('design', title, content, filePath, crNumber, phase, stage, unit, {
  design_type: 'security',
  reviewed_by: ['security-team', 'architect'],
  technologies: ['oauth2', 'jwt', 'bcrypt'],
  complexity: 'medium',
  priority: 'high'
});
```

### 5. Version Artifacts

Update version when content changes significantly:

```javascript
writer.updateArtifact(id, {
  content: 'New design with refresh token rotation',
  version: 2,
  metadata: { ...existingMetadata, updated_reason: 'Added refresh token rotation' }
});
```

### 6. Archive, Don't Delete

Prefer archiving over hard deletion for audit trail:

```javascript
// Good: Archive (reversible)
writer.archiveArtifact(id);

// Bad: Delete (permanent)
writer.deleteArtifact(id);
```

---

## Future Enhancements

1. **Auto-Linking**: AI-powered link suggestion based on content similarity
2. **Versioning**: Full version control with diffs
3. **Approval Workflow**: Track review and approval status
4. **Export**: Export artifacts to PDF, Word, or Confluence
5. **Dashboard Integration**: Real-time artifact updates in web UI
6. **Graph Visualization**: D3.js graph of artifact relationships
7. **Bulk Import**: Import existing docs as artifacts
8. **Template Support**: Artifact templates by type

---

## See Also

- [kb-writer.js](./kb-writer-README.md) - Workflow state management
- [kb-query.js](./kb-query-README.md) - Knowledge base queries
- [Dashboard Guide](../dashboard/README.md) - Dashboard setup
- [Database Schema](../db/schema.sql) - Complete DB schema
- [Core Workflow](../rules/core-workflow.md) - Workflow phases

---

*Last Updated: 2026-02-02*
*Version: 1.0.0*
