#!/usr/bin/env node
/**
 * Implementation Verifier
 *
 * Verifies if requirements from design documents are actually implemented
 * in the codebase using keyword/pattern matching.
 *
 * @module hooks/lib/implementation-verifier
 */

const fs = require('fs').promises;
const path = require('path');
const { extractKeywords } = require('./requirements-parser');

/**
 * Domain-specific patterns for common requirements
 */
const PATTERN_LIBRARY = {
  // Authentication patterns
  'jwt': [
    'jwt\\.sign',
    'jsonwebtoken',
    'generateToken',
    'createToken',
    'signToken'
  ],
  'token': [
    'jwt',
    'token',
    'bearer',
    'authorization'
  ],
  'login': [
    'POST\\s+[\'"`]/auth/login',
    'login\\(',
    'authenticate\\(',
    'signin',
    'loginUser'
  ],
  'password': [
    'bcrypt',
    'argon2',
    'scrypt',
    'hashPassword',
    'comparePassword',
    'passwordHash'
  ],
  'hash': [
    'bcrypt\\.hash',
    'argon2\\.hash',
    'crypto\\.createHash',
    'hashPassword'
  ],

  // Database patterns
  'database': [
    'new\\s+Database',
    'createConnection',
    'sequelize',
    'typeorm',
    'mongoose',
    'prisma'
  ],
  'migration': [
    'createTable',
    'addColumn',
    'migration',
    'up\\(\\)',
    'down\\(\\)'
  ],
  'query': [
    '\\.query\\(',
    '\\.execute\\(',
    'SELECT\\s+',
    'INSERT\\s+',
    'UPDATE\\s+'
  ],

  // API patterns
  'endpoint': [
    'app\\.get',
    'app\\.post',
    'app\\.put',
    'app\\.delete',
    'router\\.',
    '@Get',
    '@Post',
    '@Put',
    '@Delete'
  ],
  'rest': [
    'express',
    'fastify',
    'koa',
    '@Controller',
    'router'
  ],
  'validation': [
    'validate',
    'zod',
    'joi',
    'yup',
    'class-validator',
    '@IsString',
    '@IsNumber'
  ],

  // Testing patterns
  'test': [
    'describe\\(',
    'it\\(',
    'test\\(',
    'expect\\(',
    'assert'
  ],
  'unittest': [
    'describe\\(',
    'it\\(',
    'test\\(',
    'beforeEach',
    'afterEach'
  ],
  'mock': [
    'jest\\.mock',
    'vi\\.mock',
    'sinon',
    'createMock'
  ],

  // Security patterns
  'encryption': [
    'crypto\\.encrypt',
    'aes',
    'encrypt\\(',
    'cipher'
  ],
  'csrf': [
    'csrf',
    'csurf',
    'csrfToken'
  ],
  'cors': [
    'cors\\(',
    'Access-Control-Allow'
  ],
  'sanitize': [
    'sanitize',
    'xss',
    'escapeHtml',
    'validator\\.escape'
  ],

  // Error handling patterns
  'errorhandling': [
    'try\\s*\\{',
    'catch\\s*\\(',
    '\\.catch\\(',
    'throw\\s+new\\s+Error',
    'ErrorHandler'
  ],
  'logging': [
    'logger\\.',
    'console\\.log',
    'winston',
    'pino',
    'log4js'
  ],

  // Performance patterns
  'cache': [
    'redis',
    'memcached',
    'cache\\.set',
    'cache\\.get',
    '@Cacheable'
  ],
  'async': [
    'async\\s+function',
    'await\\s+',
    'Promise',
    '\\.then\\('
  ]
};

/**
 * Get relevant patterns for a requirement text
 *
 * @param {string} requirementText - Requirement text
 * @returns {string[]} Array of regex patterns
 */
function getPatterns(requirementText) {
  const text = requirementText.toLowerCase();
  const patterns = [];

  // Check for domain keywords
  for (const [domain, domainPatterns] of Object.entries(PATTERN_LIBRARY)) {
    if (text.includes(domain)) {
      patterns.push(...domainPatterns);
    }
  }

  // Extract keywords and create basic patterns
  const keywords = extractKeywords(requirementText);
  keywords.forEach(keyword => {
    // Add word boundary patterns for keywords
    patterns.push(`\\b${keyword}\\b`);
  });

  return [...new Set(patterns)];
}

