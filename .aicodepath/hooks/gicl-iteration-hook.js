#!/usr/bin/env node
/**
 * GICL Iteration Hook - Enhanced with Requirements-Driven Completion Loop
 *
 * Hook that executes at iteration boundaries during GICL loops.
 * Provides dual validation: quality gates AND success criteria from design docs.
 * Suggests appropriate agents for gaps.
 *
 * @module hooks/gicl-iteration-hook
 */

const path = require('path');
const { findProjectRoot, getDbPath } = require('../lib/path-resolver');
const { isEnabled } = require('../lib/feature-flags');
const { calculateCost, buildBudgetLine } = require('../lib/pricing-calculator');
const { parseDesignDocsForFile } = require('./lib/requirements-parser');
const { verifyRequirements } = require('./lib/implementation-verifier');
const { suggestAgents, formatSuggestions } = require('./lib/agent-suggester');
const ValidationRecorder = require('../lib/validation-recorder');
const EventPublisher = require('../lib/event-publisher');
const ErrorHandler = require('../lib/error-handler');
const { DatabaseError, FileSystemError } = require('../lib/errors');
const logger = require('../lib/logger');
const { saveCheckpoint } = require('../lib/checkpoint-manager');
const wsEmitter = require('./lib/ws-emitter');
const GICLSessionManager = require('../lib/gicl-session-manager');
const { calculateWeightedScore, shouldContinue: shouldContinueCalc, getScoreGrade } = require('../lib/gicl-score-calculator');
const { calculateEffort, buildEffortGuidance } = require('../lib/effort-scorer');

/**
 * Hook implementation
 * Called at iteration boundaries (before/after each iteration)
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.session - GICL session
 * @param {number} params.iteration - Current iteration number
 * @param {string} params.phase - 'before' or 'after' iteration
 * @param {Object} params.score - Current score (after phase only)
 * @param {string} params.project_path - Project path
 * @param {string} params.file_path - File being validated (optional)
 * @param {string} params.content - File content (optional)
 * @returns {Object} Hook result
 */
/**
 * GICL Lite Mode — lightweight quality signal when no active GICL session exists.
 *
 * P3.1: For trivial/simple files, runs basic guideline validation and returns
 * an `additionalContext` hint rather than silently passing through.
 * P3.2: Also used as fallback when DB is unavailable.
 *
 * @param {string} filePath   - File being written/edited
 * @param {string} content    - File content (may be undefined)
 * @param {string} projectPath - Project root
 * @returns {Object} Hook result with optional additionalContext
 */
async function runLiteMode(filePath, content, projectPath) {
  // Nothing to analyse without a file
  if (!filePath) return { proceed: true, message: null };

  // Read content if not provided
  if (!content && filePath) {
    try {
      content = require('fs').readFileSync(filePath, 'utf8');
    } catch (_) {
      return { proceed: true, message: null };
    }
  }

  const lines = (content || '').split('\n');
  const loc = lines.length;

  // Detect complexity from LOC
  let complexity = 'trivial';
  if (loc > 300) complexity = 'complex';
  else if (loc > 100) complexity = 'moderate';
  else if (loc > 30)  complexity = 'simple';

  // Only lite-check trivial/simple files; for moderate/complex let full GICL handle it
  if (complexity === 'complex' || complexity === 'moderate') {
    return {
      proceed: true,
      message: `GICL lite: ${complexity} file (${loc} LOC) — start a full GICL session with /aicodepath-gicl-start`,
    };
  }

  // Quick guideline check via collectScoreComponents
  let violations = [];
  try {
    const components = await collectScoreComponents(filePath, content, projectPath);
    violations = components.violations || [];
  } catch (_) {
    // Guideline check unavailable — still proceed
  }

  const violationCount = violations.length;
  const guidelineScore = Math.max(0, 100 - violationCount * 10);
  const passed = guidelineScore >= 80;

  let budgetLine = '';
  try {
    budgetLine = buildBudgetLine(complexity, process.env.CLAUDE_MODEL_ID);
  } catch (_) { /* non-fatal */ }

  const report = [
    budgetLine,
    `## GICL Lite Check — ${require('path').basename(filePath)} (${loc} LOC, ${complexity})`,
    '',
    passed
      ? `✅ Quick check passed (${violationCount} violation${violationCount === 1 ? '' : 's'})`
      : `⚠️  ${violationCount} guideline violation${violationCount === 1 ? '' : 's'} found`,
    '',
    ...(violations.slice(0, 5).map(v => `- ${v.rule || v.id || 'violation'}: ${v.message || v.description || ''}`)),
    violations.length > 5 ? `  ...and ${violations.length - 5} more` : '',
    '',
    'For full quality scoring (tests, architecture, duplication), run `/aicodepath-gicl-start`.',
  ].filter(line => line !== undefined).join('\n');

  return {
    proceed: true,
    message: passed ? `GICL lite: ${complexity} file passed quick check` : `GICL lite: ${violationCount} violations found`,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: report,
    },
  };
}

