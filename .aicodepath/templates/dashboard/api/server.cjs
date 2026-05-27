/**
 * DEPRECATED: This server is legacy and lacks WebSocket support.
 * Use .aicodepath/api/server.js instead.
 * This file is kept for backward compatibility only.
 */

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

// Load project context utility for AI assistant
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Helper: Get project context for AI assistant
 */
function getProjectContext(projectName) {
  try {
    const dbPath = path.resolve(__dirname, '../../../aicodepath-docs/aicodepath.db');
    if (!fs.existsSync(dbPath)) {
      return `Project "${projectName}" - No database available`;
    }

    const db = new Database(dbPath, { readonly: true });

    // Get recent workflow state
    const recentTasks = db.prepare(`
      SELECT phase, stage, unit, status
      FROM workflow_state
      ORDER BY id DESC
      LIMIT 5
    `).all();

    // Get artifacts count
    const artifactCount = db.prepare('SELECT COUNT(*) as count FROM artifacts').get();

    db.close();

    return `Project "${projectName}"
Recent Activity:
${recentTasks.map(t => `- ${t.phase}/${t.stage}: ${t.unit} (${t.status})`).join('\n')}

Artifacts: ${artifactCount?.count || 0} total`;
  } catch (error) {
    console.error('[Assistant] Context error:', error.message);
    return `Project "${projectName}" - Context unavailable`;
  }
}

/**
 * Helper: Mock AI response (replace with actual Anthropic API in production)
 */
