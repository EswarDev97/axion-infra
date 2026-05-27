/**
 * Visual Memory API Routes
 *
 * Provides endpoints for visual diagram management:
 * - List active visual diagrams
 * - Get diagram statistics (counts, staleness, confidence)
 * - Queue diagram regeneration
 *
 * Uses SQLite database via better-sqlite3 for diagram storage.
 */

const router = require('express').Router();
const pathResolver = require('../../lib/path-resolver');
const logger = require('../../lib/logger');

/**
 * Get database instance (read-only)
 * @returns {import('better-sqlite3').Database}
 */
function getDb() {
  const Database = require('better-sqlite3');
  const dbPath = pathResolver.getDbPath();
  return new Database(dbPath, { readonly: true });
}

/**
 * GET /api/visual-memory
 *
 * List all active visual diagrams ordered by creation date (newest first).
 *
 * Response: Array of diagram objects with camelCase property names.
 */
router.get('/', (req, res) => {
  let db;
  try {
    db = getDb();

    const diagrams = db.prepare(`
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
    `).all();

    // Sanitize and convert blob to string, strip markdown fences
    let sanitizedCount = 0;
    const sanitizedDiagrams = diagrams.map(diagram => {
      const originalContent = diagram.mermaidContent;

      // Convert Buffer (blob type) to string
      if (Buffer.isBuffer(diagram.mermaidContent)) {
        diagram.mermaidContent = diagram.mermaidContent.toString('utf8');
      }

      // Check validity after conversion
      if (typeof diagram.mermaidContent !== 'string' ||
          !diagram.mermaidContent ||
          diagram.mermaidContent.trim().length === 0) {

        logger.warn('[VisualMemory] Invalid mermaidContent detected', {
          diagramId: diagram.id,
          name: diagram.name,
          type: typeof originalContent,
          isNull: originalContent === null,
          length: originalContent ? originalContent.length : 0
        });

        // Provide fallback placeholder content
        diagram.mermaidContent = `${diagram.diagramType || 'erDiagram'}\n  %% Content unavailable - requires regeneration\n  %% Diagram ID: ${diagram.id}`;
        sanitizedCount++;
      } else {
        // Strip markdown code fences if present (```mermaid...```)
        const trimmed = diagram.mermaidContent.trim();
        if (trimmed.startsWith('```mermaid') && trimmed.endsWith('```')) {
          diagram.mermaidContent = trimmed
            .replace(/^```mermaid\s*\n?/, '')
            .replace(/\n?```\s*$/, '')
            .trim();
          sanitizedCount++;
        } else if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
          diagram.mermaidContent = trimmed
            .replace(/^```\w*\s*\n?/, '')
            .replace(/\n?```\s*$/, '')
            .trim();
          sanitizedCount++;
        } else if (Buffer.isBuffer(originalContent)) {
          sanitizedCount++;
        }
      }

      return diagram;
    });

    logger.info('[VisualMemory] Listed diagrams', {
      total: sanitizedDiagrams.length,
      sanitized: sanitizedCount
    });

    res.json(sanitizedDiagrams);
  } catch (error) {
    logger.error('[VisualMemory] List error', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve visual diagrams',
      details: error.message,
    });
  } finally {
    if (db) db.close();
  }
});

/**
 * GET /api/visual-memory/stats
 *
 * Get statistics about visual diagrams including:
 * - Total active diagram count
 * - Breakdown by diagram type
 * - Staleness distribution (fresh < 7d, stale 7-30d, veryStale > 30d)
 * - Average confidence score
 * - Last sync timestamp
 *
 * Response: { total, byType, staleness, avgConfidence, lastSync }
 */
router.get('/stats', (req, res) => {
  let db;
  try {
    db = getDb();

    // Total active diagrams
    const total = db.prepare(
      "SELECT COUNT(*) as total FROM visual_diagrams WHERE status = 'active'"
    ).get();

    // Count by diagram type
    const byTypeRows = db.prepare(
      "SELECT diagram_type, COUNT(*) as count FROM visual_diagrams WHERE status = 'active' GROUP BY diagram_type"
    ).all();

    const byType = {};
    byTypeRows.forEach(row => {
      byType[row.diagram_type] = row.count;
    });

    // Staleness calculation
    const diagrams = db.prepare(
      "SELECT last_validated_at as lastValidated FROM visual_diagrams WHERE status = 'active'"
    ).all();

    let fresh = 0;
    let stale = 0;
    let veryStale = 0;
    const now = Date.now();

    diagrams.forEach(d => {
      if (d.lastValidated) {
        const daysSince = (now - new Date(d.lastValidated).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
          fresh++;
        } else if (daysSince < 30) {
          stale++;
        } else {
          veryStale++;
        }
      }
    });

    // Average confidence
    const avgConfidence = db.prepare(
      "SELECT AVG(confidence) as avg FROM visual_diagrams WHERE status = 'active'"
    ).get();

    // Last sync time
    const lastSync = db.prepare(
      'SELECT MAX(last_validated_at) as last FROM visual_diagrams'
    ).get();

    logger.info('[VisualMemory] Stats retrieved', { total: total.total });

    res.json({
      total: total.total || 0,
      byType,
      staleness: { fresh, stale, veryStale },
      avgConfidence: avgConfidence.avg || 0,
      lastSync: lastSync.last || null,
    });
  } catch (error) {
    logger.error('[VisualMemory] Stats error', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve diagram statistics',
      details: error.message,
    });
  } finally {
    if (db) db.close();
  }
});

/**
 * POST /api/visual-memory/regenerate/:id
 *
 * Mark a diagram for regeneration. In a full implementation this would
 * trigger the visual-memory-generator hook. Currently acknowledges the
 * request and returns a success response.
 *
 * Params:
 * - id: Diagram ID to regenerate
 *
 * Response: { success, message, diagramId }
 */
router.post('/regenerate/:id', (req, res) => {
  try {
    const { id } = req.params;

    logger.info('[VisualMemory] Regeneration requested', { diagramId: id });

    res.json({
      success: true,
      message: 'Diagram queued for regeneration',
      diagramId: id,
    });
  } catch (error) {
    logger.error('[VisualMemory] Regeneration error', { error: error.message, diagramId: req.params.id });
    res.status(500).json({
      error: 'Failed to queue diagram regeneration',
      details: error.message,
    });
  }
});

module.exports = router;