async function giclIterationHookImpl(params) {
  let { session, iteration, phase, score, project_path, file_path, content } = params;

  // Check if GICL is disabled via feature flag (config > env var > default)
  if (!isEnabled('gicl')) {
    return {
      proceed: true,
      message: 'GICL disabled (check features.flags.gicl in .aicodepath/config.json)',
    };
  }

  // If caller didn't provide session/iteration/phase (e.g. PostToolUse),
  // look up the active GICL session from the database.
  if (!session || !iteration || !phase) {
    let sessionManager;
    try {
      sessionManager = new GICLSessionManager();
      const dbSession = sessionManager.getActiveSession();
      if (!dbSession) {
        // P3.1: No active GICL session — run lite mode for trivial/simple files
        return runLiteMode(file_path, content, project_path || findProjectRoot(process.cwd()));
      }

      // Build session object from DB record
      session = {
        sessionId: dbSession.id,
        maxIterations: dbSession.max_iterations,
        currentIteration: dbSession.current_iteration,
        previousScores: dbSession.previousScores || [],
        status: dbSession.status,
        phase: 'CONSTRUCTION',
        stage: 'gicl-iteration',
        unit: dbSession.unit_name || (dbSession.target_file ? path.basename(dbSession.target_file) : 'unknown'),
      };
      iteration = dbSession.current_iteration + 1;
      phase = 'after'; // PostToolUse fires after a write - always 'after'

      // Read file content if not provided
      if (file_path && !content) {
        try {
          const fsSync = require('fs');
          content = fsSync.readFileSync(file_path, 'utf8');
        } catch (readErr) {
          logger.warn('Could not read file for GICL validation', { file_path, error: readErr.message });
        }
      }

      // Collect score components from guideline validation
      const iterationStartTime = Date.now();
      const projectPath = project_path || findProjectRoot(process.cwd());
      const scoreComponents = await collectScoreComponents(file_path, content, projectPath);
      score = {
        tests: scoreComponents.tests,
        guidelines: scoreComponents.guidelines,
        architecture: scoreComponents.architecture,
        duplication: scoreComponents.duplication,
        authenticity: scoreComponents.authenticity,
        final: calculateWeightedScore(scoreComponents),
        violations: scoreComponents.violations,
      };

      // Extract token usage from Claude Code hook environment (graceful degradation)
      const tokenUsage = {
        inputTokens:  parseInt(process.env.CLAUDE_INPUT_TOKENS        || '0', 10),
        outputTokens: parseInt(process.env.CLAUDE_OUTPUT_TOKENS       || '0', 10),
        cacheRead:    parseInt(process.env.CLAUDE_CACHE_READ_TOKENS   || '0', 10),
        cacheWrite:   parseInt(process.env.CLAUDE_CACHE_WRITE_TOKENS  || '0', 10),
      };
      const modelId = process.env.CLAUDE_MODEL_ID || 'claude-sonnet-4-5-20250929';
      const costUsd = calculateCost(tokenUsage, modelId);

      // Record the iteration in DB
      const grade = getScoreGrade(score.final);
      const durationMs = Date.now() - iterationStartTime;
      try {
        sessionManager.recordIteration(dbSession.id, {
          iterationNumber: iteration,
          finalScore: score.final,
          testScore: score.tests,
          guidelineScore: score.guidelines,
          architectureScore: score.architecture,
          duplicationScore: score.duplication,
          authenticityScore: score.authenticity,
          violationsCount: (scoreComponents.violations || []).length,
          violations: scoreComponents.violations,
          filePath: file_path,
          durationMs,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
          cacheReadTokens: tokenUsage.cacheRead,
          cacheWriteTokens: tokenUsage.cacheWrite,
          modelId,
          costUsd,
        });
      } catch (recordErr) {
        logger.error('Failed to record GICL iteration', { error: recordErr.message });
      }

      // Emit WebSocket events
      wsEmitter.emitGICLIterationComplete({
        sessionId: dbSession.id,
        iteration,
        score: score.final,
        grade: grade.label,
        shouldContinue: score.final < 90,
      });

      if (costUsd > 0) {
        wsEmitter.emitCostUpdate({
          sessionId: dbSession.id,
          iteration,
          costUsd,
          modelId,
        });
      }

      // Check if GICL should stop
      const continueDecision = shouldContinueCalc(
        { current_iteration: iteration, maxIterations: dbSession.max_iterations },
        score.final,
        dbSession.previousScores || []
      );

      if (!continueDecision.shouldContinue) {
        try {
          sessionManager.completeSession(dbSession.id, continueDecision.reason, score.final);
          wsEmitter.emitGICLSessionComplete({
            sessionId: dbSession.id,
            finalScore: score.final,
            reason: continueDecision.reason,
            totalIterations: iteration,
          });

          // Record persistent violations as reflexion patterns so future sessions
          // can learn from repeated failures (B2.3 Reflexion Pattern).
          // Only record when session ended with a low score (< 70) and there are violations.
          if (score.final < 70 && (scoreComponents.violations || []).length > 0) {
            try {
              const Database = require('better-sqlite3');
              const ReflexionLearner = require('../lib/reflexion-learner');
              const reflexionDb = new Database(getDbPath());
              const rl = new ReflexionLearner(reflexionDb, project_path || findProjectRoot(process.cwd()));
              for (const v of scoreComponents.violations.slice(0, 5)) {
                rl.recordFailure({
                  errorType: v.ruleId || v.id || 'guideline_violation',
                  description: `${path.basename(file_path || 'unknown')}: ${v.message || v.description || ''}`,
                  failureReason: `GICL session ended with score ${Math.round(score.final)}/100 after ${iteration} iterations: ${continueDecision.reason}`,
                  sessionId: String(dbSession.id),
                });
              }
              reflexionDb.close();
            } catch (reflexionErr) {
              logger.warn('Reflexion pattern recording failed (non-fatal)', {
                context: 'gicl-iteration-hook',
                error: reflexionErr.message,
              });
            }
          }
        } catch (completeErr) {
          logger.error('Failed to complete GICL session', { error: completeErr.message });
        }
      }
      // Effort scoring — recommend effort level based on file + task complexity
      const effortResult = calculateEffort({
        files: file_path ? [file_path] : [],
        taskDescription: dbSession.unit_name || '',
        hasFailureHistory: score.final < 60 && iteration > 1,
      });
      const effortGuidance = buildEffortGuidance(effortResult.level, effortResult.score);

      // Return after DB-driven iteration processing to prevent double-execution below
      const returnResult = {
        proceed: continueDecision.shouldContinue,
        message: continueDecision.shouldContinue
          ? `Iteration ${iteration} complete (score: ${Math.round(score.final)}/100) ${effortResult.symbol}`
          : `GICL session completed: ${continueDecision.reason}`,
        data: { score },
      };
      if (effortGuidance) {
        returnResult.hookSpecificOutput = {
          hookEventName: 'PostToolUse',
          additionalContext: effortGuidance,
        };
      }
      return returnResult;
    } catch (dbLookupErr) {
      // P3.2: DB unavailable — log warning and run lite mode as fallback
      logger.warn('GICL session lookup failed, using lite mode fallback', {
        context: 'gicl-iteration-hook',
        error: dbLookupErr.message,
      });
      return runLiteMode(file_path, content, project_path || findProjectRoot(process.cwd()));
    } finally {
      if (sessionManager) sessionManager.close();
    }
  }

  // Default: allow iteration to proceed
  const result = {
    proceed: true,
    message: null,
    data: {},
  };

  // Before iteration checks
  if (phase === 'before') {
    // Check if we should skip iteration
    const skipReason = await checkSkipConditions(session, iteration, project_path);
    if (skipReason) {
      wsEmitter.emitLog(`Skipping GICL iteration: ${skipReason}`, {
        level: 'warn',
        source: 'gicl-iteration-hook'
      });
      return {
        proceed: false,
        message: `Skipping iteration: ${skipReason}`,
        skipReason,
      };
    }

    // Log iteration start
    result.message = `Starting iteration ${iteration}/${session.maxIterations}`;
    result.data.startTime = Date.now();

    // Emit log event via WebSocket
    wsEmitter.emitLog(`Starting GICL iteration ${iteration}/${session.maxIterations}`, {
      level: 'info',
      source: 'gicl-iteration-hook'
    });
  }

  // After iteration checks - ENHANCED with requirements validation
  if (phase === 'after') {
    // Check for custom stop conditions
    const stopReason = await checkCustomStopConditions(session, iteration, score, project_path);
    if (stopReason) {
      return {
        proceed: false,
        message: `Custom stop condition triggered: ${stopReason}`,
        stopReason,
      };
    }

    // ENHANCEMENT: Dual validation (quality gates + requirements)
    const dualValidation = await performDualValidation(
      file_path,
      content,
      score,
      project_path
    );

    // Store tracking data if validation was performed
    if (dualValidation) {
      await trackFeatureProgress(dualValidation, project_path);
      await storeSuggestions(dualValidation.suggestions, project_path, dualValidation.filePath);
    }

    // Determine if loop should continue
    const shouldContinue = dualValidation
      ? dualValidation.hasViolations || dualValidation.hasIncompleteRequirements
      : score.final < 90;

    if (shouldContinue && dualValidation) {
      // Emit agent update for validation failure
      if (dualValidation.suggestions?.suggestions?.length > 0) {
        const suggestion = dualValidation.suggestions.suggestions[0];
        wsEmitter.emitAgentUpdate({
          agentIndex: 0,
          agentName: suggestion.agent?.name || 'GICL Validator',
          featureId: 1,
          featureName: dualValidation.filePath ? path.basename(dualValidation.filePath) : 'unknown',
          state: 'thinking',
          thought: `Validation failed: ${dualValidation.violations.length} violations, ${dualValidation.requirementResults.incomplete.length} incomplete requirements`,
          progress: Math.round(((iteration - 1) / session.maxIterations) * 100)
        });
      }

      return formatIterationStatus(iteration, score, session, dualValidation);
    }

    // Generate iteration summary
    result.message = formatIterationSummary(iteration, score, session, dualValidation);
    result.data.score = score;
    result.data.validation = dualValidation;

    // Save checkpoint after successful iteration
    await saveCheckpointAfterIteration(iteration, score, session, dualValidation, project_path);

    // Emit progress update via WebSocket
    const progress = Math.round((iteration / session.maxIterations) * 100);
    wsEmitter.emitProgress({
      passing: dualValidation?.progressPercentage === 100 ? 1 : 0,
      inProgress: dualValidation?.progressPercentage < 100 ? 1 : 0,
      total: 1,
      percentage: progress
    });

    wsEmitter.emitLog(`GICL iteration ${iteration}/${session.maxIterations} complete - Score: ${score.final}/100`, {
      level: 'info',
      source: 'gicl-iteration-hook'
    });
  }

  return result;
}