/**
 * Search file for patterns
 *
 * @param {string} filePath - File to search
 * @param {string[]} patterns - Regex patterns
 * @returns {Promise<Object[]>} Array of matches
 */
async function searchFileForPatterns(filePath, patterns) {
  const matches = [];

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');

    patterns.forEach(pattern => {
      try {
        const regex = new RegExp(pattern, 'gi');

        lines.forEach((line, index) => {
          const match = line.match(regex);
          if (match) {
            matches.push({
              file: filePath,
              line: index + 1,
              text: line.trim(),
              pattern,
              match: match[0]
            });
          }
        });
      } catch (e) {
        // Invalid regex pattern, skip
      }
    });
  } catch (e) {
    // File not readable
  }

  return matches;
}

/**
 * Get relevant files to search based on current file path
 *
 * @param {string} filePath - Current file path
 * @param {string} projectPath - Project root
 * @returns {Promise<string[]>} Array of file paths to search
 */
async function getRelevantFiles(filePath, projectPath) {
  const files = [filePath]; // Always include the current file

  // Get the module directory
  const fileDir = path.dirname(filePath);
  const moduleName = path.basename(fileDir);

  try {
    // Add all files in the same directory
    const entries = await fs.readdir(fileDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && isCodeFile(entry.name)) {
        const fullPath = path.join(fileDir, entry.name);
        if (fullPath !== filePath) {
          files.push(fullPath);
        }
      }
    }

    // Add related test files
    const testDirs = [
      path.join(fileDir, '__tests__'),
      path.join(fileDir, 'tests'),
      path.join(projectPath, 'test', moduleName),
      path.join(projectPath, 'tests', moduleName)
    ];

    for (const testDir of testDirs) {
      try {
        const testEntries = await fs.readdir(testDir, { withFileTypes: true });
        for (const entry of testEntries) {
          if (entry.isFile() && isCodeFile(entry.name)) {
            files.push(path.join(testDir, entry.name));
          }
        }
      } catch (e) {
        // Test directory doesn't exist
      }
    }
  } catch (e) {
    // Directory not readable
  }

  return [...new Set(files)];
}

/**
 * Check if file is a code file
 *
 * @param {string} filename - File name
 * @returns {boolean} True if code file
 */
function isCodeFile(filename) {
  const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs'];
  return codeExtensions.some(ext => filename.endsWith(ext));
}

/**
 * Calculate confidence score for verification
 *
 * @param {Object[]} matches - Array of matches
 * @param {string[]} patterns - Patterns searched
 * @returns {number} Confidence score 0.0-1.0
 */
function calculateConfidence(matches, patterns) {
  if (matches.length === 0) {
    return 0.0;
  }

  // Count unique patterns matched
  const uniquePatterns = new Set(matches.map(m => m.pattern));
  const patternCoverage = uniquePatterns.size / Math.max(patterns.length, 1);

  // Count total matches (more matches = higher confidence)
  const matchCount = matches.length;
  const matchScore = Math.min(matchCount / 5, 1.0); // Cap at 5 matches

  // Weight pattern coverage more heavily
  const confidence = (patternCoverage * 0.7) + (matchScore * 0.3);

  return Math.round(confidence * 100) / 100;
}

/**
 * Verify a single requirement
 *
 * @param {Object} requirement - Requirement object
 * @param {string} filePath - File being validated
 * @param {string} projectPath - Project root
 * @returns {Promise<Object>} Verification result
 */
