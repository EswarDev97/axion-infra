# Event Publisher for AICodePath

**Location**: `.aicodepath/lib/event-publisher.js`

## Overview

The Event Publisher library manages the `websocket_events` table to provide real-time updates for dashboard consumption. It uses a polling-based approach where the dashboard periodically queries for new events.

This library is designed to work alongside the AICodePath workflow system to publish events whenever significant state changes occur (workflow updates, artifacts created, validations completed, etc.).

## Architecture

```
┌─────────────────────┐
│  AICodePath Agents  │
│   & Workflows       │
└──────────┬──────────┘
           │
           │ publishEvent()
           ▼
┌─────────────────────┐
│  Event Publisher    │
│  (this library)     │
└──────────┬──────────┘
           │
           │ INSERT INTO websocket_events
           ▼
┌─────────────────────┐        ┌──────────────────┐
│  SQLite Database    │◄───────┤  Dashboard UI    │
│  (WAL mode)         │  poll  │  (subscribeToEvents)
└─────────────────────┘        └──────────────────┘
```

## Features

- **Event Publishing**: Publish typed events to SQLite database
- **Polling Support**: Dashboard can poll for new events using `subscribeToEvents()`
- **Session Grouping**: All events tagged with session ID for multi-agent scenarios
- **Channel-Based**: Events routed to appropriate channels (logs, status, progress, artifacts)
- **Cleanup**: Automatic cleanup of old events to prevent database bloat
- **Statistics**: Track event counts and patterns for analytics

## Database Schema

The library uses the `websocket_events` table:

```sql
CREATE TABLE IF NOT EXISTS websocket_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,        -- 'agent:logs', 'agent:status', 'agent:progress', 'agent:artifact'
    event_type TEXT NOT NULL,     -- 'log', 'status_change', 'progress_update', 'artifact_created'
    data JSON NOT NULL,           -- Event payload (structured JSON)
    session_id TEXT,              -- Optional session grouping for multi-agent scenarios
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Event Types

| Event Type | Channel | Use Case |
|------------|---------|----------|
| `workflow_updated` | `agent:status` | Workflow phase/stage changes |
| `artifact_created` | `agent:artifact` | New artifacts (designs, code, docs) |
| `validation_completed` | `agent:progress` | Validation results |
| `decision_logged` | `agent:logs` | Architectural decisions |
| `code_indexed` | `agent:progress` | Code indexing progress |

## Usage

### Programmatic Usage

#### Basic Event Publishing

```javascript
const EventPublisher = require('./.aicodepath/lib/event-publisher');

const publisher = new EventPublisher();

// Publish workflow update
publisher.publishEvent(
  'workflow_updated',
  'stage',
  'inception',
  {
    status: 'completed',
    phase: 'inception',
    progress: 100
  }
);

// Publish artifact creation
publisher.publishEvent(
  'artifact_created',
  'artifact',
  42,
  {
    title: 'User Stories',
    path: 'aicodepath-docs/inception/user-stories/stories.md',
    artifactType: 'story'
  }
);

// Publish validation result
publisher.publishEvent(
  'validation_completed',
  'validation',
  'security-check',
  {
    score: 95,
    status: 'PASS',
    violations: []
  }
);

// Always close when done
publisher.close();
```

#### Dashboard Polling

The dashboard uses `subscribeToEvents()` to poll for new events:

```javascript
const EventPublisher = require('./.aicodepath/lib/event-publisher');

const publisher = new EventPublisher();

// Initial load (get all events)
let lastEventId = 0;
const initialEvents = publisher.subscribeToEvents(lastEventId, 100);

if (initialEvents.length > 0) {
  lastEventId = initialEvents[initialEvents.length - 1].id;
  console.log(`Loaded ${initialEvents.length} events`);
}

// Poll for new events every 2 seconds
setInterval(() => {
  const newEvents = publisher.subscribeToEvents(lastEventId, 100);

  if (newEvents.length > 0) {
    // Update UI with new events
    newEvents.forEach(event => {
      console.log(`New event: ${event.eventType} - ${event.data.entityType}/${event.data.entityId}`);
    });

    // Update lastEventId
    lastEventId = newEvents[newEvents.length - 1].id;
  }
}, 2000);
```

#### Session Management

```javascript
const publisher = new EventPublisher();

// Auto-generated session ID
console.log(`Session ID: ${publisher.sessionId}`);
// Example: 20260202-143022-A3F9

// Custom session ID
publisher.setSessionId('custom-session-123');

// All subsequent events use this session ID
publisher.publishEvent('workflow_updated', 'phase', 'construction', {});

// Query events by session
const sessionEvents = publisher.getEventsBySession('custom-session-123');
console.log(`Found ${sessionEvents.length} events for this session`);
```

#### Query Events

```javascript
const publisher = new EventPublisher();

// Get recent events (any type)
const recent = publisher.getRecentEvents(20);

// Get events by type
const workflowEvents = publisher.getEventsByType('workflow_updated', 50);

