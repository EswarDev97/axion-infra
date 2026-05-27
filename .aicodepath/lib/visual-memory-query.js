#!/usr/bin/env node
/**
 * Visual Memory Query
 * Retrieves and scores visual diagrams for context loading
 *
 * Features:
 * - Dynamic token budget calculation
 * - Relevance scoring algorithm
 * - Context-aware diagram selection
 * - File overlap and tag matching
 *
 * @module lib/visual-memory-query
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { findProjectRoot , getDbPath } = require('./path-resolver');

class VisualMemoryQuery {
  constructor(projectPath = null) {
    const projectRoot = projectPath || findProjectRoot(process.cwd());
    const dbPath = getDbPath();

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.projectRoot = projectRoot;
    this.memoryDir = path.join(projectRoot, 'aicodepath-docs', 'memory');

    // Token estimation constants
    this.TOKENS_PER_CHAR = 0.25; // Approximate tokens per character for Mermaid
    this.MAX_CONTEXT_WINDOW = 128000; // Claude's context window
  }

  /**
   * Calculate dynamic token budget based on context state
   * @param {Object} contextState - Current context state
   * @returns {number} - Available token budget for diagrams
   */
  calculateTokenBudget(contextState = {}) {
    const { usedTokens = 0, reservePercent = 70 } = contextState;

    const availableContext = this.MAX_CONTEXT_WINDOW - usedTokens;

    // Reserve specified percentage for code and conversation
    const diagramBudget = Math.floor(availableContext * (1 - reservePercent / 100));

    // Apply min/max bounds
    const minBudget = 1500;
    const maxBudget = 5000;

    return Math.max(minBudget, Math.min(maxBudget, diagramBudget));
  }

  /**
   * Calculate relevance score for a diagram
   * @param {Object} diagram - Diagram record
   * @param {Object} context - Current context (files, keywords, etc.)
   * @returns {number} - Relevance score (0-100)
   */
  calculateRelevance(diagram, context = {}) {
    const { files = [], keywords = [], currentUnit = null, diagramTypes = [] } = context;

    let score = 0;

    // Base priority score (30% weight)
    score += (diagram.priority / 100) * 30;

    // File overlap score (40% weight)
    const sourceFiles = JSON.parse(diagram.source_files || '[]');
    const fileOverlap = this.countOverlap(sourceFiles, files);
    if (sourceFiles.length > 0 && files.length > 0) {
      const overlapPercent = fileOverlap / Math.max(sourceFiles.length, files.length);
      score += overlapPercent * 40;
    }

    // Tag/keyword overlap score (20% weight)
    const tags = JSON.parse(diagram.relevance_tags || '[]');
    const tagOverlap = this.countOverlap(tags, keywords);
    if (tags.length > 0 && keywords.length > 0) {
      const tagOverlapPercent = tagOverlap / Math.max(tags.length, keywords.length);
      score += tagOverlapPercent * 20;
    }

    // Unit matching bonus (5% weight)
    if (currentUnit && diagram.unit_name === currentUnit) {
      score += 5;
    }

    // Diagram type preference (5% weight)
    if (diagramTypes.length > 0 && diagramTypes.includes(diagram.diagram_type)) {
      score += 5;
    }

    // Confidence adjustment
    score *= diagram.confidence;

    // Staleness penalty (reduce score by 30% if stale)
    if (diagram.is_stale) {
      score *= 0.7;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Count overlapping items between two arrays
   * @param {Array} arr1 - First array
   * @param {Array} arr2 - Second array
   * @returns {number} - Count of overlapping items
   */
  countOverlap(arr1, arr2) {
    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    return arr2.filter(item => set1.has(item.toLowerCase())).length;
  }

  /**
   * Estimate token count for diagram content
   * @param {string} content - Mermaid content
   * @returns {number} - Estimated token count
   */
  estimateTokens(content) {
    if (!content || typeof content !== 'string') return 0;
    return Math.ceil(content.length * this.TOKENS_PER_CHAR);
  }

  /**
   * Get diagrams for context loading with relevance scoring
   * @param {Object} options - Query options
   * @returns {Object} - Selected diagrams and metadata
   */
  getDiagramsForContext(options = {}) {
    const {
      tokenBudget = 3000,
      context = {},
      includeStale = false,
      minRelevance = 20,
      maxDiagrams = 10,
      excludeTypes = []
    } = options;

    // Get all active diagrams
    let query = 'SELECT * FROM visual_diagrams WHERE status = ?';
    const params = ['active'];

    if (!includeStale) {
      query += ' AND is_stale = 0';
    }

    if (excludeTypes.length > 0) {
      const placeholders = excludeTypes.map(() => '?').join(', ');
      query += ` AND diagram_type NOT IN (${placeholders})`;
      params.push(...excludeTypes);
    }

    query += ' ORDER BY priority DESC';

    const allDiagrams = this.db.prepare(query).all(...params);

    // Score and rank diagrams
    const scoredDiagrams = allDiagrams.map(diagram => ({
      ...diagram,
      relevanceScore: this.calculateRelevance(diagram, context),
      tokenEstimate: this.estimateTokens(diagram.mermaid_content)
    }));

    // Sort by relevance score descending
    scoredDiagrams.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Filter by minimum relevance
    const relevantDiagrams = scoredDiagrams.filter(d => d.relevanceScore >= minRelevance);

    // Select diagrams within token budget
    const selected = [];
    let usedTokens = 0;

    for (const diagram of relevantDiagrams) {
      if (selected.length >= maxDiagrams) break;
      if (usedTokens + diagram.tokenEstimate > tokenBudget) continue;

      selected.push(diagram);
      usedTokens += diagram.tokenEstimate;
    }

    return {
      diagrams: selected,
      metadata: {
        totalAvailable: allDiagrams.length,
        totalRelevant: relevantDiagrams.length,
        selectedCount: selected.length,
        tokenBudget,
        tokensUsed: usedTokens,
        tokensRemaining: tokenBudget - usedTokens
      }
    };
  }

  /**
   * Get diagrams by relevance to files
   * @param {Array} files - Array of file paths
   * @param {number} limit - Result limit
   * @returns {Array} - Relevant diagrams
   */
  getDiagramsForFiles(files, limit = 5) {
    const allDiagrams = this.db.prepare(`
      SELECT * FROM visual_diagrams
      WHERE status = 'active' AND is_stale = 0
    `).all();

    const scored = allDiagrams.map(diagram => {
      const sourceFiles = JSON.parse(diagram.source_files || '[]');
      const overlap = this.countOverlap(sourceFiles, files);
      return { ...diagram, overlap };
    });

    return scored
      .filter(d => d.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, limit);
  }

  /**
   * Get diagrams by tags
   * @param {Array} tags - Tags to match
   * @param {number} limit - Result limit
   * @returns {Array} - Matching diagrams
   */
  getDiagramsByTags(tags, limit = 10) {
    const allDiagrams = this.db.prepare(`
      SELECT * FROM visual_diagrams
      WHERE status = 'active' AND is_stale = 0
    `).all();

    const scored = allDiagrams.map(diagram => {
      const diagramTags = JSON.parse(diagram.relevance_tags || '[]');
      const overlap = this.countOverlap(diagramTags, tags);
      return { ...diagram, tagOverlap: overlap };
    });

    return scored
      .filter(d => d.tagOverlap > 0)
      .sort((a, b) => b.tagOverlap - a.tagOverlap)
      .slice(0, limit);
  }

  /**
   * Get critical diagrams (ER, architecture flowcharts)
   * @returns {Array} - Critical diagrams
   */
  getCriticalDiagrams() {
    return this.db.prepare(`
      SELECT * FROM visual_diagrams
      WHERE status = 'active'
        AND sync_strategy = 'eager'
      ORDER BY priority DESC
    `).all();
  }

  /**
   * Format diagrams for context injection
   * @param {Array} diagrams - Array of diagram records
   * @returns {string} - Formatted context string
   */
  formatForContext(diagrams) {
    if (diagrams.length === 0) {
      return '';
    }

    const sections = ['## Visual Memory - Architecture Diagrams\n'];

    // Group by type
    const byType = {};
    for (const diagram of diagrams) {
      const type = diagram.diagram_type;
      if (!byType[type]) byType[type] = [];
      byType[type].push(diagram);
    }

    // Format each type
    for (const [type, typeDiagrams] of Object.entries(byType)) {
      sections.push(`### ${this.capitalize(type)} Diagrams\n`);

      for (const d of typeDiagrams) {
        sections.push(`#### ${d.title}`);
        if (d.description) {
          sections.push(d.description);
        }
        sections.push('```mermaid');
        sections.push(d.mermaid_content);
        sections.push('```');
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  /**
   * Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} - Capitalized string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Read index.json
   * @returns {Object|null} - Index data or null
   */
  readIndex() {
    const indexPath = path.join(this.memoryDir, 'index.json');
    if (!fs.existsSync(indexPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  }

  /**
   * Read metadata.json
   * @returns {Object|null} - Metadata or null
   */
  readMetadata() {
    const metadataPath = path.join(this.memoryDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  }

  /**
   * Read diagram file from file system
   * @param {string} relativePath - Relative path from memory dir
   * @returns {string|null} - File content or null
   */
  readDiagramFile(relativePath) {
    const absolutePath = path.join(this.memoryDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    return fs.readFileSync(absolutePath, 'utf8');
  }

  /**
   * Get summary of all diagrams for quick reference
   * @returns {Object} - Summary information
   */
  getSummary() {
    const stats = this.db.prepare(`
      SELECT
        diagram_type,
        COUNT(*) as count,
        SUM(CASE WHEN is_stale = 1 THEN 1 ELSE 0 END) as stale_count,
        AVG(confidence) as avg_confidence
      FROM visual_diagrams
      WHERE status = 'active'
      GROUP BY diagram_type
    `).all();

    const totalTokens = this.db.prepare(`
      SELECT SUM(LENGTH(mermaid_content)) as total_chars
      FROM visual_diagrams
      WHERE status = 'active' AND is_stale = 0
    `).get();

    return {
      byType: stats.reduce((acc, s) => ({
        ...acc,
        [s.diagram_type]: {
          count: s.count,
          stale: s.stale_count,
          avgConfidence: Math.round(s.avg_confidence * 100) / 100
        }
      }), {}),
      estimatedTokens: Math.ceil((totalTokens?.total_chars || 0) * this.TOKENS_PER_CHAR)
    };
  }

  /**
   * Get diagrams that need regeneration (stale + eager sync)
   * @returns {Array} - Diagrams needing regeneration
   */
  getDiagramsNeedingRegeneration() {
    return this.db.prepare(`
      SELECT * FROM visual_diagrams
      WHERE status = 'active'
        AND is_stale = 1
        AND sync_strategy = 'eager'
      ORDER BY priority DESC
    `).all();
  }

  /**
   * Get diagrams for a specific unit
   * @param {string} unitName - Unit name
   * @returns {Array} - Unit diagrams
   */
  getUnitDiagrams(unitName) {
    return this.db.prepare(`
      SELECT * FROM visual_diagrams
      WHERE status = 'active'
        AND unit_name = ?
      ORDER BY diagram_type, priority DESC
    `).all(unitName);
  }

  close() {
    this.db.close();
  }
}

module.exports = VisualMemoryQuery;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const query = new VisualMemoryQuery();

  try {
    switch (command) {
      case 'context':
        const budget = parseInt(args[1]) || 3000;
        const result = query.getDiagramsForContext({ tokenBudget: budget });
        console.log('\n=== Diagrams for Context ===\n');
        console.log(`Budget: ${result.metadata.tokenBudget} tokens`);
        console.log(`Used: ${result.metadata.tokensUsed} tokens`);
        console.log(`Selected: ${result.metadata.selectedCount} of ${result.metadata.totalAvailable}`);
        console.log('\nDiagrams:');
        for (const d of result.diagrams) {
          console.log(`  [${d.id}] ${d.name} (${d.diagram_type})`);
          console.log(`      Relevance: ${d.relevanceScore}, Tokens: ${d.tokenEstimate}`);
        }
        break;

      case 'summary':
        const summary = query.getSummary();
        console.log('\n=== Visual Memory Summary ===\n');
        console.log(`Estimated tokens (all fresh): ${summary.estimatedTokens}`);
        console.log('\nBy Type:');
        for (const [type, data] of Object.entries(summary.byType)) {
          console.log(`  ${type}:`);
          console.log(`    Count: ${data.count}, Stale: ${data.stale}`);
          console.log(`    Avg Confidence: ${data.avgConfidence}`);
        }
        break;

      case 'critical':
        const critical = query.getCriticalDiagrams();
        console.log('\n=== Critical Diagrams (Eager Sync) ===\n');
        if (critical.length === 0) {
          console.log('No critical diagrams found.');
        } else {
          for (const d of critical) {
            const staleIndicator = d.is_stale ? ' [STALE]' : '';
            console.log(`[${d.id}] ${d.name}${staleIndicator}`);
            console.log(`    Type: ${d.diagram_type}, Priority: ${d.priority}`);
          }
        }
        break;

      case 'needs-regen':
        const needsRegen = query.getDiagramsNeedingRegeneration();
        console.log('\n=== Diagrams Needing Regeneration ===\n');
        if (needsRegen.length === 0) {
          console.log('All eager-sync diagrams are fresh.');
        } else {
          for (const d of needsRegen) {
            console.log(`[${d.id}] ${d.name} (${d.diagram_type})`);
            console.log(`    Priority: ${d.priority}`);
          }
        }
        break;

      case 'format':
        const formatResult = query.getDiagramsForContext({ tokenBudget: 5000 });
        console.log(query.formatForContext(formatResult.diagrams));
        break;

      default:
        console.log(`
Visual Memory Query - Retrieve and score visual diagrams

Usage: visual-memory-query.js <command> [options]

Commands:
  context [budget]    Get diagrams for context loading (default budget: 3000)
  summary            Show summary of all diagrams
  critical           List critical (eager sync) diagrams
  needs-regen        List diagrams needing regeneration
  format             Output formatted context for injection

Examples:
  visual-memory-query.js context 4000
  visual-memory-query.js summary
  visual-memory-query.js format
        `);
    }
  } finally {
    query.close();
  }
}
