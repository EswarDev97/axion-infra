# Session State Manager

Enhanced session state management for AICodePath with metadata tracking, session archiving, and history management.

## Overview

The Session State Manager extends the basic `kb-writer.js` session state functions to provide a comprehensive session lifecycle management system. It enables:

- **State Persistence**: Store workflow state with optional metadata
- **Session Archiving**: Create snapshots of current session state
- **Session Restoration**: Restore previous sessions with automatic backup
- **History Tracking**: Maintain audit trail of all session operations
- **Predefined Keys**: Standard workflow state keys for consistency

## Installation

```bash
# Ensure better-sqlite3 is installed
npm install better-sqlite3

# Make executable (optional, for CLI usage)
chmod +x .aicodepath/lib/session-state-manager.js
```

## Quick Start

### CLI Usage

```bash
# Set state
node .aicodepath/lib/session-state-manager.js set current_phase inception

# Get state
node .aicodepath/lib/session-state-manager.js get current_phase

# List all state
node .aicodepath/lib/session-state-manager.js list

# Archive session
node .aicodepath/lib/session-state-manager.js archive checkpoint-1

# Restore session
node .aicodepath/lib/session-state-manager.js restore checkpoint-1
```

### Programmatic Usage

```javascript
const SessionStateManager = require('./.aicodepath/lib/session-state-manager');
const { PREDEFINED_KEYS } = SessionStateManager;

const manager = new SessionStateManager();

// Set state
manager.setState(PREDEFINED_KEYS.CURRENT_PHASE, 'construction');

// Get state
const phase = manager.getState(PREDEFINED_KEYS.CURRENT_PHASE);

// Archive session
manager.archiveSession('design-complete');

// Always close when done
manager.close();
```

## API Reference

### Class: SessionStateManager

#### Constructor

```javascript
new SessionStateManager(projectPath = null)
```

**Parameters:**
- `projectPath` (string|null): Optional project path. Auto-detected using `path-resolver.js` if null.

**Example:**
```javascript
const manager = new SessionStateManager();
// or with explicit path
const manager = new SessionStateManager('/path/to/project');
```

---

#### setState(key, value, metadata = null)

Set session state with optional metadata.

**Parameters:**
- `key` (string): State key
- `value` (any): State value (will be JSON serialized)
- `metadata` (Object|null): Optional metadata object

**Returns:**
```javascript
{
  success: true,
  key: "current_phase",
  value: "inception",
  metadata: { priority: "high" },
  changes: 1
}
```

**Examples:**
```javascript
// Simple state
manager.setState('current_phase', 'inception');

// State with metadata
manager.setState('current_unit', 'auth-service', {
  priority: 'high',
  started_at: new Date().toISOString()
});

// Complex value
manager.setState('validation_results', {
  passed: 15,
  failed: 2,
  warnings: 5
});
```

---

#### getState(key)

Get session state value.

**Parameters:**
- `key` (string): State key

**Returns:**
- State value (parsed from JSON) or `null` if not found

**Example:**
```javascript
const phase = manager.getState('current_phase');
// Returns: "inception"

const results = manager.getState('validation_results');
// Returns: { passed: 15, failed: 2, warnings: 5 }
```

---

#### getStateWithMetadata(key)

Get session state with metadata.

**Parameters:**
- `key` (string): State key

**Returns:**
```javascript
{
  key: "current_unit",
  value: "auth-service",
  metadata: { priority: "high", started_at: "2026-02-02T12:00:00Z" },
  updated_at: "2026-02-02 12:00:00"
}
```

**Example:**
```javascript
const stateData = manager.getStateWithMetadata('current_unit');
console.log(stateData.value);      // "auth-service"
console.log(stateData.metadata);   // { priority: "high", ... }
console.log(stateData.updated_at); // "2026-02-02 12:00:00"
```

---

#### getAllState()

Get all session state.

**Returns:** Array of all state entries with metadata

