/**
 * AI Assistant API Routes
 *
 * Provides endpoints for AI-powered features:
 * - Chat with Claude about the project
 * - Generate feature breakdown from descriptions
 * - Get project context for AI
 *
 * Environment Variables Required:
 * - ANTHROPIC_API_KEY: Claude API key
 */

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const pathResolver = require('../../lib/path-resolver');
const logger = require('../../lib/logger');

const router = express.Router();

/**
 * Get Anthropic client instance
 * Validates API key is available
 */
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  return new Anthropic({
    apiKey,
    // Default to claude-sonnet-4-5-20250929, can be overridden
    dangerouslyAllowBrowser: false,
  });
}

/**
 * Get project context for AI assistant
 * @param {string} projectName - Name of the project
 * @returns {Promise<string>} Formatted project context
 */
async function getProjectContext(projectName) {
  try {
    const Database = require('better-sqlite3');
    const dbPath = pathResolver.getDbPath();

    if (!require('fs').existsSync(dbPath)) {
      logger.warn('[Assistant] Database not found', { dbPath });
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

    // Get artifacts count by phase
    const artifactCounts = db.prepare(`
      SELECT phase, COUNT(*) as count
      FROM artifacts
      GROUP BY phase
    `).all();

    // Get current checkpoint/session info if available
    const checkpoint = db.prepare(`
      SELECT phase, stage, unit
      FROM checkpoints
      ORDER BY created_at DESC
      LIMIT 1
    `).get();

    db.close();

    let context = `Project "${projectName}"\n\n`;

    if (checkpoint) {
      context += `Current Position: ${checkpoint.phase} / ${checkpoint.stage}`;
      if (checkpoint.unit) context += ` / ${checkpoint.unit}`;
      context += '\n\n';
    }

    if (recentTasks.length > 0) {
      context += 'Recent Activity:\n';
      recentTasks.forEach((task, i) => {
        context += `${i + 1}. ${task.phase}/${task.stage}: ${task.unit || 'N/A'} (${task.status})\n`;
      });
      context += '\n';
    }

    if (artifactCounts.length > 0) {
      context += 'Artifacts:\n';
      artifactCounts.forEach(ac => {
        context += `- ${ac.phase}: ${ac.count} items\n`;
      });
    }

    return context;
  } catch (error) {
    logger.error('[Assistant] Context error', { error: error.message, projectName });
    return `Project "${projectName}" - Context unavailable: ${error.message}`;
  }
}

/**
 * POST /api/assistant/chat
 *
 * Chat with AI assistant about the project
 *
 * Body:
 * - message: User's message
 * - projectName: Name of the project (default: "AICodePath")
 * - history: Conversation history (last 10 messages)
 *
 * Response:
 * - response: AI's response text
 * - timestamp: Response timestamp
 * - model: Model used for response
 */
router.post('/chat', async (req, res) => {
  const { message, projectName = 'AICodePath', history = [] } = req.body;

  // Validation
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Message is required and must be a string',
    });
  }

  if (message.trim().length === 0) {
    return res.status(400).json({
      error: 'Message cannot be empty',
    });
  }

  if (message.length > 10000) {
    return res.status(400).json({
      error: 'Message too large (max 10000 characters)',
    });
  }

  try {
    logger.info('[Assistant] Chat request', { projectName, messageLength: message.length });

    // Get project context
    const projectContext = await getProjectContext(projectName);

    // Get Anthropic client
    const anthropic = getAnthropicClient();

    // Build conversation history for API
    const apiMessages = [
      ...history.slice(-10).map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: `You are an AI assistant helping with the "${projectName}" project using the AICodePath framework.

Project Context:
${projectContext}

Your role is to:
- Help developers understand their project status
- Suggest next steps for development
- Explain AICodePath concepts (phases: PRE-FLIGHT, INCEPTION, CONSTRUCTION, OPERATIONS)
- Assist with feature planning and breakdown

Guidelines:
- Be concise but helpful
- If you don't know something, say so
- Format responses with markdown for better readability
- For code suggestions, use appropriate syntax highlighting`,
      messages: apiMessages,
    });

    const responseText = response.content[0]?.text || 'No response generated.';

    logger.info('[Assistant] Chat response', {
      projectName,
      responseLength: responseText.length,
      model: response.model,
    });

    res.json({
      response: responseText,
      timestamp: new Date().toISOString(),
      model: response.model,
      usage: response.usage,
    });
  } catch (error) {
    logger.error('[Assistant] Chat error', {
      error: error.message,
      type: error.type,
      status: error.status,
    });

    // Handle specific Anthropic errors
    if (error.type === 'invalid_request_error') {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.message,
      });
    }

    if (error.type === 'authentication_error') {
      return res.status(401).json({
        error: 'Authentication failed',
        details: 'Invalid API key',
      });
    }

    if (error.type === 'rate_limit_error') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        details: 'Too many requests, please try again later',
      });
    }

    if (error.type === 'api_error') {
      return res.status(502).json({
        error: 'Anthropic API error',
        details: error.message,
      });
    }

    // Generic error
    res.status(500).json({
      error: 'Failed to generate response',
      details: error.message,
    });
  }
});

