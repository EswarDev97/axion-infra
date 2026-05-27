# Knowledge Base Writer (kb-writer.js)

Utility library for writing workflow state to the AICodePath knowledge base.

## Purpose

The `kb-writer` library populates the `workflow_state` table in the AICodePath database, which enables:
- **Dashboard Kanban Board**: Visual task management
- **Workflow Progress Tracking**: Monitor phase/stage completion
- **Session State Management**: Track current workflow position

## The Problem It Solves

**Issue**: The `workflow_state` table schema exists, but no code writes to it. The workflow executes via Claude following rules, but doesn't persist state to the database.

**Result**: Empty dashboard Kanban board despite workflow being active.

**Solution**: `kb-writer` provides APIs to initialize and update workflow state.

---

## Installation

The library is automatically included when you install AICodePath.

### Dependencies

- `better-sqlite3` - Already in package.json
- `path-resolver.js` - Already in lib/

---

## CLI Usage

### Initialize Workflow Stages

Create pending stages for a phase:

```bash
# Initialize inception phase (7 stages)
node .aicodepath/lib/kb-writer.js init inception

# Initialize pre-flight phase (4 stages)
node .aicodepath/lib/kb-writer.js init pre-flight

# Initialize construction phase (12 stages)
node .aicodepath/lib/kb-writer.js init construction

# Initialize operations phase (3 stages)
node .aicodepath/lib/kb-writer.js init operations
```

**Output**:
```
✓ Initialized 7 stages for inception phase
```

### Update Stage Status

Update a specific stage's status:

```bash
# Mark stage as in progress
node .aicodepath/lib/kb-writer.js update inception "Workspace Detection" in_progress

# Mark stage as completed
node .aicodepath/lib/kb-writer.js update inception "Workspace Detection" completed

# Mark stage as skipped
node .aicodepath/lib/kb-writer.js update construction "Kubernetes Design" skipped

# Mark stage as blocked
node .aicodepath/lib/kb-writer.js update construction "Database Design" blocked
```

**Valid Statuses**:
- `pending` - Not started
- `in_progress` - Currently working on
- `completed` - Finished successfully
- `skipped` - Intentionally skipped
- `blocked` - Cannot proceed (waiting on dependency)

### View Workflow State

Display current workflow state:

```bash
node .aicodepath/lib/kb-writer.js show
```

**Output** (JSON):
```json
[
  {
    "phase": "inception",
    "stage": "Workspace Detection",
    "status": "in_progress",
    "started_at": "2026-02-01 23:45:00",
    "completed_at": null
  },
  {
    "phase": "inception",
    "stage": "Requirements Analysis",
    "status": "pending",
    "started_at": null,
    "completed_at": null
  }
]
```

### Clear Workflow State

Reset all workflow state (use with caution):

```bash
node .aicodepath/lib/kb-writer.js clear
```

---

## Programmatic Usage

### Import the Library

```javascript
const KBWriter = require('./.aicodepath/lib/kb-writer');

const writer = new KBWriter();
```

### Initialize Stages

```javascript
// Initialize inception phase
const count = writer.initializePhaseStages('inception');
console.log(`Initialized ${count} stages`);

// Initialize with CR number
writer.initializePhaseStages('construction', 'CR-001');
```

### Update Stage Status

```javascript
// Mark stage as in progress
writer.updateStageStatus('inception', 'Workspace Detection', 'in_progress');

// Mark stage as completed
writer.updateStageStatus('inception', 'Requirements Analysis', 'completed');
```

### Get Workflow State

```javascript
const state = writer.getWorkflowState();
console.log(state);
```

### Session State Management

```javascript
// Update session state
writer.updateSessionState('current_phase', 'inception');
writer.updateSessionState('workflow_started', true);

// Get session state
const phase = writer.getSessionState('current_phase');
console.log(phase); // "inception"
```

### Close Connection

```javascript
writer.close();
```

---

## Predefined Stages

### Pre-Flight Phase (4 stages)
1. Knowledge Base Check
2. Plugin Validation
3. MCP Server Check
4. Environment Validation

### Inception Phase (7 stages)
1. Workspace Detection
2. Reverse Engineering
3. Requirements Analysis
4. User Stories
5. Application Design
6. Units Generation
7. Workflow Planning

### Construction Phase (12 stages)
1. Functional Design
2. NFR Design
3. Database Design
4. Storage Design
5. Caching Design
6. Auth Design
7. API Gateway Design
8. Docker Design
9. Kubernetes Design
10. CI/CD Design
11. Code Generation
12. Build and Test

### Operations Phase (3 stages)
1. Deployment
2. Sprint Tracking
3. Monitoring Setup

---

## Integration Examples

### Session Start Hook

Auto-initialize workflow on session start:

```javascript
// .aicodepath/hooks/session-start-hook.js
const KBWriter = require('../lib/kb-writer');

async function hook(context) {
  const writer = new KBWriter();

  // Check if workflow_state is empty
  const state = writer.getWorkflowState();

  if (state.length === 0) {
    // Initialize inception phase by default
    writer.initializePhaseStages('inception');
  }

  writer.close();

  // ... rest of hook logic
}
```

### Core Workflow Integration

Update stage status as workflow progresses:

```javascript
// In core-workflow.md execution
const writer = new KBWriter();

// When starting workspace detection
writer.updateStageStatus('inception', 'Workspace Detection', 'in_progress');

// When workspace detection completes
writer.updateStageStatus('inception', 'Workspace Detection', 'completed');

// When starting requirements analysis
writer.updateStageStatus('inception', 'Requirements Analysis', 'in_progress');

writer.close();
```

---

## Troubleshooting

### Database Not Found

**Error**: `Error: unable to open database file`

**Solution**: Ensure knowledge base is initialized:
```bash
./scripts/init-knowledge-base.sh
```

### Permission Denied

**Error**: `SQLITE_READONLY: attempt to write a readonly database`

**Solution**: Check file permissions:
```bash
chmod 664 aicodepath-docs/aicodepath.db
```

### Stages Not Showing in Dashboard

1. **Verify data exists**:
   ```bash
   node .aicodepath/lib/kb-writer.js show
   ```

2. **Check dashboard API**:
   ```bash
   curl http://localhost:3001/api/workflow-state
   ```

3. **Restart dashboard**:
   ```bash
   cd .aicodepath/dashboard
   ./start.sh
   ```

---

## Workflow State Schema

The `workflow_state` table:

```sql
CREATE TABLE workflow_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cr_number TEXT,
    phase TEXT NOT NULL,
    stage TEXT NOT NULL,
    unit TEXT,
    status TEXT DEFAULT 'pending',
    started_at TEXT,
    completed_at TEXT,
    steps_total INTEGER DEFAULT 0,
    steps_completed INTEGER DEFAULT 0,
    artifacts_created JSON,
    notes TEXT,
    blockers JSON
);
```

---

## Future Enhancements

1. **Automatic Integration**: Session-start hook auto-initializes workflow_state
2. **Rule-Based Updates**: Core-workflow.md includes kb-writer calls
3. **WebSocket Events**: Real-time dashboard updates
4. **Stage Dependencies**: Track blockers and dependencies
5. **Progress Percentage**: Calculate completion percentage per phase

---

## See Also

- [kb-query.js](./kb-query-README.md) - Read operations for knowledge base
- [Dashboard Guide](../dashboard/README.md) - Dashboard setup and usage
- [Core Workflow](../rules/core-workflow.md) - Workflow phases and stages
- [Database Schema](../db/schema.sql) - Complete database schema

---

*Last Updated: 2026-02-01*
*Version: 1.0.0*