// Get events by channel
const statusEvents = publisher.getEventsByChannel('agent:status', 30);

// Get statistics
const stats = publisher.getStatistics();
console.log(`Total events: ${stats.total}`);
console.log(`Events in last 24h: ${stats.last24h}`);
console.log('Events by type:', stats.byType);
```

#### Cleanup

```javascript
const publisher = new EventPublisher();

// Delete events older than 7 days
const deleted = publisher.clearOldEvents(7);
console.log(`Deleted ${deleted} old events`);

// Clear all events (use with caution!)
const allDeleted = publisher.clearAllEvents();
console.log(`Deleted ${allDeleted} events`);
```

### CLI Usage

The library provides a CLI interface for testing and manual operations:

```bash
# Make executable
chmod +x .aicodepath/lib/event-publisher.js

# Publish events
node .aicodepath/lib/event-publisher.js publish workflow_updated stage inception '{"status":"completed"}'
node .aicodepath/lib/event-publisher.js publish artifact_created artifact 42 '{"title":"Design Doc"}'

# List recent events
node .aicodepath/lib/event-publisher.js list
node .aicodepath/lib/event-publisher.js list workflow_updated 10

# Poll for new events (dashboard simulation)
node .aicodepath/lib/event-publisher.js subscribe 0 100
node .aicodepath/lib/event-publisher.js subscribe 1234

# Query by session
node .aicodepath/lib/event-publisher.js session 20260202-143022-A3F9

# Query by channel
node .aicodepath/lib/event-publisher.js channel agent:status

# View statistics
node .aicodepath/lib/event-publisher.js stats

# Cleanup old events
node .aicodepath/lib/event-publisher.js cleanup 7
```

## Integration with AICodePath Workflow

### KB Writer Integration

Extend `kb-writer.js` to publish events when workflow state changes:

```javascript
// In kb-writer.js
const EventPublisher = require('./event-publisher');

class KBWriter {
  constructor(projectPath = null) {
    // ... existing code ...
    this.eventPublisher = new EventPublisher(projectPath);
  }

  updateStageStatus(phase, stage, status) {
    // Update database
    const result = this.db.prepare(`...`).run(status, status, status, phase, stage);

    // Publish event
    this.eventPublisher.publishEvent('workflow_updated', 'stage', stage, {
      phase,
      status,
      updatedAt: new Date().toISOString()
    });

    return result;
  }

  close() {
    this.db.close();
    this.eventPublisher.close();
  }
}
```

### Hook Integration

Use in pre-commit or post-commit hooks:

```javascript
#!/usr/bin/env node
// In hooks/post-commit.js

const EventPublisher = require('../lib/event-publisher');

const publisher = new EventPublisher();

// Publish commit event
publisher.publishEvent('code_indexed', 'commit', process.env.COMMIT_SHA || 'HEAD', {
  message: 'Code committed and indexed',
  timestamp: new Date().toISOString()
});

publisher.close();
```

### Artifact Creation

Publish events when artifacts are created:

```javascript
const EventPublisher = require('./.aicodepath/lib/event-publisher');
const fs = require('fs');

function createArtifact(artifactPath, content) {
  // Write artifact
  fs.writeFileSync(artifactPath, content);

  // Publish event
  const publisher = new EventPublisher();
  publisher.publishEvent('artifact_created', 'artifact', artifactPath, {
    path: artifactPath,
    size: content.length,
    createdAt: new Date().toISOString()
  });
  publisher.close();
}
```

## Event Data Structure

All events have this structure:

```javascript
{
  id: 1234,                    // Auto-incremented event ID
  channel: 'agent:status',     // Channel for routing
  eventType: 'workflow_updated', // Event type
  data: {                      // Event payload
    entityType: 'stage',
    entityId: 'inception',
    timestamp: '2026-02-02T14:30:22.123Z',
    sessionId: '20260202-143022-A3F9',
    // ... custom payload fields ...
    status: 'completed',
    phase: 'inception'
  },
  sessionId: '20260202-143022-A3F9',
  createdAt: '2026-02-02 14:30:22'
}
```

## Best Practices

### 1. Always Close Connections

```javascript
const publisher = new EventPublisher();
try {
  publisher.publishEvent(...);
} finally {
  publisher.close();
}
```

### 2. Use Meaningful Entity Types

```javascript
// Good
publisher.publishEvent('workflow_updated', 'stage', 'requirements-analysis', {...});

// Bad
publisher.publishEvent('workflow_updated', 'thing', 'xyz', {...});
```

### 3. Include Relevant Context in Payload

```javascript
// Good - includes context
publisher.publishEvent('validation_completed', 'validation', 'security-check', {
  score: 95,
  status: 'PASS',
  violations: [],
  file: 'src/auth.js',
  rules: ['security-rules.json']
});

// Bad - minimal context
publisher.publishEvent('validation_completed', 'validation', 'security-check', {});
```

### 4. Clean Up Regularly

Set up a cron job or periodic task to clean old events:

```bash
# Daily cleanup (keep last 7 days)
0 2 * * * cd /project && node .aicodepath/lib/event-publisher.js cleanup 7
```

### 5. Monitor Event Growth

```javascript
const stats = publisher.getStatistics();