/**
 * POST /api/assistant/expand
 *
 * Generate feature breakdown from natural language description
 *
 * Body:
 * - description: Feature requirements description
 * - projectName: Name of the project (default: "AICodePath")
 *
 * Response:
 * - features: Array of feature objects with title, description, priority, dependencies
 */
router.post('/expand', async (req, res) => {
  const { description, projectName = 'AICodePath' } = req.body;

  // Validation
  if (!description || typeof description !== 'string') {
    return res.status(400).json({
      error: 'Description is required and must be a string',
    });
  }

  if (description.trim().length === 0) {
    return res.status(400).json({
      error: 'Description cannot be empty',
    });
  }

  if (description.length > 5000) {
    return res.status(400).json({
      error: 'Description too large (max 5000 characters)',
    });
  }

  try {
    logger.info('[Assistant] Expand request', { projectName, descriptionLength: description.length });

    // Get project context
    const projectContext = await getProjectContext(projectName);

    // Get Anthropic client
    const anthropic = getAnthropicClient();

    // Call Claude API for feature breakdown
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000,
      system: `You are a software architect helping expand the "${projectName}" project using the AICodePath framework.

Project Context:
${projectContext}

AICodePath Phases:
- PRE-FLIGHT: Requirement gathering and validation
- INCEPTION: Architecture and design
- CONSTRUCTION: Implementation with GICL (Generate → Integrate → Commit → Learn)
- OPERATIONS: Testing and deployment

Your task is to break down feature requirements into individual, well-defined features.

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "features": [
    {
      "title": "Short feature title (max 50 chars)",
      "description": "Detailed description of what this feature does",
      "priority": "high" | "medium" | "low",
      "dependencies": ["other feature titles this depends on"]
    }
  ]
}

Guidelines:
- Break large features into smaller, manageable tasks
- Identify dependencies between features
- Set priority based on importance and blocking nature (high = critical/blocks others)
- Keep titles under 50 characters
- Make descriptions actionable
- Include 3-7 features total
- Return ONLY the JSON, no additional text`,
      messages: [{
        role: 'user',
        content: `Break down these feature requirements into implementation tasks:\n\n${description}`,
      }],
    });

    const responseText = response.content[0]?.text || '';

    // Extract JSON from response (handle cases where Claude adds extra text)
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (!parsed.features || !Array.isArray(parsed.features)) {
      throw new Error('Invalid response format: features array missing');
    }

    // Validate each feature
    parsed.features.forEach((feature, index) => {
      if (!feature.title || !feature.description || !feature.priority) {
        throw new Error(`Feature at index ${index} is missing required fields`);
      }
      if (!['high', 'medium', 'low'].includes(feature.priority)) {
        throw new Error(`Feature at index ${index} has invalid priority: ${feature.priority}`);
      }
    });

    logger.info('[Assistant] Expand response', {
      projectName,
      featureCount: parsed.features.length,
      model: response.model,
    });

    res.json({
      features: parsed.features,
      timestamp: new Date().toISOString(),
      model: response.model,
    });
  } catch (error) {
    logger.error('[Assistant] Expand error', {
      error: error.message,
      type: error.type,
    });

    // Handle JSON parse errors specifically
    if (error instanceof SyntaxError) {
      return res.status(502).json({
        error: 'Failed to parse AI response',
        details: 'The AI returned an invalid format',
      });
    }

    // Handle specific Anthropic errors
    if (error.type === 'invalid_request_error') {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.message,
      });
    }

    if (error.type === 'authentication_error') {
      return res.status(401).json({
        error: 'Authentication failed',
        details: 'Invalid API key',
      });
    }

    if (error.type === 'rate_limit_error') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        details: 'Too many requests, please try again later',
      });
    }

    res.status(500).json({
      error: 'Failed to generate features',
      details: error.message,
    });
  }
});

/**
 * GET /api/assistant/context
 *
 * Get current project context (for debugging/display)
 *
 * Query:
 * - projectName: Name of the project (default: "AICodePath")
 *
 * Response:
 * - context: Project context string
 * - projectName: Project name
 * - timestamp: Timestamp of context generation
 */
router.get('/context', async (req, res) => {
  const { projectName = 'AICodePath' } = req.query;

  try {
    const context = await getProjectContext(projectName);

    res.json({
      context,
      projectName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Assistant] Context error', { error: error.message });
    res.status(500).json({
      error: 'Failed to get context',
      details: error.message,
    });
  }
});

/**
 * GET /api/assistant/health
 *
 * Health check for assistant API
 * Verifies Anthropic API key is configured
 */
router.get('/health', (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  res.json({
    status: 'ok',
    apiConfigured: !!apiKey,
    apiKeyPresent: !!apiKey,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
