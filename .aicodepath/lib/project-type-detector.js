#!/usr/bin/env node
/**
 * Project Type Detector
 *
 * Detects whether a project is brownfield (existing codebase) or greenfield (new/empty).
 * Used for automatic workflow routing to appropriate AIDLC phase.
 *
 * Detection Logic:
 * - Brownfield: >5 source code files in common locations (src/, lib/, api/, *.sql)
 * - Greenfield: Minimal or no source code files
 *
 * @module lib/project-type-detector
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const logger = require('./logger');

/**
 * Source code file patterns to check for brownfield detection
 */
const SOURCE_CODE_PATTERNS = [
  'src/**/*.{js,ts,py,java,go,rb,php,cs,cpp,c,h,rs}',
  'lib/**/*.{js,ts,py,java,go}',
  'api/**/*.{js,ts,py,java,go}',
  'app/**/*.{js,ts,py,java,go,rb,php}',
  'backend/**/*.{js,ts,py,java,go}',
  'frontend/**/*.{js,ts,jsx,tsx,vue}',
  'server/**/*.{js,ts,py,java,go}',
  '*.sql',
  'migrations/**/*.sql',
  'db/**/*.sql'
];

/**
 * Build system indicators for brownfield projects
 */
const BUILD_SYSTEM_INDICATORS = [
  'package.json',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Cargo.toml',
  'go.mod',
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  'Gemfile',
  'composer.json'
];

/**
 * Common directories that ignore (node_modules, .git, etc.)
 */
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/target/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/vendor/**',
  '**/__pycache__/**',
  '**/.pytest_cache/**',
  '**/coverage/**'
];

/**
 * Detect if project is brownfield (existing codebase) or greenfield (new/empty)
 *
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Detection result with type, confidence, and details
 */
function detectProjectType(projectRoot) {
  const result = {
    type: 'greenfield', // Default to greenfield
    confidence: 0,
    sourceFiles: 0,
    languages: new Set(),
    buildSystems: [],
    details: {}
  };

  try {
    // Check for build system indicators
    for (const indicator of BUILD_SYSTEM_INDICATORS) {
      const indicatorPath = path.join(projectRoot, indicator);
      if (fs.existsSync(indicatorPath)) {
        result.buildSystems.push(indicator);
      }
    }

    // Count source code files by pattern
    let totalSourceFiles = 0;
    const filesByPattern = {};

    for (const pattern of SOURCE_CODE_PATTERNS) {
      try {
        const files = glob.sync(pattern, {
          cwd: projectRoot,
          ignore: IGNORE_PATTERNS,
          nodir: true
        });

        filesByPattern[pattern] = files.length;
        totalSourceFiles += files.length;

        // Extract language from files
        files.forEach(file => {
          const ext = path.extname(file).slice(1);
          if (ext) {
            result.languages.add(ext);
          }
        });
      } catch (err) {
        logger.warn(`Error checking pattern ${pattern}: ${err.message}`, {
          context: 'project-type-detector'
        });
      }
    }

    result.sourceFiles = totalSourceFiles;
    result.details.filesByPattern = filesByPattern;

    // Determine project type based on source file count
    // Threshold: >5 source files = brownfield
    if (totalSourceFiles > 5) {
      result.type = 'brownfield';
      result.confidence = Math.min(100, 50 + totalSourceFiles * 2); // Higher confidence with more files
    } else if (totalSourceFiles > 0) {
      // 1-5 files: likely greenfield with starter code
      result.type = 'greenfield';
      result.confidence = 70;
    } else if (result.buildSystems.length > 0) {
      // Build system but no code: initialized greenfield
      result.type = 'greenfield';
      result.confidence = 80;
    } else {
      // Empty project
      result.type = 'greenfield';
      result.confidence = 90;
    }

    // Convert languages Set to Array for serialization
    result.languages = Array.from(result.languages);

    logger.info('Project type detected', {
      context: 'project-type-detector',
      type: result.type,
      confidence: result.confidence,
      sourceFiles: result.sourceFiles,
      languages: result.languages,
      buildSystems: result.buildSystems
    });

    return result;
  } catch (err) {
    logger.error('Failed to detect project type', {
      context: 'project-type-detector',
      error: err.message,
      stack: err.stack
    });

    // Fallback to greenfield on error
    return {
      type: 'greenfield',
      confidence: 50,
      sourceFiles: 0,
      languages: [],
      buildSystems: [],
      details: { error: err.message }
    };
  }
}

/**
 * Check if project has reverse engineering artifacts
 *
 * @param {string} projectRoot - Project root directory
 * @returns {boolean} True if reverse engineering artifacts exist
 */
function hasReverseEngineeringArtifacts(projectRoot) {
  const reverseEngDir = path.join(
    projectRoot,
    'aicodepath-docs',
    'inception',
    'reverse-engineering'
  );

  if (!fs.existsSync(reverseEngDir)) {
    return false;
  }

  try {
    const files = fs.readdirSync(reverseEngDir);
    // Consider it has artifacts if there are any markdown files
    const hasArtifacts = files.some(file => file.endsWith('.md'));

    logger.info('Reverse engineering artifacts check', {
      context: 'project-type-detector',
      hasArtifacts,
      fileCount: files.length
    });

    return hasArtifacts;
  } catch (err) {
    logger.error('Failed to check reverse engineering artifacts', {
      context: 'project-type-detector',
      error: err.message
    });
    return false;
  }
}

/**
 * Determine appropriate starting phase based on project type and state
 *
 * @param {string} projectRoot - Project root directory
 * @param {Object} detectionResult - Result from detectProjectType()
 * @returns {Object} Recommended starting phase and reason
 */
function determineStartingPhase(projectRoot, detectionResult) {
  const result = {
    phase: 'PRE-FLIGHT',
    reason: '',
    skipTo: null
  };

  if (detectionResult.type === 'greenfield') {
    // Greenfield: Start with requirements gathering
    result.phase = 'PRE-FLIGHT';
    result.reason = 'New project - starting with requirements gathering';
  } else {
    // Brownfield: Check for reverse engineering artifacts
    const hasReverseEng = hasReverseEngineeringArtifacts(projectRoot);

    if (hasReverseEng) {
      // Reverse engineering already done, skip to requirements
      result.phase = 'INCEPTION';
      result.reason = 'Existing codebase with reverse engineering artifacts - starting with requirements analysis';
      result.skipTo = 'requirements-analysis';
    } else {
      // Need reverse engineering first
      result.phase = 'INCEPTION';
      result.reason = 'Existing codebase detected - starting with reverse engineering';
      result.skipTo = 'reverse-engineering';
    }
  }

  logger.info('Starting phase determined', {
    context: 'project-type-detector',
    phase: result.phase,
    reason: result.reason,
    skipTo: result.skipTo
  });

  return result;
}

module.exports = {
  detectProjectType,
  hasReverseEngineeringArtifacts,
  determineStartingPhase
};