if (stats.total > 100000) {
  console.warn('Event table growing large, consider aggressive cleanup');
  publisher.clearOldEvents(3); // Keep only 3 days
}
```

## Dashboard Integration Example

```javascript
// dashboard/server.js
const express = require('express');
const EventPublisher = require('../.aicodepath/lib/event-publisher');

const app = express();
const publisher = new EventPublisher();

// SSE endpoint for real-time updates
app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let lastEventId = 0;

  // Poll every 1 second
  const interval = setInterval(() => {
    const newEvents = publisher.subscribeToEvents(lastEventId, 100);

    if (newEvents.length > 0) {
      newEvents.forEach(event => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      });

      lastEventId = newEvents[newEvents.length - 1].id;
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// REST endpoint for historical events
app.get('/api/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const events = publisher.getRecentEvents(limit);
  res.json(events);
});

// Statistics endpoint
app.get('/api/events/stats', (req, res) => {
  const stats = publisher.getStatistics();
  res.json(stats);
});

app.listen(3000, () => {
  console.log('Dashboard server running on port 3000');
});
```

## Troubleshooting

### Database Locked Errors

If you encounter "database is locked" errors:

1. Ensure WAL mode is enabled (it is by default)
2. Close connections properly with `publisher.close()`
3. Check for long-running transactions

```javascript
// Check if WAL mode is enabled
const pragma = publisher.db.pragma('journal_mode');
console.log('Journal mode:', pragma); // Should be 'wal'
```

### Missing Events

If events are not appearing:

1. Check event type is valid
2. Verify database path is correct
3. Ensure publisher is not closed before events are written

```javascript
// Verify database path
console.log('Database path:', publisher.db.name);

// Check if database is open
try {
  publisher.db.prepare('SELECT 1').get();
  console.log('Database is open');
} catch (err) {
  console.error('Database is closed or inaccessible');
}
```

### Performance Issues

If polling is slow:

1. Reduce polling frequency
2. Add indexes (already present in schema)
3. Implement aggressive cleanup

```javascript
// Check index usage
const explain = publisher.db.prepare(`
  EXPLAIN QUERY PLAN
  SELECT * FROM websocket_events WHERE id > ? LIMIT 100
`).all(0);

console.log('Query plan:', explain);
```

## API Reference

### Constructor

```javascript
new EventPublisher(projectPath = null)
```

Creates a new Event Publisher instance. Automatically finds the database using `path-resolver.js`.

### Methods

#### `publishEvent(eventType, entityType, entityId, payload = {})`

Publish a new event to the database.

**Parameters:**
- `eventType` (string): One of the valid event types
- `entityType` (string): Type of entity (stage, artifact, validation, etc.)
- `entityId` (string|number): Entity identifier
- `payload` (object): Additional event data

**Returns:** Object with event details

#### `getRecentEvents(limit = 50)`

Get most recent events across all types.

**Parameters:**
- `limit` (number): Maximum number of events to return

**Returns:** Array of event objects

#### `getEventsByType(eventType, limit = 50)`

Get events filtered by type.

**Parameters:**
- `eventType` (string): Event type to filter by
- `limit` (number): Maximum number of events to return

**Returns:** Array of event objects

#### `getEventsBySession(sessionId, limit = 100)`

Get all events for a specific session.

**Parameters:**
- `sessionId` (string): Session ID to filter by
- `limit` (number): Maximum number of events to return

**Returns:** Array of event objects

#### `getEventsByChannel(channel, limit = 50)`

Get events filtered by channel.

**Parameters:**
- `channel` (string): Channel name (agent:logs, agent:status, agent:progress, agent:artifact)
- `limit` (number): Maximum number of events to return

**Returns:** Array of event objects

#### `subscribeToEvents(lastEventId = 0, limit = 100)`

Poll for new events since lastEventId (dashboard use case).

**Parameters:**
- `lastEventId` (number): Last event ID received (0 for initial load)
- `limit` (number): Maximum number of events to return

**Returns:** Array of new event objects

#### `clearOldEvents(daysOld = 7)`

Delete events older than specified days.

**Parameters:**
- `daysOld` (number): Delete events older than this many days

**Returns:** Number of events deleted

#### `getStatistics()`

Get event statistics and analytics.

**Returns:** Object with statistics (total, byType, byChannel, recentSessions, last24h)

#### `setSessionId(sessionId)`

Set custom session ID for all subsequent events.

**Parameters:**
- `sessionId` (string): Custom session identifier

#### `close()`

Close the database connection. Always call this when done.

## Related Files

- `.aicodepath/db/schema.sql` - Database schema definition
- `.aicodepath/lib/kb-writer.js` - Knowledge base writer (similar pattern)
- `.aicodepath/lib/path-resolver.js` - Path resolution utilities

## License

Part of the AICodePath project. See main project LICENSE for details.