**Example:**
```javascript
const allState = manager.getAllState();
// Returns:
[
  {
    key: "current_phase",
    value: "inception",
    metadata: null,
    updated_at: "2026-02-02 12:00:00"
  },
  {
    key: "current_unit",
    value: "auth-service",
    metadata: { priority: "high" },
    updated_at: "2026-02-02 12:05:00"
  }
]
```

---

#### deleteState(key)

Delete session state key.

**Parameters:**
- `key` (string): State key to delete

**Returns:**
```javascript
{
  success: true,
  key: "current_unit",
  deleted: true
}
```

**Example:**
```javascript
const result = manager.deleteState('old_key');
if (result.deleted) {
  console.log('Key deleted successfully');
}
```

---

#### archiveSession(sessionId = null)

Archive current session to history.

Creates a complete snapshot of current session state and stores it in `session_history` table.
Auto-generates session ID if not provided.

**Parameters:**
- `sessionId` (string|null): Optional session ID. Auto-generated as `session-{timestamp}` if null.

**Returns:**
```javascript
{
  success: true,
  session_id: "checkpoint-1",
  phase: "inception",
  stage: "Requirements Analysis",
  unit: "auth-service",
  state_count: 8,
  archived_at: "2026-02-02T12:00:00.000Z"
}
```

**Examples:**
```javascript
// Auto-generated session ID
const result = manager.archiveSession();
console.log(result.session_id); // "session-1738502400000"

// Custom session ID
manager.archiveSession('design-complete');
manager.archiveSession('before-refactor');
manager.archiveSession('v1.0-baseline');
```

**Use Cases:**
- Before major refactoring
- At workflow checkpoints
- Before switching phases/units
- Daily/periodic backups
- Before risky operations

---

#### restoreSession(sessionId)

Restore session from history.

**Important:** Current session is automatically archived as a backup before restoration.

**Parameters:**
- `sessionId` (string): Session ID to restore

**Returns:**
```javascript
{
  success: true,
  session_id: "checkpoint-1",
  phase: "inception",
  stage: "Requirements Analysis",
  unit: "auth-service",
  restored_count: 8,
  backup_session: "backup-before-restore-1738502500000"
}
```

**Error Response:**
```javascript
{
  success: false,
  error: "Session 'invalid-id' not found in history",
  session_id: "invalid-id"
}
```

**Example:**
```javascript
// Restore previous session
const result = manager.restoreSession('checkpoint-1');

if (result.success) {
  console.log(`Restored ${result.restored_count} state entries`);
  console.log(`Backup saved as: ${result.backup_session}`);
} else {
  console.error(result.error);
}
```

**Workflow:**
1. Validates session exists in history
2. Archives current state as backup
3. Clears current state
4. Restores archived state
5. Records restoration event in history

---

#### getSessionHistory(limit = 20)

Get session history.

**Parameters:**
- `limit` (number): Maximum entries to return (default: 20)

**Returns:** Array of session history entries

**Example:**
```javascript
const history = manager.getSessionHistory(10);
// Returns:
[
  {
    id: 5,
    session_id: "checkpoint-1",
    phase: "inception",
    stage: "Requirements Analysis",
    unit: "auth-service",
    action: "archive",
    details: {
      state_snapshot: [...],
      archived_at: "2026-02-02T12:00:00.000Z",
      state_count: 8
    },
    timestamp: "2026-02-02 12:00:00"
  }
]
```

---

#### getSessionById(sessionId)

Get all history entries for a specific session.

**Parameters:**
- `sessionId` (string): Session ID to query

**Returns:** Array of history entries for the session

**Example:**
```javascript
const sessions = manager.getSessionById('checkpoint-1');
// Returns all archive/restore events for this session
```

---

#### deleteSessionHistory(sessionId)

Delete session history entries.

**Parameters:**
- `sessionId` (string): Session ID to delete

**Returns:**
```javascript
{
  success: true,
  session_id: "old-session",
  deleted_count: 3
}
```

**Example:**
```javascript
// Clean up old sessions
manager.deleteSessionHistory('old-session');
```

---

#### close()

Close database connection.