/**
 * Save checkpoint after successful GICL iteration
 *
 * @param {number} iteration - Iteration number
 * @param {Object} score - Score object
 * @param {Object} session - GICL session
 * @param {Object} validation - Validation results (optional)
 * @param {string} projectPath - Project path
 * @returns {Promise<void>}
 */
async function saveCheckpointAfterIteration(iteration, score, session, validation, projectPath) {
  try {
    // Determine phase/stage/unit from session or validation
    const phase = session.phase || 'CONSTRUCTION';
    const stage = session.stage || 'gicl-iteration';
    const unit = validation?.filePath ?
      path.basename(validation.filePath, path.extname(validation.filePath)) :
      session.unit || 'unknown';

    // Build state object
    const state = {
      session_id: session.sessionId || `gicl-${Date.now()}`,
      current_phase: phase,
      current_stage: stage,
      active_unit: unit,
      iteration_count: iteration,
      max_iterations: session.maxIterations,
      quality_gates: {
        tests_passed: score.tests >= 90,
        mock_detection_passed: score.mocks !== false,
        duplication_passed: score.duplication >= 70,
        final_score: score.final
      }
    };

    // Build context object
    const context = {
      last_file_modified: validation?.filePath || null,
      last_action: `Completed GICL iteration ${iteration}/${session.maxIterations}`,
      iteration_score: score.final,
      pending_items: [],
      active_agents: ['aicodepath-gicl-validator']
    };

    // Add validation details to context
    if (validation) {
      if (validation.hasViolations) {
        context.pending_items.push(`Fix ${validation.violations.length} violations`);
      }
      if (validation.hasIncompleteRequirements) {
        context.pending_items.push(`Complete ${validation.requirementResults.incomplete.length} requirements`);
      }
      if (validation.suggestions?.totalAgents > 0) {
        context.active_agents.push(...validation.suggestions.suggestions.slice(0, 3).map(s => s.agent.name));
      }
    }

    // Save checkpoint
    const checkpoint = saveCheckpoint(phase, stage, unit, state, context, projectPath);

    if (checkpoint) {
      logger.info('GICL checkpoint saved', {
        checkpointId: checkpoint.id,
        iteration,
        score: score.final
      });
    }

    // Also persist quality gates to session state so resume summary can read them
    try {
      const { SessionStateManager } = require('../lib/session-state-manager');
      const manager = new SessionStateManager(projectPath);
      manager.setState('quality_gates', state.quality_gates);
      manager.close();
    } catch (stateErr) {
      logger.debug('Could not persist quality gates to session state', { error: stateErr.message });
    }
  } catch (error) {
    logger.error('Failed to save GICL checkpoint', {
      error: error.message,
      iteration
    });
    // Non-fatal - don't throw
  }
}

