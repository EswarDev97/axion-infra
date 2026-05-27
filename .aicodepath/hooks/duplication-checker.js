#!/usr/bin/env node
/**
 * AICodePath Duplication Checker Hook
 *
 * Pre-commit hook that detects code and database script duplication.
 * Delegates to the Code Intelligence Indexer for entity extraction and
 * fingerprint-based duplicate detection.
 *
 * @module hooks/duplication-checker
 */

const path = require('path');
const { lib } = require('../lib/path-resolver');
const ValidationStorageFactory = require('../lib/validation-storage-factory');
const logger = require('../lib/logger');

// Import indexer components
let indexer = null;
let fingerprint = null;
let queries = null;

/**
 * Lazy-load indexer modules to avoid circular dependencies
 */
function loadIndexer() {
  if (!indexer) {
    try {
      const libPath = lib();
      indexer = require(path.join(libPath, 'indexer'));
      fingerprint = {
        hash: require(path.join(libPath, 'indexer/fingerprint/hash')),
        tokens: require(path.join(libPath, 'indexer/fingerprint/tokens')),
        structural: require(path.join(libPath, 'indexer/fingerprint/structural')),
      };
      queries = require(path.join(libPath, 'indexer/kb/queries'));
    } catch (err) {
      logger.warn('Code intelligence indexer not available - duplication checking disabled', {
        suggestion: 'Install with: npm install @anthropic/code-intelligence',
        mode: 'fallback'
      });
      return false;
    }
  }
  return true;
}

/**
 * Escape hatch - allows bypass of duplication check
 * Usage: // aicodepath: allow-duplication
 */
function allowDuplication(content) {
  return /aicodepath:\s*allow-duplication/i.test(content);
}

// Configuration
const CONFIG = {
  // Similarity thresholds
  exactThreshold: 100, // 100% = exact duplicate
  nearThreshold: 70, // 70%+ = near duplicate
  structuralThreshold: 80, // 80%+ = structural clone

  // Duplication score thresholds
  passThreshold: 5, // < 5% duplication = PASS
  reviewThreshold: 15, // < 15% duplication = REVIEW

  // File extensions to check
  codeExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs'],
  sqlExtensions: ['.sql'],

  // Weights for score calculation
  weights: {
    exact: 3,
    near: 2,
    structural: 2,
    table: 3,
    index: 1,
  },
};

/**
 * Get language from file extension
 */
function getLanguage(ext) {
  const map = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.sql': 'sql',
  };
  return map[ext] || 'unknown';
}

/**
 * Analyze file for duplications using the indexer engine
 * @param {string} filePath - Path to the file
 * @param {string} content - File content
 * @param {string} projectPath - Project root path
 * @returns {Object} Analysis results
 */
async function analyzeFile(filePath, content, projectPath) {
  // Check escape hatch first
  if (allowDuplication(content)) {
    return {
      file: filePath,
      language: getLanguage(path.extname(filePath)),
      duplicates: { exact: [], near: [], structural: [] },
      crossFileDuplicates: { exact: [], near: [], structural: [] },
      score: 100,
      status: 'PASS',
      bypassed: true,
    };
  }

  const ext = path.extname(filePath);
  const language = getLanguage(ext);

  const results = {
    file: filePath,
    language,
    duplicates: { exact: [], near: [], structural: [] },
    crossFileDuplicates: { exact: [], near: [], structural: [] },
    score: 100,
    status: 'PASS',
  };

  // Try to use indexer engine
  if (loadIndexer()) {
    try {
      // Index the file to extract entities with fingerprints
      const indexed = await indexer.indexFile(filePath, content, {
        persistToKB: false, // Don't persist during hook check
        computeFingerprints: true,
      });

      if (indexed.entities && indexed.entities.length > 0) {
        // Filter out MODULE entities - they're too generic for cross-file comparison
        const comparableEntities = indexed.entities.filter(
          (e) => !['MODULE', 'COLUMN', 'IMPORT'].includes(e.entity_type)
        );

        // Check each entity against KB for cross-file duplicates
        const kb = queries.getKB();

        if (kb && comparableEntities.length > 0) {
          for (const entity of comparableEntities) {
            const findings = queries.findDuplicatesForEntity(entity);

            for (const finding of findings) {
              // Skip matches with files that have the same base name (likely same file)
              if (path.basename(finding.entity.file_path) === path.basename(filePath)) {
                continue;
              }

              const dup = {
                source: {
                  name: entity.name,
                  type: entity.entity_type,
                  line: entity.start_line || entity.line_start,
                },
                match: {
                  name: finding.entity.name,
                  file: finding.entity.file_path,
                  line: finding.entity.line_start,
                },
                similarity: finding.score,
              };

              if (finding.type === 'exact') {
                results.crossFileDuplicates.exact.push(dup);
              } else if (finding.type === 'near') {
                results.crossFileDuplicates.near.push(dup);
              } else if (finding.type === 'structural') {
                results.crossFileDuplicates.structural.push(dup);
              }
            }
          }
        }

        // Check for internal duplicates within the file (also filter generic types)
        results.duplicates = findInternalDuplicates(comparableEntities);
      }

      // Calculate score
      results.score = calculateDuplicationScore(results);
      results.status = getStatus(results.score);

      return results;
    } catch (err) {
      logger.warn('Indexer error, using fallback', {
        error: err.message,
        hook: 'duplication-checker'
      });
    }
  }

  // Fallback: basic line-level analysis without indexer (less precise, use REVIEW not FAIL)
  const fallbackResult = await analyzeFileFallback(filePath, content, projectPath);
  if (fallbackResult.status === 'FAIL') {
    fallbackResult.status = 'REVIEW';
  }
  return fallbackResult;
}