**Important:** Always call `close()` when done to release database resources.

**Example:**
```javascript
try {
  const manager = new SessionStateManager();
  manager.setState('key', 'value');
} finally {
  manager.close();
}
```

---

### Predefined Keys

Standard workflow state keys for consistency across AICodePath:

```javascript
const { PREDEFINED_KEYS } = require('./session-state-manager');

PREDEFINED_KEYS = {
  CURRENT_PHASE: 'current_phase',           // Current workflow phase
  CURRENT_STAGE: 'current_stage',           // Current workflow stage
  CURRENT_UNIT: 'current_unit',             // Current unit being processed
  WORKFLOW_STARTED: 'workflow_started',     // Workflow start flag
  SCHEMA_VERSION: 'schema_version',         // Database schema version
  LAST_VALIDATION: 'last_validation',       // Last validation timestamp
  CONTEXT_USAGE: 'context_usage',           // Context usage tracking
  LAST_ACTIVITY: 'last_activity'            // Last activity timestamp
}
```

**Usage:**
```javascript
const { PREDEFINED_KEYS } = SessionStateManager;

manager.setState(PREDEFINED_KEYS.CURRENT_PHASE, 'construction');
manager.setState(PREDEFINED_KEYS.CURRENT_UNIT, 'api-gateway');
manager.setState(PREDEFINED_KEYS.LAST_VALIDATION, new Date().toISOString());
```

## CLI Commands

### State Management

#### set

Set session state.

```bash
# Simple value
session-state-manager.js set current_phase inception

# JSON value
session-state-manager.js set validation_results '{"passed":15,"failed":2}'

# With metadata
session-state-manager.js set current_unit auth-service --metadata '{"priority":"high"}'
```

#### get

Get session state value.

```bash
session-state-manager.js get current_phase
```

**Output:**
```json
{
  "key": "current_phase",
  "value": "inception",
  "metadata": null,
  "updated_at": "2026-02-02 12:00:00"
}
```

#### list

List all session state.

```bash
session-state-manager.js list
```

**Output:**
```json
[
  {
    "key": "current_phase",
    "value": "inception",
    "metadata": null,
    "updated_at": "2026-02-02 12:00:00"
  },
  {
    "key": "current_unit",
    "value": "auth-service",
    "metadata": { "priority": "high" },
    "updated_at": "2026-02-02 12:05:00"
  }
]
```

#### delete

Delete session state key.

```bash
session-state-manager.js delete old_key
```

### Session Management

#### archive

Archive current session.

```bash
# Auto-generated session ID
session-state-manager.js archive

# Custom session ID
session-state-manager.js archive checkpoint-1
```

**Output:**
```
✓ Session archived: checkpoint-1
  Phase: inception
  Stage: Requirements Analysis
  Unit: auth-service
  State count: 8
  Archived at: 2026-02-02T12:00:00.000Z
```

#### restore

Restore session from history.

```bash
session-state-manager.js restore checkpoint-1
```

**Output:**
```
✓ Session restored: checkpoint-1
  Phase: inception
  Stage: Requirements Analysis
  Unit: auth-service
  Restored count: 8
  Backup session: backup-before-restore-1738502500000
```

#### history

Show session history.

```bash
# Last 20 sessions (default)
session-state-manager.js history

# Custom limit
session-state-manager.js history 50
```

#### show

Show specific session details.

```bash
session-state-manager.js show checkpoint-1
```

### Utilities

#### keys

Show predefined session state keys.

```bash
session-state-manager.js keys
```

**Output:**
```json
{
  "CURRENT_PHASE": "current_phase",
  "CURRENT_STAGE": "current_stage",
  "CURRENT_UNIT": "current_unit",
  "WORKFLOW_STARTED": "workflow_started",
  "SCHEMA_VERSION": "schema_version",
  "LAST_VALIDATION": "last_validation",
  "CONTEXT_USAGE": "context_usage",
  "LAST_ACTIVITY": "last_activity"
}
```

## Use Cases

