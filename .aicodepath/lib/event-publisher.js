#!/usr/bin/env node
/**
 * Event Publisher for AICodePath
 * Manages websocket_events table for real-time dashboard updates
 *
 * Publishes events to the database for polling-based dashboard consumption.
 * Supports event types: workflow_updated, artifact_created, validation_completed,
 * decision_logged, code_indexed
 *
 * Usage:
 *   const EventPublisher = require('./event-publisher');
 *   const publisher = new EventPublisher();
 *   await publisher.publishEvent('workflow_updated', 'stage', 'inception', { status: 'completed' });
 */

const Database = require('better-sqlite3');
const path = require('path');
const { findProjectRoot , getDbPath } = require('./path-resolver');

// Valid event types
const EVENT_TYPES = [
  'workflow_updated',
  'artifact_created',
  'validation_completed',
  'decision_logged',
  'code_indexed'
];

// Valid channels (maps to channel column in websocket_events)
const CHANNELS = {
  workflow_updated: 'agent:status',
  artifact_created: 'agent:artifact',
  validation_completed: 'agent:progress',
  decision_logged: 'agent:logs',
  code_indexed: 'agent:progress'
};

class EventPublisher {
  /**
   * Initialize Event Publisher
   * @param {string} projectPath - Optional project path (defaults to current directory)
   */
  constructor(projectPath = null) {
    const projectRoot = projectPath || findProjectRoot(process.cwd());
    const dbPath = path.join(projectRoot, '.aicodepath', 'db', 'aicodepath.db');

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate a session ID for event grouping
   * Format: YYYYMMDD-HHMMSS-RANDOM
   */
  generateSessionId() {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${datePart}-${timePart}-${randomPart}`;
  }

  /**
   * Set session ID for all subsequent events
   * @param {string} sessionId - Custom session ID
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * Publish an event to the websocket_events table
   * @param {string} eventType - Event type (workflow_updated, artifact_created, etc.)
   * @param {string} entityType - Entity type (stage, artifact, validation, decision, code)
   * @param {string|number} entityId - Entity ID or name
   * @param {Object} payload - Event payload data
   * @returns {Object} - Inserted event with ID
   */
  publishEvent(eventType, entityType, entityId, payload = {}) {
    // Validate event type
    if (!EVENT_TYPES.includes(eventType)) {
      throw new Error(
        `Invalid event type: ${eventType}. Must be one of: ${EVENT_TYPES.join(', ')}`
      );
    }

    // Determine channel based on event type
    const channel = CHANNELS[eventType];

    // Build event data payload
    const eventData = {
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      ...payload
    };

    // Insert event
    const stmt = this.db.prepare(`
      INSERT INTO websocket_events (channel, event_type, data, session_id, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    const result = stmt.run(
      channel,
      eventType,
      JSON.stringify(eventData),
      this.sessionId
    );

    return {
      id: result.lastInsertRowid,
      channel,
      eventType,
      entityType,
      entityId,
      data: eventData,
      sessionId: this.sessionId
    };
  }

  /**
   * Get recent events (most recent first)
   * @param {number} limit - Maximum number of events to return (default: 50)
   * @returns {Array} - Array of events
   */
  getRecentEvents(limit = 50) {
    const stmt = this.db.prepare(`
      SELECT
        id,
        channel,
        event_type,
        data,
        session_id,
        created_at
      FROM websocket_events
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit);

    return rows.map(row => ({
      id: row.id,
      channel: row.channel,
      eventType: row.event_type,
      data: JSON.parse(row.data),
      sessionId: row.session_id,
      createdAt: row.created_at
    }));
  }

  /**
   * Get events by type
   * @param {string} eventType - Event type to filter by
   * @param {number} limit - Maximum number of events to return (default: 50)
   * @returns {Array} - Array of matching events
   */
  getEventsByType(eventType, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT
        id,
        channel,
        event_type,
        data,
        session_id,
        created_at
      FROM websocket_events
      WHERE event_type = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(eventType, limit);

    return rows.map(row => ({
      id: row.id,
      channel: row.channel,
      eventType: row.event_type,
      data: JSON.parse(row.data),
      sessionId: row.session_id,
      createdAt: row.created_at
    }));
  }

  /**
   * Get events by session ID
   * @param {string} sessionId - Session ID to filter by
   * @param {number} limit - Maximum number of events to return (default: 100)
   * @returns {Array} - Array of matching events
   */
  getEventsBySession(sessionId, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT
        id,
        channel,
        event_type,
        data,
        session_id,
        created_at
      FROM websocket_events
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(sessionId, limit);

    return rows.map(row => ({
      id: row.id,
      channel: row.channel,
      eventType: row.event_type,
      data: JSON.parse(row.data),
      sessionId: row.session_id,
      createdAt: row.created_at
    }));
  }

  /**
   * Get events by channel
   * @param {string} channel - Channel to filter by (agent:logs, agent:status, agent:progress, agent:artifact)
   * @param {number} limit - Maximum number of events to return (default: 50)
   * @returns {Array} - Array of matching events
   */
  getEventsByChannel(channel, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT
        id,
        channel,
        event_type,
        data,
        session_id,
        created_at
      FROM websocket_events
      WHERE channel = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(channel, limit);

    return rows.map(row => ({
      id: row.id,
      channel: row.channel,
      eventType: row.event_type,
      data: JSON.parse(row.data),
      sessionId: row.session_id,
      createdAt: row.created_at
    }));
  }

  /**
   * Clear old events (cleanup)
   * @param {number} daysOld - Delete events older than this many days (default: 7)
   * @returns {number} - Number of events deleted
   */
  clearOldEvents(daysOld = 7) {
    const stmt = this.db.prepare(`
      DELETE FROM websocket_events
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(daysOld);
    return result.changes;
  }

  /**
   * Subscribe to events (polling mechanism for dashboard)
   * Polls for new events since lastEventId
   *
   * @param {number} lastEventId - Last event ID received (0 for initial load)
   * @param {number} limit - Maximum number of events to return (default: 100)
   * @returns {Array} - Array of new events
   */
  subscribeToEvents(lastEventId = 0, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT
        id,
        channel,
        event_type,
        data,
        session_id,
        created_at
      FROM websocket_events
      WHERE id > ?
      ORDER BY id ASC
      LIMIT ?
    `);

    const rows = stmt.all(lastEventId, limit);

    return rows.map(row => ({
      id: row.id,
      channel: row.channel,
      eventType: row.event_type,
      data: JSON.parse(row.data),
      sessionId: row.session_id,
      createdAt: row.created_at
    }));
  }

  /**
   * Get event statistics
   * @returns {Object} - Statistics about events
   */
  getStatistics() {
    // Total events
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM websocket_events');
    const total = totalStmt.get().count;

    // Events by type
    const byTypeStmt = this.db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM websocket_events
      GROUP BY event_type
      ORDER BY count DESC
    `);
    const byType = byTypeStmt.all();

    // Events by channel
    const byChannelStmt = this.db.prepare(`
      SELECT channel, COUNT(*) as count
      FROM websocket_events
      GROUP BY channel
      ORDER BY count DESC
    `);
    const byChannel = byChannelStmt.all();

    // Recent sessions
    const sessionsStmt = this.db.prepare(`
      SELECT DISTINCT session_id, MIN(created_at) as first_event, MAX(created_at) as last_event
      FROM websocket_events
      WHERE session_id IS NOT NULL
      GROUP BY session_id
      ORDER BY last_event DESC
      LIMIT 10
    `);
    const recentSessions = sessionsStmt.all();

    // Events in last 24 hours
    const last24hStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM websocket_events
      WHERE created_at > datetime('now', '-1 day')
    `);
    const last24h = last24hStmt.get().count;

    return {
      total,
      byType,
      byChannel,
      recentSessions,
      last24h
    };
  }

  /**
   * Clear all events (use with caution)
   * @returns {number} - Number of events deleted
   */
  clearAllEvents() {
    const stmt = this.db.prepare('DELETE FROM websocket_events');
    const result = stmt.run();
    return result.changes;
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

module.exports = EventPublisher;

// ============================================================================
// CLI Interface
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const publisher = new EventPublisher();

  try {
    switch (command) {
      case 'publish': {
        // Usage: event-publisher.js publish <event-type> <entity-type> <entity-id> [payload-json]
        const [, eventType, entityType, entityId, payloadJson] = args;

        if (!eventType || !entityType || !entityId) {
          console.error('Error: Missing required arguments');
          console.log('Usage: event-publisher.js publish <event-type> <entity-type> <entity-id> [payload-json]');
          console.log(`Valid event types: ${EVENT_TYPES.join(', ')}`);
          process.exit(1);
        }

        const payload = payloadJson ? JSON.parse(payloadJson) : {};
        const event = publisher.publishEvent(eventType, entityType, entityId, payload);

        console.log('✓ Event published successfully');
        console.log(`  ID: ${event.id}`);
        console.log(`  Type: ${event.eventType}`);
        console.log(`  Channel: ${event.channel}`);
        console.log(`  Entity: ${event.entityType}/${event.entityId}`);
        console.log(`  Session: ${event.sessionId}`);
        break;
      }

      case 'list': {
        // Usage: event-publisher.js list [event-type] [limit]
        const [, filterType, limitArg] = args;
        const limit = limitArg ? parseInt(limitArg, 10) : 20;

        let events;
        if (filterType) {
          events = publisher.getEventsByType(filterType, limit);
          console.log(`Recent ${filterType} events (limit ${limit}):\n`);
        } else {
          events = publisher.getRecentEvents(limit);
          console.log(`Recent events (limit ${limit}):\n`);
        }

        if (events.length === 0) {
          console.log('No events found.');
        } else {
          events.forEach(event => {
            console.log(`[${event.id}] ${event.createdAt}`);
            console.log(`  Type: ${event.eventType}`);
            console.log(`  Channel: ${event.channel}`);
            console.log(`  Entity: ${event.data.entityType}/${event.data.entityId}`);
            console.log(`  Session: ${event.sessionId}`);
            if (Object.keys(event.data).length > 4) {
              console.log(`  Data: ${JSON.stringify(event.data, null, 2)}`);
            }
            console.log('');
          });
        }
        break;
      }

      case 'cleanup': {
        // Usage: event-publisher.js cleanup <days>
        const [, daysArg] = args;
        const days = daysArg ? parseInt(daysArg, 10) : 7;

        const deleted = publisher.clearOldEvents(days);
        console.log(`✓ Deleted ${deleted} events older than ${days} days`);
        break;
      }

      case 'stats': {
        // Usage: event-publisher.js stats
        const stats = publisher.getStatistics();

        console.log('Event Statistics\n');
        console.log(`Total Events: ${stats.total}`);
        console.log(`Events (Last 24h): ${stats.last24h}`);

        console.log('\nEvents by Type:');
        stats.byType.forEach(item => {
          console.log(`  ${item.event_type}: ${item.count}`);
        });

        console.log('\nEvents by Channel:');
        stats.byChannel.forEach(item => {
          console.log(`  ${item.channel}: ${item.count}`);
        });

        console.log('\nRecent Sessions:');
        stats.recentSessions.forEach(session => {
          console.log(`  ${session.session_id}`);
          console.log(`    First: ${session.first_event}`);
          console.log(`    Last: ${session.last_event}`);
        });
        break;
      }

      case 'subscribe': {
        // Usage: event-publisher.js subscribe [last-event-id] [limit]
        const [, lastIdArg, limitArg] = args;
        const lastId = lastIdArg ? parseInt(lastIdArg, 10) : 0;
        const limit = limitArg ? parseInt(limitArg, 10) : 100;

        const newEvents = publisher.subscribeToEvents(lastId, limit);

        if (newEvents.length === 0) {
          console.log(`No new events since ID ${lastId}`);
        } else {
          console.log(`Found ${newEvents.length} new events:\n`);
          newEvents.forEach(event => {
            console.log(`[${event.id}] ${event.eventType} - ${event.data.entityType}/${event.data.entityId}`);
          });
          console.log(`\nLast event ID: ${newEvents[newEvents.length - 1].id}`);
        }
        break;
      }

      case 'session': {
        // Usage: event-publisher.js session <session-id> [limit]
        const [, sessionId, limitArg] = args;

        if (!sessionId) {
          console.error('Error: Missing session ID');
          console.log('Usage: event-publisher.js session <session-id> [limit]');
          process.exit(1);
        }

        const limit = limitArg ? parseInt(limitArg, 10) : 100;
        const events = publisher.getEventsBySession(sessionId, limit);

        console.log(`Events for session ${sessionId} (limit ${limit}):\n`);

        if (events.length === 0) {
          console.log('No events found for this session.');
        } else {
          events.forEach(event => {
            console.log(`[${event.id}] ${event.createdAt} - ${event.eventType}`);
            console.log(`  Entity: ${event.data.entityType}/${event.data.entityId}`);
          });
        }
        break;
      }

      case 'channel': {
        // Usage: event-publisher.js channel <channel-name> [limit]
        const [, channelName, limitArg] = args;

        if (!channelName) {
          console.error('Error: Missing channel name');
          console.log('Usage: event-publisher.js channel <channel-name> [limit]');
          console.log('Valid channels: agent:logs, agent:status, agent:progress, agent:artifact');
          process.exit(1);
        }

        const limit = limitArg ? parseInt(limitArg, 10) : 50;
        const events = publisher.getEventsByChannel(channelName, limit);

        console.log(`Events for channel ${channelName} (limit ${limit}):\n`);

        if (events.length === 0) {
          console.log('No events found for this channel.');
        } else {
          events.forEach(event => {
            console.log(`[${event.id}] ${event.createdAt} - ${event.eventType}`);
            console.log(`  Entity: ${event.data.entityType}/${event.data.entityId}`);
          });
        }
        break;
      }

      default:
        console.log(`
AICodePath Event Publisher
Manage websocket_events table for real-time dashboard updates

Usage: event-publisher.js <command> [options]

Commands:
  publish <type> <entity-type> <entity-id> [payload-json]
      Publish a new event
      Event types: ${EVENT_TYPES.join(', ')}
      Example: event-publisher.js publish workflow_updated stage inception '{"status":"completed"}'

  list [type] [limit]
      List recent events (default: 20)
      Example: event-publisher.js list workflow_updated 10

  subscribe [last-event-id] [limit]
      Get new events since last-event-id (polling for dashboard)
      Example: event-publisher.js subscribe 0 100

  session <session-id> [limit]
      Get all events for a specific session
      Example: event-publisher.js session 20260202-123045-AB12

  channel <channel-name> [limit]
      Get all events for a specific channel
      Channels: agent:logs, agent:status, agent:progress, agent:artifact
      Example: event-publisher.js channel agent:status

  cleanup <days>
      Delete events older than X days (default: 7)
      Example: event-publisher.js cleanup 30

  stats
      Show event statistics
      Example: event-publisher.js stats

Examples:
  # Publish workflow update
  event-publisher.js publish workflow_updated stage inception '{"status":"completed","phase":"inception"}'

  # Publish artifact creation
  event-publisher.js publish artifact_created artifact 42 '{"title":"User Stories","path":"docs/stories.md"}'

  # List recent validation events
  event-publisher.js list validation_completed 5

  # Poll for new events (dashboard use case)
  event-publisher.js subscribe 1234

  # View statistics
  event-publisher.js stats

  # Cleanup old events
  event-publisher.js cleanup 7
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    publisher.close();
  }
}