/**
 * Check if iteration should be skipped
 * @param {Object} session - GICL session
 * @param {number} iteration - Iteration number
 * @param {string} projectPath - Project path
 * @returns {string|null} Skip reason or null
 */
async function checkSkipConditions(session, iteration, projectPath) {
  // Skip if already at max
  if (iteration > session.maxIterations) {
    return 'Maximum iterations reached';
  }

  // Check for skip file
  const fs = require('fs').promises;
  const skipFile = path.join(projectPath, '.gicl-skip');
  try {
    await fs.access(skipFile);
    return 'Skip file present (.gicl-skip)';
  } catch {
    // No skip file, continue
  }

  // Check for pause file
  const pauseFile = path.join(projectPath, '.gicl-pause');
  try {
    await fs.access(pauseFile);
    return 'Pause file present (.gicl-pause)';
  } catch {
    // No pause file, continue
  }

  return null;
}

/**
 * Check for custom stop conditions
 * @param {Object} session - GICL session
 * @param {number} iteration - Iteration number
 * @param {Object} score - Current score
 * @param {string} projectPath - Project path
 * @returns {string|null} Stop reason or null
 */
async function checkCustomStopConditions(session, iteration, score, projectPath) {
  // Check for stop file
  const fs = require('fs').promises;
  const stopFile = path.join(projectPath, '.gicl-stop');
  try {
    const content = await fs.readFile(stopFile, 'utf8');
    await fs.unlink(stopFile); // Remove after reading
    return content.trim() || 'Stop file detected';
  } catch {
    // No stop file, continue
  }

  // Custom score thresholds from config
  const config = await loadConfig(projectPath);
  if (config.customThresholds) {
    if (score.tests < (config.customThresholds.minTestScore || 0)) {
      return `Test score ${score.tests} below minimum ${config.customThresholds.minTestScore}`;
    }
    if (score.duplication < (config.customThresholds.minDuplicationScore || 0)) {
      return `Duplication score ${score.duplication} below minimum ${config.customThresholds.minDuplicationScore}`;
    }
  }

  // Check for repeated failures
  if (session.previousScores && session.previousScores.length >= 3) {
    const recent = session.previousScores.slice(-3);
    const allBelow60 = recent.every((s) => s < 60);
    if (allBelow60) {
      return 'Three consecutive iterations with score below 60';
    }
  }

  return null;
}