### 1. Workflow Checkpoints

```javascript
const manager = new SessionStateManager();

// Start inception phase
manager.setState(PREDEFINED_KEYS.CURRENT_PHASE, 'inception');
manager.setState(PREDEFINED_KEYS.CURRENT_STAGE, 'Requirements Analysis');

// Archive at milestone
manager.archiveSession('requirements-complete');

// Continue to next stage
manager.setState(PREDEFINED_KEYS.CURRENT_STAGE, 'Application Design');
manager.archiveSession('design-complete');

manager.close();
```

### 2. Unit Tracking with Metadata

```javascript
const manager = new SessionStateManager();

// Start working on a unit
manager.setState(PREDEFINED_KEYS.CURRENT_UNIT, 'auth-service', {
  priority: 'high',
  started_at: new Date().toISOString(),
  dependencies: ['user-service', 'token-service']
});

// Track progress
const unitData = manager.getStateWithMetadata(PREDEFINED_KEYS.CURRENT_UNIT);
console.log(`Working on: ${unitData.value}`);
console.log(`Priority: ${unitData.metadata.priority}`);

manager.close();
```

### 3. Session Restoration After Error

```javascript
const manager = new SessionStateManager();

try {
  // Archive before risky operation
  manager.archiveSession('before-complex-refactor');

  // Perform risky operation
  performComplexRefactor();

} catch (error) {
  // Restore if error occurs
  console.error('Refactor failed, restoring previous state');
  manager.restoreSession('before-complex-refactor');
}

manager.close();
```

### 4. Context Usage Tracking

```javascript
const manager = new SessionStateManager();

// Track context usage
manager.setState(PREDEFINED_KEYS.CONTEXT_USAGE, {
  tokens_used: 15000,
  model: 'claude-sonnet-4-5',
  threshold_status: 'safe',
  last_check: new Date().toISOString()
});

// Check later
const usage = manager.getState(PREDEFINED_KEYS.CONTEXT_USAGE);
if (usage.tokens_used > 100000) {
  console.warn('High context usage detected');
}

manager.close();
```

### 5. Validation State Persistence

```javascript
const manager = new SessionStateManager();

// Store validation results
manager.setState(PREDEFINED_KEYS.LAST_VALIDATION, {
  timestamp: new Date().toISOString(),
  score: 95,
  status: 'PASS',
  violations_count: 2,
  file_path: 'src/auth/auth.service.ts'
}, {
  validator: 'guideline-validator',
  guidelines_version: '2.0'
});

manager.close();
```

### 6. Daily Archiving Script

```bash
#!/bin/bash
# daily-archive.sh - Archive session at end of day

SESSION_ID="daily-$(date +%Y-%m-%d)"
node .aicodepath/lib/session-state-manager.js archive "$SESSION_ID"

echo "Session archived as: $SESSION_ID"
```

### 7. History Cleanup

```javascript
const manager = new SessionStateManager();

// Get all history
const history = manager.getSessionHistory(1000);

// Delete sessions older than 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

history.forEach(session => {
  const sessionDate = new Date(session.timestamp);
  if (sessionDate < thirtyDaysAgo) {
    console.log(`Deleting old session: ${session.session_id}`);
    manager.deleteSessionHistory(session.session_id);
  }
});

manager.close();
```

## Integration with AICodePath Workflow

### Pre-Flight Check Integration

```javascript
// hooks/pre-flight-check.js
const SessionStateManager = require('../lib/session-state-manager');
const { PREDEFINED_KEYS } = SessionStateManager;

function recordPreFlightStart() {
  const manager = new SessionStateManager();

  manager.setState(PREDEFINED_KEYS.CURRENT_PHASE, 'pre-flight');
  manager.setState(PREDEFINED_KEYS.WORKFLOW_STARTED, true, {
    started_at: new Date().toISOString(),
    initiated_by: 'pre-flight-check'
  });

  manager.archiveSession('pre-flight-start');
  manager.close();
}
```

### Workflow Rule Integration

