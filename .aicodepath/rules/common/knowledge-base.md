# Knowledge Base Management

## Overview

The AICodePath Knowledge Base provides persistent storage for all workflow artifacts, decisions, traceability links, and session state using SQLite with WAL mode, FTS5 full-text search, and JSON1 extensions.

---

## 1. Architecture

### Database Location
```
aicodepath-docs/aicodepath.db          # Main database
aicodepath-docs/aicodepath.db-wal      # Write-ahead log
aicodepath-docs/aicodepath.db-shm      # Shared memory file
```

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `artifacts` | All documentation and code artifacts | type, phase, stage, unit, content |
| `links` | Traceability between artifacts | source_id, target_id, link_type |
| `decisions` | Architectural and design decisions | decision, rationale, alternatives |
| `session_state` | Current session context | key-value pairs (JSON) |
| `session_history` | Activity log for resumption | session_id, action, details |
| `code_entities` | Code structure registry | entity_type, name, file_path |
| `validations` | Quality check results | validation_type, score, violations |
| `workflow_state` | Stage completion tracking | phase, stage, status, progress |

### Full-Text Search Tables
- `artifacts_fts` - Search artifacts by title and content
- `decisions_fts` - Search decisions by title, decision, rationale
- `code_entities_fts` - Search code by name, signature, documentation

---

## 2. Initialization

### First-Time Setup
```bash
# From project root
./scripts/init-knowledge-base.sh
```

### What Initialization Does
1. Creates `aicodepath-docs/` directory if needed
2. Backs up existing database (timestamped)
3. Applies schema from `db/schema.sql`
4. Verifies FTS5 and WAL mode
5. Imports existing markdown files
6. Displays statistics

### Verifying Setup
```bash
# Check database exists
ls -la aicodepath-docs/aicodepath.db

# Verify tables
sqlite3 aicodepath-docs/aicodepath.db ".tables"

# Check FTS5 support
sqlite3 aicodepath-docs/aicodepath.db "SELECT * FROM pragma_compile_options WHERE compile_options LIKE '%FTS5%';"
```

---

## 3. Usage During Workflow

### Automatic Operations

The knowledge base automatically captures:

| Workflow Stage | Captured Data |
|----------------|---------------|
| Requirements Analysis | Requirements as artifacts, initial decisions |
| User Stories | Stories linked to requirements |
| Reverse Engineering | Code entities, existing patterns |
| Functional Design | Design documents, architecture decisions |
| Database Design | Schema artifacts, migration tracking |
| Code Generation | Generated code entities, implementation links |
| Build and Test | Validation results, test outcomes |

### Manual Queries

#### Search for Content
```bash
# Search artifacts for "authentication"
sqlite3 aicodepath-docs/aicodepath.db "
  SELECT a.id, a.title, a.phase, a.stage
  FROM artifacts a
  JOIN artifacts_fts ON a.id = artifacts_fts.rowid
  WHERE artifacts_fts MATCH 'authentication'
  ORDER BY rank;
"

# Search decisions
sqlite3 aicodepath-docs/aicodepath.db "
  SELECT title, decision
  FROM decisions
  WHERE decision LIKE '%database%' OR rationale LIKE '%database%';
"
```

#### View Traceability
```bash
# Get implementation chain for a requirement
sqlite3 aicodepath-docs/aicodepath.db "
  WITH RECURSIVE trace AS (
    SELECT id, title, artifact_type, 0 as depth
    FROM artifacts WHERE id = 1
    UNION ALL
    SELECT a.id, a.title, a.artifact_type, t.depth + 1
    FROM artifacts a
    JOIN links l ON a.id = l.target_id
    JOIN trace t ON l.source_id = t.id
    WHERE t.depth < 5
  )
  SELECT * FROM trace;
"
```

#### Check Workflow Progress
```bash
sqlite3 aicodepath-docs/aicodepath.db "SELECT * FROM v_workflow_progress;"
```

---

## 4. JavaScript Library API

### Initialization
```javascript
const KnowledgeBase = require('./lib/knowledge-base');
const kb = new KnowledgeBase('./aicodepath-docs/aicodepath.db');
```