async function verifyRequirement(requirement, filePath, projectPath) {
  const patterns = getPatterns(requirement.text);
  const files = await getRelevantFiles(filePath, projectPath);

  const allMatches = [];

  for (const file of files) {
    const matches = await searchFileForPatterns(file, patterns);
    allMatches.push(...matches);
  }

  const confidence = calculateConfidence(allMatches, patterns);

  // Consider verified if confidence > 0.5 OR already checked
  const verified = confidence > 0.5 || requirement.checked;

  return {
    requirement: requirement.text,
    verified,
    confidence,
    alreadyChecked: requirement.checked,
    evidence: allMatches.map(m => ({
      file: path.relative(projectPath, m.file),
      line: m.line,
      match: m.match,
      context: m.text
    })),
    patternsSearched: patterns.length,
    filesSearched: files.length
  };
}

/**
 * Verify multiple requirements
 *
 * @param {Object[]} requirements - Array of requirement objects
 * @param {string} filePath - File being validated
 * @param {string} projectPath - Project root
 * @returns {Promise<Object>} Verification results
 */
async function verifyRequirements(requirements, filePath, projectPath) {
  const results = [];
  const incomplete = [];
  const complete = [];

  for (const requirement of requirements) {
    const result = await verifyRequirement(requirement, filePath, projectPath);
    results.push(result);

    if (result.verified) {
      complete.push(result);
    } else {
      incomplete.push(result);
    }
  }

  const totalCount = requirements.length;
  const completeCount = complete.length;
  const incompleteCount = incomplete.length;

  return {
    results,
    complete,
    incomplete,
    totalCount,
    completeCount,
    incompleteCount,
    progressPercentage: totalCount > 0
      ? Math.round((completeCount / totalCount) * 100)
      : 100
  };
}

/**
 * Auto-update checkboxes in design docs for verified requirements
 *
 * @param {Object[]} verificationResults - Verification results
 * @param {number} confidenceThreshold - Minimum confidence to auto-check (default 0.8)
 * @returns {Promise<Object>} Update summary
 */
async function autoUpdateCheckboxes(verificationResults, confidenceThreshold = 0.8) {
  const updated = [];
  const skipped = [];

  for (const result of verificationResults) {
    if (result.verified &&
        result.confidence >= confidenceThreshold &&
        !result.alreadyChecked) {

      // Find the original requirement to get source path and line
      const requirement = verificationResults.find(r => r.requirement === result.requirement);
      if (requirement && requirement.sourcePath && requirement.line) {
        const success = await updateCheckbox(requirement.sourcePath, requirement.line, true);

        if (success) {
          updated.push({
            requirement: result.requirement,
            file: requirement.sourcePath,
            line: requirement.line,
            confidence: result.confidence
          });
        } else {
          skipped.push({ requirement: result.requirement, reason: 'Update failed' });
        }
      }
    } else if (result.verified && result.confidence < confidenceThreshold) {
      skipped.push({
        requirement: result.requirement,
        reason: `Confidence ${result.confidence} below threshold ${confidenceThreshold}`
      });
    }
  }

  return {
    updated,
    skipped,
    updateCount: updated.length,
    skipCount: skipped.length
  };
}

module.exports = {
  getPatterns,
  searchFileForPatterns,
  getRelevantFiles,
  calculateConfidence,
  verifyRequirement,
  verifyRequirements,
  autoUpdateCheckboxes,
  PATTERN_LIBRARY
};

// Allow standalone execution for testing
if (require.main === module) {
  (async () => {
    const testRequirement = {
      text: 'User can login with email and password using JWT tokens',
      checked: false
    };

    const testFile = process.argv[2] || 'src/auth/login.ts';
    const projectPath = process.cwd();

    console.log(`Verifying requirement: "${testRequirement.text}"\n`);
    console.log(`Target file: ${testFile}\n`);

    const result = await verifyRequirement(testRequirement, testFile, projectPath);

    console.log(`Verified: ${result.verified}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Patterns searched: ${result.patternsSearched}`);
    console.log(`Files searched: ${result.filesSearched}\n`);

    if (result.evidence.length > 0) {
      console.log('Evidence found:\n');
      result.evidence.forEach((evidence, index) => {
        console.log(`${index + 1}. ${evidence.file}:${evidence.line}`);
        console.log(`   Match: "${evidence.match}"`);
        console.log(`   Context: ${evidence.context}\n`);
      });
    } else {
      console.log('No evidence found. Requirement may not be implemented.\n');
    }
  })().catch(console.error);
}