```javascript
// rules/inception/requirements-analysis.js
const SessionStateManager = require('../../lib/session-state-manager');
const { PREDEFINED_KEYS } = SessionStateManager;

function startRequirementsAnalysis() {
  const manager = new SessionStateManager();

  manager.setState(PREDEFINED_KEYS.CURRENT_PHASE, 'inception');
  manager.setState(PREDEFINED_KEYS.CURRENT_STAGE, 'Requirements Analysis', {
    workflow_file: 'inception/requirements-analysis.md',
    expected_artifacts: ['functional-requirements.md', 'nfr-requirements.md']
  });

  manager.archiveSession('requirements-start');
  manager.close();
}
```

### Agent Execution Integration

```javascript
// lib/agent-invoker.js
const SessionStateManager = require('./session-state-manager');
const { PREDEFINED_KEYS } = SessionStateManager;

async function invokeAgent(agentName, task) {
  const manager = new SessionStateManager();

  // Archive before agent execution
  manager.archiveSession(`before-agent-${agentName}-${Date.now()}`);

  // Track agent execution
  manager.setState('current_agent', agentName, {
    task,
    started_at: new Date().toISOString()
  });

  try {
    const result = await executeAgent(agentName, task);

    // Update state on success
    manager.setState('last_agent_result', {
      agent: agentName,
      status: 'success',
      completed_at: new Date().toISOString()
    });

    return result;
  } finally {
    manager.close();
  }
}
```

## Database Schema

The Session State Manager uses two tables from `aicodepath.db`:

### session_state Table

```sql
CREATE TABLE session_state (
    key TEXT PRIMARY KEY,
    value JSON NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);
```

**Columns:**
- `key`: State key (primary key)
- `value`: JSON-serialized value (may contain `_value` and `_metadata` structure)
- `updated_at`: Last update timestamp

### session_history Table

```sql
CREATE TABLE session_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    phase TEXT,
    stage TEXT,
    unit TEXT,
    action TEXT,
    details JSON,
    timestamp TEXT DEFAULT (datetime('now'))
);
```

**Columns:**
- `id`: Auto-increment ID
- `session_id`: Session identifier
- `phase`: Workflow phase at time of archive
- `stage`: Workflow stage at time of archive
- `unit`: Current unit at time of archive
- `action`: Action type ('archive' or 'restore')
- `details`: JSON object with state snapshot and metadata
- `timestamp`: When action occurred

**Indexes:**
```sql
CREATE INDEX idx_session_history_session ON session_history(session_id);
CREATE INDEX idx_session_history_timestamp ON session_history(timestamp);
```

## Performance Considerations

### WAL Mode

The Session State Manager enables SQLite WAL (Write-Ahead Logging) mode for:
- Better concurrency
- Improved write performance
- Reduced blocking between readers and writers

### Transaction Usage

Session restoration uses a transaction to ensure atomic updates:
```javascript
const transaction = this.db.transaction((snapshot) => {
  for (const entry of snapshot) {
    insertStmt.run(entry.key, JSON.stringify(entry.value));
  }
});
transaction(stateSnapshot);
```

### Index Optimization

Session history queries are optimized with indexes on:
- `session_id`: Fast session lookup
- `timestamp`: Chronological queries

## Error Handling

### Database Connection Errors

```javascript
try {
  const manager = new SessionStateManager('/invalid/path');
} catch (error) {
  console.error('Failed to initialize:', error.message);
  // Handle connection error
}
```

### Session Not Found

```javascript
const result = manager.restoreSession('nonexistent-session');
if (!result.success) {
  console.error(result.error);
  // "Session 'nonexistent-session' not found in history"
}
```

### Invalid Metadata JSON

```bash
# CLI will catch and report invalid JSON
session-state-manager.js set key value --metadata 'invalid-json'
# Error: Invalid metadata JSON
```

## Best Practices

### 1. Always Close Connections

```javascript
const manager = new SessionStateManager();
try {
  // ... operations
} finally {
  manager.close(); // Always close
}
```

### 2. Use Predefined Keys