### Artifact Operations
```javascript
// Create artifact
const id = kb.createArtifact({
  artifact_type: 'requirement',
  phase: 'inception',
  stage: 'requirements-analysis',
  title: 'User Authentication',
  content: '# User Authentication\n\nThe system shall...',
  metadata: { priority: 'high', source: 'stakeholder' }
});

// Find artifacts
const requirements = kb.findArtifacts({
  artifact_type: 'requirement',
  phase: 'inception',
  status: 'active'
});

// Full-text search
const results = kb.searchArtifacts('authentication login security');
```

### Traceability Links
```javascript
// Create link
kb.createLink({
  source_id: requirementId,
  target_id: storyId,
  link_type: 'derived_from',
  description: 'User story derived from authentication requirement'
});

// Get traceability chain
const chain = kb.getTraceabilityChain(requirementId, 'forward', 5);
```

### Decisions
```javascript
// Record decision
kb.recordDecision({
  title: 'Database Selection',
  decision: 'Use PostgreSQL for primary data storage',
  rationale: 'Strong ACID compliance, JSON support, team familiarity',
  alternatives: ['MySQL', 'MongoDB', 'SQLite'],
  category: 'technology',
  impact: 'high'
});

// Get recent decisions
const decisions = kb.getRecentDecisions(10);
```

### Session State
```javascript
// Get/Set state
kb.setState('current_phase', 'construction');
const phase = kb.getState('current_phase');

// Log activity
kb.logActivity('session-123', 'inception', 'requirements-analysis', null,
  'completed_requirements', { count: 5 });
```

### Code Entities
```javascript
// Register code entity
kb.registerCodeEntity({
  entity_type: 'class',
  name: 'UserService',
  qualified_name: 'src/services/UserService.ts:UserService',
  file_path: 'src/services/UserService.ts',
  line_start: 10,
  line_end: 150,
  signature: 'class UserService implements IUserService',
  complexity: 8
});

// Search code entities
const entities = kb.searchCodeEntities('User');
```

### Validation Results
```javascript
// Record validation
kb.recordValidation({
  file_path: 'src/services/auth.ts',
  validation_type: 'authenticity',
  score: 95,
  status: 'PASS',
  violations: []
});

// Get validation history
const history = kb.getValidationHistory('src/services/auth.ts');
```

### Workflow State
```javascript
// Update workflow stage
kb.updateWorkflowStage({
  phase: 'construction',
  stage: 'code-generation',
  unit: 'auth-module',
  status: 'in_progress',
  steps_total: 9,
  steps_completed: 3
});

// Get progress
const progress = kb.getWorkflowProgress();
```

---

## 5. Integration with AICodePath Stages

### Inception Phase

#### Requirements Analysis
```javascript
// After gathering requirements
kb.createArtifact({
  artifact_type: 'requirement',
  phase: 'inception',
  stage: 'requirements-analysis',
  title: req.title,
  content: req.content,
  file_path: `aicodepath-docs/inception/requirements/${req.filename}`
});
```

#### Reverse Engineering
```javascript
// Register discovered code entities
for (const entity of discoveredEntities) {
  kb.registerCodeEntity(entity);
}

// Record patterns found
kb.recordDecision({
  title: `Existing Pattern: ${pattern.name}`,
  decision: pattern.description,
  rationale: 'Discovered during reverse engineering',
  category: 'architecture'
});
```

### Construction Phase

#### Design Stages
```javascript
// Link design to requirements
kb.createLink({
  source_id: designArtifactId,
  target_id: requirementId,
  link_type: 'implements'
});

// Record design decisions
kb.recordDecision({
  artifact_id: designArtifactId,
  title: 'Component Architecture',
  decision: 'Use repository pattern for data access',
  rationale: 'Separation of concerns, testability'
});
```

#### Code Generation
```javascript
// Register generated code
const codeId = kb.createArtifact({
  artifact_type: 'code',
  phase: 'construction',
  stage: 'code-generation',
  unit: 'auth-module',
  title: 'AuthService Implementation',
  file_path: 'src/services/AuthService.ts'
});

// Link to design
kb.createLink({
  source_id: codeId,
  target_id: designId,
  link_type: 'implements'
});

// Record validation
kb.recordValidation({
  artifact_id: codeId,
  validation_type: 'authenticity',
  score: 95,
  status: 'PASS'
});
```