async function getAIResponse(message, context, history = []) {
  // In production, call Anthropic API here
  // For now, return a helpful mock response
  const responses = [
    `Based on your project context, I can help you with that. Your project is currently in ${context.split('\n')[1] || 'active development'}.`,
    `I see you're working on "${context.split('"')[1] || 'your project'}". Would you like me to help with the next steps?`,
    `Your project has ${context.includes('Artifacts:') ? context.split('Artifacts: ')[1].split(' ')[0] : 'several'} artifacts. What would you like to know?`,
  ];

  // Return contextual response based on message
  if (message.toLowerCase().includes('help')) {
    return `I can help you with:\n- Project status overview\n- Task management\n- Feature planning\n- Documentation review\n\nWhat would you like to know?`;
  }
  if (message.toLowerCase().includes('status')) {
    return context;
  }
  if (message.toLowerCase().includes('next')) {
    return `Based on your recent activity, consider:\n1. Review pending tasks in Kanban board\n2. Check agent status in Mission Control\n3. Validate recent changes`;
  }

  return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Helper: Generate feature suggestions from description
 */
async function generateFeatures(description, projectName) {
  // In production, call Anthropic API here
  // For now, return mock feature breakdown
  const baseFeatures = [
    {
      title: 'Core Implementation',
      description: `Implement the main functionality for: ${description.slice(0, 100)}...`,
      priority: 'high',
      dependencies: [],
    },
    {
      title: 'API Integration',
      description: 'Create API endpoints and integrate with backend services',
      priority: 'high',
      dependencies: ['Core Implementation'],
    },
    {
      title: 'UI/UX Design',
      description: 'Design user interface with consistent styling and accessibility',
      priority: 'medium',
      dependencies: [],
    },
    {
      title: 'Testing Suite',
      description: 'Write unit and integration tests for new functionality',
      priority: 'medium',
      dependencies: ['Core Implementation', 'API Integration'],
    },
    {
      title: 'Documentation',
      description: 'Document API usage, component props, and integration guides',
      priority: 'low',
      dependencies: ['Core Implementation', 'UI/UX Design'],
    },
  ];

  return { features: baseFeatures };
}

const dbPath = path.resolve(__dirname, '../../../aicodepath-docs/aicodepath.db');
const db = new Database(dbPath, { readonly: true });

// Helper to safely execute queries
function safeQuery(query, params = []) {
  try {
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

function safeQueryOne(query, params = []) {
  try {
    return db.prepare(query).get(...params);
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbPath
  });
});

// Workflow state for Kanban
app.get('/api/workflow-state', (req, res) => {
  const tasks = safeQuery(`
    SELECT
      id,
      cr_number,
      phase,
      stage,
      unit,
      status,
      started_at,
      completed_at,
      steps_total,
      steps_completed,
      artifacts_created,
      notes,
      blockers
    FROM workflow_state
    ORDER BY id DESC
  `);
  res.json(tasks);
});

// Agent status for Monitor
app.get('/api/agent-status', (req, res) => {
  const agents = safeQuery(`
    SELECT
      id,
      session_id,
      status,
      current_task,
      progress_percentage,
      updated_at
    FROM agent_status
    ORDER BY updated_at DESC
  `);
  res.json(agents);
});

// Validations for Monitor
app.get('/api/validations', (req, res) => {
  const validations = safeQuery(`
    SELECT
      v.id,
      v.artifact_id,
      v.file_path,
      v.validation_type,
      v.score,
      v.status,
      v.violations,
      v.validated_at,
      a.title as artifact_title
    FROM validations v
    LEFT JOIN artifacts a ON v.artifact_id = a.id
    ORDER BY v.validated_at DESC
    LIMIT 100
  `);
  res.json(validations);
});

// Validation summary
app.get('/api/validation-summary', (req, res) => {
  const summary = safeQuery(`
    SELECT
      validation_type,
      status,
      COUNT(*) as count,
      AVG(score) as avg_score
    FROM validations
    GROUP BY validation_type, status
  `);
  res.json(summary);
});

// Artifacts for tracking
app.get('/api/artifacts', (req, res) => {
  const { type, phase, limit = 50 } = req.query;

  let query = `
    SELECT
      id,
      artifact_type,
      phase,
      stage,
      unit,
      title,
      file_path,
      status,
      version,
      created_at,
      updated_at,
      created_by
    FROM artifacts
    WHERE 1=1
  `;
  const params = [];

  if (type) {
    query += ' AND artifact_type = ?';
    params.push(type);
  }

  if (phase) {
    query += ' AND phase = ?';
    params.push(phase);
  }

  query += ' ORDER BY updated_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const artifacts = safeQuery(query, params);
  res.json(artifacts);
});

// Artifact statistics
app.get('/api/artifact-stats', (req, res) => {
  const stats = safeQuery(`
    SELECT
      artifact_type,
      phase,
      COUNT(*) as count,
      MAX(updated_at) as last_updated
    FROM artifacts
    GROUP BY artifact_type, phase
    ORDER BY count DESC
  `);
  res.json(stats);
});

// Code entities (dependencies)
app.get('/api/code-entities', (req, res) => {
  const entities = safeQuery(`
    SELECT
      id,
      file_path,
      entity_type,
      name as entity_name,
      line_start as start_line,
      line_end as end_line,
      complexity as complexity_score,
      documentation as docstring
    FROM code_entities
    ORDER BY complexity DESC
    LIMIT 100
  `);
  res.json(entities);
});

// Code relations (dependency graph)
app.get('/api/code-relations', (req, res) => {
  const relations = safeQuery(`
    SELECT
      cr.id,
      cr.from_entity_id as source_entity_id,
      cr.to_entity_id as target_entity_id,
      cr.relation_type,
      cr.from_entity_name as source_name,
      ce1.file_path as source_file,
      cr.to_entity_name as target_name,
      ce2.file_path as target_file
    FROM code_relations cr
    LEFT JOIN code_entities ce1 ON cr.from_entity_id = ce1.id
    LEFT JOIN code_entities ce2 ON cr.to_entity_id = ce2.id
    LIMIT 200
  `);
  res.json(relations);
});

// Session history
app.get('/api/session-history', (req, res) => {
  const sessions = safeQuery(`
    SELECT
      id,
      session_id,
      event_type,
      agent_name,
      task_description,
      timestamp,
      metadata
    FROM session_history
    ORDER BY timestamp DESC
    LIMIT 50
  `);
  res.json(sessions);
});

// Design violations
app.get('/api/design-violations', (req, res) => {
  const violations = safeQuery(`
    SELECT
      id,
      violation_type,
      severity,
      file_path,
      description,
      suggestion,
      detected_at
    FROM design_violations
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'major' THEN 2
        WHEN 'minor' THEN 3
        ELSE 4
      END,
      detected_at DESC
    LIMIT 100
  `);
  res.json(violations);
});

// Dashboard overview
app.get('/api/overview', (req, res) => {
  const workflowCount = safeQueryOne('SELECT COUNT(*) as count FROM workflow_state');
  const artifactCount = safeQueryOne('SELECT COUNT(*) as count FROM artifacts');
  const validationCount = safeQueryOne('SELECT COUNT(*) as count FROM validations');
  const activeAgents = safeQueryOne("SELECT COUNT(*) as count FROM agent_status WHERE status = 'running'");

  const recentActivity = safeQuery(`
    SELECT
      'workflow' as type,
      unit as title,
      status,
      completed_at as timestamp
    FROM workflow_state
    WHERE completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 10
  `);

  res.json({
    counts: {
      workflows: workflowCount?.count || 0,
      artifacts: artifactCount?.count || 0,
      validations: validationCount?.count || 0,
      activeAgents: activeAgents?.count || 0
    },
    recentActivity
  });
});

// Visual Memory endpoints
app.get('/api/visual-memory', (req, res) => {
  const diagrams = safeQuery(`
    SELECT
      id,
      diagram_type as diagramType,
      name,
      scope,
      unit_name as unitName,
      title,
      description,
      mermaid_content as mermaidContent,
      generation_method as generationMethod,
      confidence,
      source_files as sourceFiles,
      sync_strategy as syncStrategy,
      priority,
      relevance_tags as relevanceTags,
      is_stale as isStale,
      last_validated_at as lastValidated,
      created_at as createdAt
    FROM visual_diagrams
    WHERE status = 'active'
    ORDER BY created_at DESC
  `);
  res.json(diagrams);
});

app.get('/api/visual-memory/stats', (req, res) => {
  const total = safeQueryOne("SELECT COUNT(*) as count FROM visual_diagrams WHERE status = 'active'");

  const byType = safeQuery(`
    SELECT diagram_type as diagramType, COUNT(*) as count
    FROM visual_diagrams
    WHERE status = 'active'
    GROUP BY diagram_type
  `);

  const avgConfidence = safeQueryOne("SELECT AVG(confidence) as avg FROM visual_diagrams WHERE status = 'active'");

  const lastSync = safeQueryOne(`
    SELECT MAX(last_validated_at) as lastSync
    FROM visual_diagrams
    WHERE status = 'active'
  `);

  // Calculate staleness
  const diagrams = safeQuery("SELECT last_validated_at as lastValidated FROM visual_diagrams WHERE status = 'active'");
  let fresh = 0, stale = 0, veryStale = 0;
  const now = Date.now();

  diagrams.forEach(d => {
    if (d.lastValidated) {
      const daysSince = (now - new Date(d.lastValidated).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) fresh++;
      else if (daysSince < 30) stale++;
      else veryStale++;
    }
  });

  const byTypeObj = {};
  byType.forEach(item => {
    byTypeObj[item.diagramType] = item.count;
  });

  res.json({
    total: total?.count || 0,
    byType: byTypeObj,
    staleness: { fresh, stale, veryStale },
    avgConfidence: avgConfidence?.avg || 0,
    lastSync: lastSync?.lastSync || null
  });
});

app.post('/api/visual-memory/regenerate/:id', (req, res) => {
  const { id } = req.params;

  // In a real implementation, this would trigger the visual-memory-generator hook
  // For now, we just acknowledge the request
  console.log(`Regeneration requested for diagram ${id}`);

  res.json({
    success: true,
    message: 'Diagram regeneration queued',
    diagramId: id
  });
});

// ============================================================================
// AI ASSISTANT API ROUTES
// ============================================================================

/**
 * POST /api/assistant/chat
 * Chat with AI assistant about the project
 */
app.post('/api/assistant/chat', async (req, res) => {
  const { message, projectName = 'AICodePath', history = [] } = req.body;

  try {
    // Get project context
    const projectContext = getProjectContext(projectName);

    // Get AI response
    const response = await getAIResponse(message, projectContext, history);

    res.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Assistant] Chat error:', error.message);
    res.status(500).json({
      error: 'Failed to generate response',
      details: error.message,
    });
  }
});

/**
 * POST /api/assistant/expand
 * Generate feature breakdown for expansion
 */
app.post('/api/assistant/expand', async (req, res) => {
  const { description, projectName = 'AICodePath' } = req.body;

  if (!description || description.trim().length === 0) {
    return res.status(400).json({
      error: 'Description is required',
    });
  }

  try {
    const result = await generateFeatures(description.trim(), projectName);

    res.json(result);
  } catch (error) {
    console.error('[Assistant] Expand error:', error.message);
    res.status(500).json({
      error: 'Failed to generate features',
      details: error.message,
    });
  }
});

/**
 * GET /api/assistant/context
 * Get current project context
 */
app.get('/api/assistant/context', (req, res) => {
  const { projectName = 'AICodePath' } = req.query;

  try {
    const context = getProjectContext(projectName);
    res.json({
      context,
      projectName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Assistant] Context error:', error.message);
    res.status(500).json({
      error: 'Failed to get context',
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ Dashboard API running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down API server...');
  db.close();
  process.exit(0);
});