```javascript
// Good
const { PREDEFINED_KEYS } = SessionStateManager;
manager.setState(PREDEFINED_KEYS.CURRENT_PHASE, 'inception');

// Avoid
manager.setState('phase', 'inception'); // Inconsistent naming
```

### 3. Archive at Meaningful Checkpoints

```javascript
// Archive at workflow milestones
manager.archiveSession('requirements-complete');
manager.archiveSession('design-approved');
manager.archiveSession('testing-passed');

// Not useful
manager.archiveSession(); // Generic auto-generated ID loses context
```

### 4. Include Context in Metadata

```javascript
manager.setState('current_unit', 'auth-service', {
  priority: 'high',
  started_at: new Date().toISOString(),
  dependencies: ['user-service'],
  assignee: 'backend-agent'
});
```

### 5. Clean Up Old Sessions Periodically

```javascript
// Delete sessions older than retention period
function cleanupOldSessions(retentionDays = 30) {
  const manager = new SessionStateManager();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const history = manager.getSessionHistory(1000);
  history.forEach(session => {
    if (new Date(session.timestamp) < cutoff) {
      manager.deleteSessionHistory(session.session_id);
    }
  });

  manager.close();
}
```

### 6. Use Descriptive Session IDs

```javascript
// Good
manager.archiveSession('v1.0-release');
manager.archiveSession('before-refactor-auth');
manager.archiveSession('checkpoint-requirements');

// Less useful
manager.archiveSession('session1');
manager.archiveSession('backup');
```

## Comparison with kb-writer.js

| Feature | kb-writer.js | session-state-manager.js |
|---------|--------------|--------------------------|
| Set state | ✓ Basic | ✓ With metadata |
| Get state | ✓ Basic | ✓ With metadata |
| List all state | ✗ | ✓ |
| Delete state | ✗ | ✓ |
| Session archiving | ✗ | ✓ |
| Session restoration | ✗ | ✓ |
| Session history | ✗ | ✓ |
| Predefined keys | ✗ | ✓ |
| CLI commands | ✗ | ✓ Full suite |
| Metadata support | ✗ | ✓ |
| Transaction safety | N/A | ✓ |

**When to use:**
- Use `kb-writer.js` for basic workflow state updates
- Use `session-state-manager.js` for comprehensive session management

## Troubleshooting

### "Could not find project root" Error

**Problem:** Session State Manager cannot locate the project root.

**Solution:**
```javascript
// Explicitly provide project path
const manager = new SessionStateManager('/path/to/project');
```

### "Database is locked" Error

**Problem:** Multiple processes accessing database simultaneously.

**Solution:**
- WAL mode reduces this, but ensure connections are closed
- Use transactions for bulk operations
- Avoid long-running connections

### Session Restoration Not Working

**Problem:** Restored state doesn't appear.

**Checklist:**
1. Verify session exists: `manager.getSessionById(sessionId)`
2. Check session action is 'archive' not 'restore'
3. Ensure backup was created successfully
4. Review session details for state_snapshot content

### Metadata Not Appearing

**Problem:** Metadata not showing in `getState()`.

**Solution:**
```javascript
// Use getStateWithMetadata() instead of getState()
const data = manager.getStateWithMetadata('key');
console.log(data.metadata); // Metadata here
```

## Contributing

When extending Session State Manager:

1. Maintain backward compatibility with existing state structure
2. Add tests for new features
3. Update this README with examples
4. Follow kb-writer.js patterns for consistency
5. Ensure WAL mode and transactions are used appropriately

## License

Part of AICodePath project. See project LICENSE.

## See Also

- [kb-writer.js](./kb-writer-README.md) - Basic workflow state management
- [kb-query.js](./kb-query-README.md) - Knowledge base queries
- [Database Schema](../db/schema.sql) - Complete database schema
- [Path Resolver](./path-resolver.js) - Project path resolution

---

**Version:** 1.0.0
**Last Updated:** 2026-02-02
**Compatibility:** AICodePath v2.0+