#### Build and Test
```javascript
// Record test results
kb.recordValidation({
  file_path: 'src/services/AuthService.ts',
  validation_type: 'test',
  score: 100,
  status: 'PASS',
  violations: []
});

// Update workflow state
kb.updateWorkflowStage({
  phase: 'construction',
  stage: 'build-and-test',
  unit: 'auth-module',
  status: 'completed',
  steps_total: 7,
  steps_completed: 7
});
```

---

## 6. Session Continuity

### Saving Session State
```javascript
// Before context window ends
kb.setState('current_phase', 'construction');
kb.setState('current_stage', 'code-generation');
kb.setState('current_unit', 'auth-module');
kb.setState('pending_tasks', JSON.stringify([
  'Implement password reset',
  'Add email verification'
]));
kb.logActivity(sessionId, phase, stage, unit, 'context_saved', {
  reason: 'context_limit_approaching',
  resume_point: 'step_5_of_9'
});
```

### Resuming Session
```javascript
// In new context window
const state = kb.getAllState();
const phase = JSON.parse(state.current_phase);
const stage = JSON.parse(state.current_stage);
const unit = JSON.parse(state.current_unit);
const pending = JSON.parse(state.pending_tasks);

// Get recent activity
const history = kb.getSessionHistory(sessionId, 10);
```

---

## 7. Reporting and Analytics

### Workflow Progress Report
```sql
SELECT * FROM v_workflow_progress;
```

### Requirements Traceability Matrix
```sql
SELECT * FROM v_requirements_traceability;
```

### Recent Decisions
```sql
SELECT * FROM v_recent_decisions;
```

### Coverage Analysis
```javascript
// Get artifacts without tests
const untested = kb.findArtifacts({ artifact_type: 'code' })
  .filter(code => {
    const links = kb.getLinksFrom(code.id);
    return !links.some(l => l.link_type === 'tested_by');
  });
```

### Export for External Tools
```javascript
// Export all data as JSON
const exportData = kb.exportToJson();
fs.writeFileSync('aicodepath-export.json', JSON.stringify(exportData, null, 2));
```

---

## 8. Maintenance

### Backup
```bash
# Create timestamped backup
cp aicodepath-docs/aicodepath.db "aicodepath-docs/aicodepath.db.backup.$(date +%Y%m%d%H%M%S)"
```

### Optimize Database
```bash
# Vacuum and analyze
sqlite3 aicodepath-docs/aicodepath.db "VACUUM; ANALYZE;"
```

### Reset Database
```bash
# Remove database (keeps markdown files)
rm aicodepath-docs/aicodepath.db*

# Reinitialize
./scripts/init-knowledge-base.sh
```

### Check Integrity
```bash
sqlite3 aicodepath-docs/aicodepath.db "PRAGMA integrity_check;"
```

---

## 9. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "no such table" | Schema not applied | Run `./scripts/init-knowledge-base.sh` |
| "database is locked" | Concurrent write access | Check for other processes |
| FTS5 not working | SQLite version too old | Upgrade to SQLite 3.9+ |
| Slow queries | Missing indexes | Run `ANALYZE` or check query plan |

### Debug Queries
```bash
# Check table structure
sqlite3 aicodepath-docs/aicodepath.db ".schema artifacts"

# Explain query plan
sqlite3 aicodepath-docs/aicodepath.db "EXPLAIN QUERY PLAN SELECT * FROM artifacts WHERE phase = 'inception';"

# Count records per table
sqlite3 aicodepath-docs/aicodepath.db "
  SELECT 'artifacts', COUNT(*) FROM artifacts
  UNION ALL SELECT 'links', COUNT(*) FROM links
  UNION ALL SELECT 'decisions', COUNT(*) FROM decisions;
"
```

---

## 10. Best Practices

### DO
- Initialize database at project start
- Record decisions with full rationale
- Create traceability links between artifacts
- Log session activities for continuity
- Back up before major operations
- Use full-text search for discovery

### DON'T
- Store sensitive data (credentials, keys)
- Modify database schema manually
- Delete artifacts (archive instead)
- Skip traceability links
- Ignore validation results