/**
 * Find internal duplicates within a file's entities
 * @param {Object[]} entities - Extracted entities
 * @returns {Object} Duplicate findings by type
 */
function findInternalDuplicates(entities) {
  const duplicates = { exact: [], near: [], structural: [] };
  const seen = new Set();

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const e1 = entities[i];
      const e2 = entities[j];

      // Skip if different types
      if (e1.entity_type !== e2.entity_type) continue;

      const key = `${i}-${j}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Check exact match
      if (e1.entity_hash && e1.entity_hash === e2.entity_hash) {
        duplicates.exact.push({
          item1: { name: e1.name, line: e1.start_line },
          item2: { name: e2.name, line: e2.start_line },
          similarity: 100,
        });
        continue;
      }

      // Check structural match
      if (e1.structural_hash && e1.structural_hash === e2.structural_hash) {
        duplicates.structural.push({
          item1: { name: e1.name, line: e1.start_line },
          item2: { name: e2.name, line: e2.start_line },
          similarity: 80,
        });
        continue;
      }

      // Check near match (Jaccard on tokens)
      if (e1.token_hash && e2.token_hash && fingerprint) {
        try {
          const similarity = fingerprint.tokens.computeJaccardSimilarity(
            e1.token_hash,
            e2.token_hash
          );
          if (similarity >= CONFIG.nearThreshold / 100) {
            duplicates.near.push({
              item1: { name: e1.name, line: e1.start_line },
              item2: { name: e2.name, line: e2.start_line },
              similarity: Math.round(similarity * 100),
            });
          }
        } catch {
          // Skip invalid token hashes
        }
      }
    }
  }

  return duplicates;
}

/**
 * Calculate duplication score from results
 * @param {Object} results - Analysis results
 * @returns {number} Score 0-100
 */
function calculateDuplicationScore(results) {
  const internalCount =
    (results.duplicates.exact?.length || 0) * CONFIG.weights.exact +
    (results.duplicates.near?.length || 0) * CONFIG.weights.near +
    (results.duplicates.structural?.length || 0) * CONFIG.weights.structural;

  const crossFileCount =
    (results.crossFileDuplicates.exact?.length || 0) * CONFIG.weights.exact +
    (results.crossFileDuplicates.near?.length || 0) * CONFIG.weights.near +
    (results.crossFileDuplicates.structural?.length || 0) * CONFIG.weights.structural;

  const totalWeight = internalCount + crossFileCount;

  // Base penalty calculation (scaled)
  const penalty = Math.min(100, totalWeight * 5);

  return Math.max(0, 100 - penalty);
}

/**
 * Get status from score
 * @param {number} score - Duplication score
 * @returns {string} Status (PASS, REVIEW, FAIL)
 */
function getStatus(score) {
  const duplicationPercent = 100 - score;
  if (duplicationPercent <= CONFIG.passThreshold) return 'PASS';
  if (duplicationPercent <= CONFIG.reviewThreshold) return 'REVIEW';
  return 'FAIL';
}

/**
 * SQL boilerplate patterns excluded from fallback duplication checks.
 * These structural patterns naturally repeat in DDL files.
 */
const SQL_BOILERPLATE_RE = [
  /^\s*(CREATE|DROP)\s+(TABLE|INDEX|TRIGGER|VIEW)\s/i,
  /^\s*(INSERT|ALTER)\s/i,
  /^\s*(FOREIGN|PRIMARY)\s+KEY\s/i,
  /^\s*UNIQUE\s*\(/i,
  /^\s*ON\s+(DELETE|UPDATE)\s/i,
  /^\s*REFERENCES\s/i,
  /^\s*(BEGIN|END)\s*;?\s*$/i,
  /^\s*WHEN\s*\(/i,
  /^\s*--\s*[-=+*]{3,}/,
  /^\s*\)\s*;?\s*$/,
  /^\s*\w+\s+(TEXT|INTEGER|REAL|BLOB|DATETIME|JSON|BOOLEAN)\b/i,
  /^\s*IF\s+(NOT\s+)?EXISTS/i,
];

/**
 * Check if a line is SQL boilerplate (structural, not logic)
 */
function isSqlBoilerplate(line) {
  return SQL_BOILERPLATE_RE.some(re => re.test(line));
}

/**
 * Fallback analysis without indexer (legacy behavior).
 * SQL files use structural-aware filtering to avoid false positives on DDL boilerplate.
 */
async function analyzeFileFallback(filePath, content, projectPath) {
  const ext = path.extname(filePath);
  const language = getLanguage(ext);
  const isSql = ext === '.sql' || filePath.includes('migration');

  const results = {
    file: filePath,
    language,
    duplicates: { exact: [], near: [], structural: [] },
    crossFileDuplicates: { exact: [], near: [], structural: [] },
    score: 100,
    status: 'PASS',
    fallbackMode: true,
  };

  const lines = content.split('\n');
  const lineHashes = new Map();
  const minLength = isSql ? 50 : 40;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < minLength) continue;

    // Skip SQL boilerplate lines that naturally repeat in DDL
    if (isSql && isSqlBoilerplate(line)) continue;

    if (lineHashes.has(line)) {
      results.duplicates.exact.push({
        item1: { name: `Line ${lineHashes.get(line) + 1}`, line: lineHashes.get(line) + 1 },
        item2: { name: `Line ${i + 1}`, line: i + 1 },
        similarity: 100,
      });
    } else {
      lineHashes.set(line, i);
    }
  }

  results.score = calculateDuplicationScore(results);
  results.status = getStatus(results.score);

  return results;
}
/**
 * Format duplication report for display
 * @param {Object} results - Analysis results
 * @returns {string} Formatted markdown report
 */
function formatDuplicationReport(results) {
  const lines = [];

  // Header based on status
  if (results.status === 'FAIL') {
    lines.push('## Code Duplication: FAIL\n');
    lines.push('**Critical**: Excessive code duplication detected. Refactoring required.\n');
  } else if (results.status === 'REVIEW') {
    lines.push('## Code Duplication: NEEDS REVIEW\n');
    lines.push('**Warning**: Some code duplication detected. Consider refactoring.\n');
  } else {
    lines.push('## Code Duplication: PASS\n');
  }

  lines.push(`**Score**: ${results.score}/100\n`);

  if (results.bypassed) {
    lines.push('\n*Note: Duplication check bypassed via escape hatch*\n');
    return lines.join('\n');
  }

  if (results.fallbackMode) {
    lines.push('\n*Note: Using fallback analysis (indexer not available)*\n');
  }

  // Exact duplicates
  const allExact = [
    ...(results.duplicates.exact || []).map((d) => ({ ...d, internal: true })),
    ...(results.crossFileDuplicates.exact || []).map((d) => ({ ...d, internal: false })),
  ];

  if (allExact.length > 0) {
    lines.push('\n### Exact Duplicates (must fix)\n');
    lines.push('| Source | Duplicate | Similarity |');
    lines.push('|--------|-----------|------------|');
    for (const dup of allExact.slice(0, 10)) {
      if (dup.internal) {
        lines.push(
          `| ${dup.item1.name} (L${dup.item1.line}) | ${dup.item2.name} (L${dup.item2.line}) | 100% |`
        );
      } else {
        lines.push(
          `| ${dup.source.name} (L${dup.source.line}) | ${dup.match.name} in ${path.basename(dup.match.file)} | 100% |`
        );
      }
    }
    if (allExact.length > 10) {
      lines.push(`| ... | +${allExact.length - 10} more | ... |`);
    }
    lines.push('');
  }

  // Near duplicates
  const allNear = [
    ...(results.duplicates.near || []).map((d) => ({ ...d, internal: true })),
    ...(results.crossFileDuplicates.near || []).map((d) => ({ ...d, internal: false })),
  ];

  if (allNear.length > 0) {
    lines.push('\n### Near Duplicates (should review)\n');
    lines.push('| Source | Similar To | Similarity |');
    lines.push('|--------|------------|------------|');
    for (const dup of allNear.slice(0, 10)) {
      if (dup.internal) {
        lines.push(
          `| ${dup.item1.name} (L${dup.item1.line}) | ${dup.item2.name} (L${dup.item2.line}) | ${dup.similarity}% |`
        );
      } else {
        lines.push(
          `| ${dup.source.name} (L${dup.source.line}) | ${dup.match.name} in ${path.basename(dup.match.file)} | ${dup.similarity}% |`
        );
      }
    }
    if (allNear.length > 10) {
      lines.push(`| ... | +${allNear.length - 10} more | ... |`);
    }
    lines.push('');
  }

  // Structural clones
  const allStructural = [
    ...(results.duplicates.structural || []).map((d) => ({ ...d, internal: true })),
    ...(results.crossFileDuplicates.structural || []).map((d) => ({ ...d, internal: false })),
  ];

  if (allStructural.length > 0) {
    lines.push('\n### Structural Clones (similar control flow)\n');
    lines.push('| Source | Similar To | Similarity |');
    lines.push('|--------|------------|------------|');
    for (const dup of allStructural.slice(0, 10)) {
      if (dup.internal) {
        lines.push(
          `| ${dup.item1.name} (L${dup.item1.line}) | ${dup.item2.name} (L${dup.item2.line}) | ${dup.similarity}% |`
        );
      } else {
        lines.push(
          `| ${dup.source.name} (L${dup.source.line}) | ${dup.match.name} in ${path.basename(dup.match.file)} | ${dup.similarity}% |`
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Hook entry point
 * Called before Write/Edit operations
 */
async function hook(params) {
  if (!params || !params.tool_name) {
    return { proceed: true };
  }

  const { tool_input, project_path } = params;

  let filePath, content;

  if (tool_input?.file_path) {
    filePath = tool_input.file_path;
  }

  if (tool_input?.content) {
    content = tool_input.content;
  } else if (tool_input?.new_string) {
    content = tool_input.new_string;
  }

  if (!filePath || !content) {
    return { proceed: true };
  }

  // Check if file should be analyzed
  const ext = path.extname(filePath);
  const shouldAnalyze =
    CONFIG.codeExtensions.includes(ext) ||
    CONFIG.sqlExtensions.includes(ext) ||
    filePath.includes('migration');

  if (!shouldAnalyze) {
    return { proceed: true };
  }

  // Skip test files (duplication is more acceptable there)
  const isTestFile =
    /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filePath) || filePath.includes('__tests__');

  if (isTestFile) {
    return { proceed: true };
  }

  // Analyze file using indexer engine
  const results = await analyzeFile(filePath, content, project_path);

  // Warn if using fallback mode (indexer not available)
  if (results.fallbackMode) {
    logger.warn('Duplication checking is running in limited fallback mode', {
      suggestion: 'For better duplicate detection, install: npm install @anthropic/code-intelligence'
    });
  }

  // **NEW: Record validation to database**
  try {
    const storage = ValidationStorageFactory.create(project_path);
    const score = results.score || 100;
    const status = results.status === 'FAIL' ? 'failed' :
                   results.status === 'REVIEW' ? 'warning' : 'passed';

    await storage.recordValidation({
      artifactId: null,
      filePath,
      validationType: 'duplication',
      score,
      status,
      violations: results.duplications || []
    });
    await storage.close();
  } catch (err) {
    logger.error('Failed to record validation', {
      error: err.message,
      hook: 'duplication-checker'
    });
  }

  // Block on FAIL
  if (results.status === 'FAIL') {
    return {
      proceed: false,
      message:
        formatDuplicationReport(results) +
        '\n\n**Action Required**: Reduce duplication before proceeding.',
      duplication: results,
    };
  }

  // Warn on REVIEW
  if (results.status === 'REVIEW') {
    return {
      proceed: true,
      message: formatDuplicationReport(results),
      duplication: results,
    };
  }

  return {
    proceed: true,
    message: `Duplication check passed: Score ${results.score}/100`,
    duplication: results,
  };
}

/**
 * Get duplication score for a file (utility function)
 * @param {string} filePath - Path to file
 * @param {string} content - File content
 * @param {string} projectPath - Project root
 * @returns {number} Score 0-100
 */
async function getDuplicationScore(filePath, content, projectPath) {
  const results = await analyzeFile(filePath, content, projectPath);
  return results.score;
}

/**
 * Analyze entire codebase for duplications
 * Delegates to the indexer engine
 * @param {string} codebasePath - Path to codebase
 * @returns {Object} Codebase analysis results
 */
async function analyzeCodebase(codebasePath) {
  if (!loadIndexer()) {
    return {
      success: false,
      error: 'Indexer not available',
      findings: [],
    };
  }

  try {
    // Run full codebase index with duplication detection
    const results = await indexer.indexCodebase(codebasePath, {
      incremental: false,
      detectDuplicates: true,
      persistToKB: true,
    });

    // Get duplication report from KB
    const report = queries.getDuplicationReport({
      minScore: CONFIG.nearThreshold,
    });

    return {
      success: true,
      filesScanned: results.filesScanned,
      entitiesFound: results.entitiesFound,
      duplicatesDetected: results.duplicatesDetected,
      findings: report.findings,
      summary: {
        total: report.totalFindings,
        exact: report.exactCount,
        near: report.nearCount,
        structural: report.structuralCount,
        averageScore: report.averageScore,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      findings: [],
    };
  }
}

// Legacy exports for backward compatibility
const extractFunctions = (content, language) => {
  if (!loadIndexer()) return [];
  // Delegate to TypeScript or Python extractor
  try {
    const libPath = lib();
    const { extractTypeScript } = require(path.join(libPath, 'indexer/extract/ts'));
    const { extractPython } = require(path.join(libPath, 'indexer/extract/py'));

    if (['typescript', 'javascript'].includes(language)) {
      const result = extractTypeScript('temp.js', content, { extractBodies: true });
      return result.entities.filter(
        (e) => e.entity_type === 'FUNCTION' || e.entity_type === 'METHOD'
      );
    } else if (language === 'python') {
      const result = extractPython('temp.py', content);
      return result.entities.filter(
        (e) => e.entity_type === 'FUNCTION' || e.entity_type === 'METHOD'
      );
    }
  } catch {
    return [];
  }
  return [];
};

const extractTableDefinitions = (content) => {
  if (!loadIndexer()) return [];
  try {
    const libPath = lib();
    const { extractSQL } = require(path.join(libPath, 'indexer/extract/sql'));
    const result = extractSQL('temp.sql', content);
    return result.entities.filter((e) => e.entity_type === 'TABLE');
  } catch {
    return [];
  }
};

const extractIndexes = (content) => {
  if (!loadIndexer()) return [];
  try {
    const libPath = lib();
    const { extractSQL } = require(path.join(libPath, 'indexer/extract/sql'));
    const result = extractSQL('temp.sql', content);
    return result.entities.filter((e) => e.entity_type === 'INDEX');
  } catch {
    return [];
  }
};

const calculateSimilarity = (str1, str2) => {
  if (!loadIndexer() || !fingerprint) {
    // Fallback Jaccard
    const tokens1 = new Set(str1.split(/\s+/));
    const tokens2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    return intersection.size / union.size;
  }
  const t1 = fingerprint.tokens.tokenize(str1, 'javascript');
  const t2 = fingerprint.tokens.tokenize(str2, 'javascript');
  return fingerprint.tokens.computeJaccardSimilarity(t1, t2);
};

module.exports = {
  // Primary exports
  hook,
  analyzeFile,
  analyzeCodebase,
  getDuplicationScore,
  formatDuplicationReport,
  allowDuplication,
  CONFIG,

  // Legacy exports for backward compatibility
  extractFunctions,
  extractTableDefinitions,
  extractIndexes,
  calculateSimilarity,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(hook, { name: 'duplication-checker' });
}