/**
 * Load GICL config from project
 * @param {string} projectPath - Project path
 * @returns {Object} Config object
 */
async function loadConfig(projectPath) {
  const fs = require('fs').promises;

  // Try .gicl.json
  try {
    const configPath = path.join(projectPath, '.gicl.json');
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch {
    // No config file
  }

  // Try .claude/settings.json
  try {
    const settingsPath = path.join(projectPath, '.claude', 'settings.json');
    const content = await fs.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(content);
    return settings.gicl || {};
  } catch {
    // No settings
  }

  return {};
}

/**
 * Perform dual validation: quality gates + requirements
 *
 * @param {string} filePath - File being validated
 * @param {string} content - File content
 * @param {Object} score - Current score
 * @param {string} projectPath - Project root
 * @returns {Promise<Object|null>} Validation results
 */
async function performDualValidation(filePath, content, score, projectPath) {
  // Skip if no file to validate
  if (!filePath || !content) {
    return null;
  }

  logger.info('Running dual validation', { filePath });

  const violations = [];
  const requirementResults = { incomplete: [], complete: [] };

  try {
    // 1. Run validation chain (check for violations in score)
    if (score.violations) {
      violations.push(...score.violations);
    }

    // 2. Find and parse design docs
    logger.info('Searching for design documents', { filePath });
    const designDocResults = await parseDesignDocsForFile(filePath, projectPath);

    const sources = designDocResults.sources || [];
    const criteria = designDocResults.criteria || designDocResults.requirements || [];
    const totalCount = designDocResults.totalCount || criteria.length;

    logger.info('Found design documents', {
      sources: sources.length,
      totalCriteria: totalCount
    });

    // 3. Verify implementation against criteria
    if (criteria.length > 0) {
      logger.info('Verifying implementation against requirements', { filePath });
      const verification = await verifyRequirements(
        criteria,
        filePath,
        projectPath
      );

      requirementResults.incomplete = verification.incomplete;
      requirementResults.complete = verification.complete;

      logger.info('Requirements verification complete', {
        complete: verification.completeCount,
        total: verification.totalCount,
        filePath
      });
    }

    // 4. Suggest agents for gaps
    logger.info('Generating agent suggestions', { filePath });
    const suggestions = await suggestAgents({
      violations,
      incompleteCriteria: requirementResults.incomplete,
      filePath
    });

    logger.info('Agent suggestions generated', {
      totalAgents: suggestions.totalAgents,
      filePath
    });

    return {
      filePath,
      violations,
      designDocs: designDocResults,
      requirementResults,
      suggestions,
      hasViolations: violations.length > 0,
      hasIncompleteRequirements: requirementResults.incomplete.length > 0,
      progressPercentage: designDocResults.progressPercentage
    };

  } catch (error) {
    logger.error('Error during dual validation', {
      error: error.message,
      filePath,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Track feature progress in database
 *
 * @param {Object} validation - Validation results
 * @param {string} projectPath - Project root
 * @returns {Promise<void>}
 */
async function trackFeatureProgress(validation, projectPath) {
  try {
    const Database = require('better-sqlite3');
    const dbPath = getDbPath();

    // Check if database exists
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
      logger.warn('Database not found, skipping feature tracking', { dbPath });
      return;
    }

    const db = new Database(dbPath);

    const featureName = path.basename(validation.filePath, path.extname(validation.filePath));
    const ddSources = (validation.designDocs && validation.designDocs.sources) || [];
    const designDocPath = ddSources.length > 0 ? ddSources[0].path : null;

    const totalCriteria = (validation.designDocs && validation.designDocs.totalCount) || 0;
    const completedCriteria = (validation.designDocs && validation.designDocs.completedCount) || 0;
    const progressPercentage = validation.progressPercentage;

    const status = progressPercentage === 100 ? 'complete' :
                   validation.hasViolations ? 'blocked' : 'in_progress';

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO gicl_feature_tracking
      (feature_name, design_doc_path, total_criteria, completed_criteria, progress_percentage, status, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(featureName, designDocPath, totalCriteria, completedCriteria, progressPercentage, status);

    db.close();

    logger.info('Tracked feature progress', {
      feature: featureName,
      progress: progressPercentage
    });
  } catch (error) {
    logger.error('Error tracking feature progress', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Store agent suggestions in database
 *
 * @param {Object} suggestions - Suggestion results
 * @param {string} projectPath - Project root
 * @param {string} filePath - File being validated (optional)
 * @returns {Promise<void>}
 */
async function storeSuggestions(suggestions, projectPath, filePath = null) {
  if (!suggestions || suggestions.totalAgents === 0) {
    return;
  }

  try {
    const Database = require('better-sqlite3');
    const dbPath = getDbPath();

    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
      logger.warn('Database not found, skipping suggestion storage', { dbPath });
      return;
    }

    const db = new Database(dbPath);

    // Get the most recent feature tracking ID
    const featureRow = db.prepare(`
      SELECT id FROM gicl_feature_tracking
      ORDER BY last_updated DESC
      LIMIT 1
    `).get();

    const featureId = featureRow ? featureRow.id : null;

    const stmt = db.prepare(`
      INSERT INTO gicl_suggestions
      (feature_id, suggestion_type, requirement_text, violation_message, severity, suggested_agents, file_path, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    // Store top suggestions
    for (const suggestion of suggestions.suggestions.slice(0, 5)) {
      for (const source of suggestion.sources) {
        const suggestionType = source.type === 'violation' ? 'quality_gate' : 'missing_requirement';
        const requirementText = source.type === 'requirement' ? source.reason : null;
        const violationMessage = source.type === 'violation' ? source.reason : null;
        const severity = source.severity || 'medium';
        const suggestedAgents = JSON.stringify([suggestion.agent.name]);

        stmt.run(
          featureId,
          suggestionType,
          requirementText,
          violationMessage,
          severity,
          suggestedAgents,
          filePath
        );
      }
    }

    db.close();

    logger.info('Stored agent suggestions', {
      totalAgents: suggestions.totalAgents
    });
  } catch (error) {
    logger.error('Error storing suggestions', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Format iteration status with validation details
 *
 * @param {number} iteration - Iteration number
 * @param {Object} score - Score object
 * @param {Object} session - GICL session
 * @param {Object} validation - Validation results
 * @returns {Object} Status result
 */
function formatIterationStatus(iteration, score, session, validation) {
  const lines = [];

  lines.push(`\nIteration ${iteration}/${session.maxIterations} - Continue Required`);
  lines.push('═'.repeat(60));

  // Quality Gates
  lines.push('\n## Quality Gates');
  lines.push(`Score: ${score.final}/100 (threshold: 90)`);

  if (validation.hasViolations) {
    lines.push(`\nViolations found: ${validation.violations.length}`);
    validation.violations.slice(0, 5).forEach(v => {
      lines.push(`  - [${v.severity}] ${v.message}`);
    });
    if (validation.violations.length > 5) {
      lines.push(`  ... and ${validation.violations.length - 5} more`);
    }
  }

  // Requirements Completion
  const ddTotalCount = (validation.designDocs && validation.designDocs.totalCount) || 0;
  const ddCompletedCount = (validation.designDocs && validation.designDocs.completedCount) || 0;
  lines.push('\n## Requirements Completion');
  if (ddTotalCount > 0) {
    lines.push(`Progress: ${validation.progressPercentage || 0}% complete`);
    lines.push(`Verified: ${ddCompletedCount}/${ddTotalCount} criteria`);

    if (validation.hasIncompleteRequirements) {
      lines.push(`\nIncomplete requirements: ${validation.requirementResults.incomplete.length}`);
      validation.requirementResults.incomplete.slice(0, 3).forEach(r => {
        lines.push(`  - ${r.requirement} (confidence: ${r.confidence})`);
      });
      if (validation.requirementResults.incomplete.length > 3) {
        lines.push(`  ... and ${validation.requirementResults.incomplete.length - 3} more`);
      }
    }
  } else {
    lines.push('No design documents found - cannot verify requirements');
  }

  // Agent Suggestions
  if (validation.suggestions.totalAgents > 0) {
    lines.push('\n## Recommended Agents');
    validation.suggestions.suggestions.slice(0, 3).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.agent.name} - ${s.agent.description}`);
    });
  }

  lines.push('\n' + '═'.repeat(60));
  lines.push('Action: Fix violations and complete requirements before next iteration\n');

  return {
    proceed: false,
    message: lines.join('\n'),
    data: {
      score,
      validation,
      iteration
    }
  };
}

/**
 * Format iteration summary
 * @param {number} iteration - Iteration number
 * @param {Object} score - Score object
 * @param {Object} session - GICL session
 * @param {Object} validation - Validation results (optional)
 * @returns {string} Formatted summary
 */
function formatIterationSummary(iteration, score, session, validation = null) {
  const lines = [];

  lines.push(`\nIteration ${iteration}/${session.maxIterations} Complete`);
  lines.push('─'.repeat(40));

  // Score summary
  lines.push(`Final Score: ${score.final}/100`);

  // Component scores
  if (score.tests !== undefined) lines.push(`  Tests: ${score.tests}/100`);
  if (score.guidelines !== undefined) lines.push(`  Guidelines: ${score.guidelines}/100`);
  if (score.architecture !== undefined) lines.push(`  Architecture: ${score.architecture}/100`);
  if (score.duplication !== undefined) lines.push(`  Duplication: ${score.duplication}/100`);

  // Requirements completion (if available)
  const summaryTotalCount = (validation && validation.designDocs && validation.designDocs.totalCount) || 0;
  if (summaryTotalCount > 0) {
    const summaryCompletedCount = (validation.designDocs && validation.designDocs.completedCount) || 0;
    lines.push(`\nRequirements: ${validation.progressPercentage || 0}% complete`);
    lines.push(`  Verified: ${summaryCompletedCount}/${summaryTotalCount}`);
  }

  // Progress indicator
  const progress = Math.round((iteration / session.maxIterations) * 100);
  const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
  lines.push(`\nProgress: [${bar}] ${progress}%`);

  // Score trend
  if (session.previousScores && session.previousScores.length > 0) {
    const prevScore = session.previousScores[session.previousScores.length - 1];
    const diff = score.final - prevScore;
    const trend = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    lines.push(`Trend: ${trend} ${diff > 0 ? '+' : ''}${diff} from last iteration`);
  }

  // Status
  const allComplete = score.final >= 90 &&
                     (!validation || validation.progressPercentage === 100);

  if (allComplete) {
    lines.push('\n✓ Feature complete! All quality gates passed and requirements verified.');
  } else if (score.final >= 90) {
    lines.push('\n✓ Score meets passing threshold (90)');
    if (validation && validation.progressPercentage < 100) {
      lines.push(`⚠ Requirements incomplete: ${validation.progressPercentage}%`);
    }
  } else {
    const needed = 90 - score.final;
    lines.push(`\n⚠ Need ${needed} more points to pass`);
  }

  return lines.join('\n');
}

/**
 * Get iteration progress for display
 * @param {Object} session - GICL session
 * @returns {Object} Progress data
 */
function getIterationProgress(session) {
  return {
    current: session.currentIteration,
    max: session.maxIterations,
    percent: Math.round((session.currentIteration / session.maxIterations) * 100),
    remaining: session.maxIterations - session.currentIteration,
    lastScore: session.lastScore,
    status: session.status,
  };
}

/**
 * Format progress bar for CLI display
 * @param {number} percent - Percentage 0-100
 * @param {number} width - Bar width in characters
 * @returns {string} Progress bar string
 */
function formatProgressBar(percent, width = 20) {
  const filled = Math.floor((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`;
}

/**
 * Create iteration boundary log entry
 * @param {string} phase - 'start' or 'end'
 * @param {number} iteration - Iteration number
 * @param {Object} data - Additional data
 * @returns {Object} Log entry
 */
function createLogEntry(phase, iteration, data = {}) {
  return {
    timestamp: new Date().toISOString(),
    phase,
    iteration,
    ...data,
  };
}

/**
 * Collect score components by running guideline validation programmatically.
 *
 * @param {string} filePath - File being validated
 * @param {string} fileContent - File content
 * @param {string} projectPath - Project root
 * @returns {Promise<Object>} Score components (tests, guidelines, architecture, duplication, authenticity)
 */
async function collectScoreComponents(filePath, fileContent, projectPath) {
  const components = {
    tests: null,       // null = not measured, defaults to 100 in weighted calc
    guidelines: 100,
    architecture: 100,
    duplication: 100,
    authenticity: 100,
    violations: [],
  };

  if (!filePath || !fileContent) return components;

  try {
    const { validateContent } = require('./guideline-validator');
    const validationResult = await validateContent(fileContent, filePath, projectPath);

    const errorCount = validationResult.errorCount || 0;
    const warningCount = validationResult.warningCount || 0;
    components.guidelines = Math.max(0, 100 - (errorCount * 10) - (warningCount * 3));
    components.violations = validationResult.violations || [];

    // Authenticity from guideline validator
    if (validationResult.authenticity && validationResult.authenticity.score != null) {
      components.authenticity = validationResult.authenticity.score;
    }
  } catch (validationErr) {
    logger.warn('Guideline validation failed during GICL scoring', {
      error: validationErr.message,
      filePath,
    });
  }

  return components;
}

module.exports = {
  hook: ErrorHandler.wrapHook('gicl-iteration-hook', giclIterationHookImpl),
  checkSkipConditions,
  checkCustomStopConditions,
  loadConfig,
  formatIterationSummary,
  formatIterationStatus,
  performDualValidation,
  trackFeatureProgress,
  storeSuggestions,
  saveCheckpointAfterIteration,
  getIterationProgress,
  formatProgressBar,
  createLogEntry,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(giclIterationHookImpl, { name: 'gicl-iteration-hook' });
}
