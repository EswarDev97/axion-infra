/**
 * Requirements Parser
 * Parses design documents to extract success criteria and requirements
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../lib/logger');

/**
 * Parse design documents for a given file to extract requirements
 * @param {string} filePath - Path to code file
 * @param {string} projectRoot - Project root directory
 * @returns {Object} - Parsed requirements with metadata
 */
function parseDesignDocsForFile(filePath, projectRoot) {
  const result = {
    filePath,
    unit: null,
    requirements: [],
    designDocs: [],
    phase: null
  };

  try {
    // Determine unit from file path
    // Example: src/auth/login.ts -> unit: auth
    const relativePath = path.relative(projectRoot, filePath);
    const pathParts = relativePath.split(path.sep);

    // Common unit detection patterns
    if (pathParts.includes('src') || pathParts.includes('lib')) {
      const srcIndex = pathParts.indexOf('src') || pathParts.indexOf('lib');
      if (pathParts.length > srcIndex + 1) {
        result.unit = pathParts[srcIndex + 1];
      }
    }

    if (!result.unit) {
      // Fallback: use first directory after root
      result.unit = pathParts[0] || 'default';
    }

    // Find design docs for this unit
    const docsDir = path.join(projectRoot, 'aicodepath-docs');

    // Search in construction phase directories
    const constructionDir = path.join(docsDir, 'construction', result.unit);
    if (fs.existsSync(constructionDir)) {
      result.phase = 'construction';
      result.designDocs = findDesignDocs(constructionDir);
      result.requirements = extractRequirements(result.designDocs);
    }

    // Also check inception phase
    const inceptionDir = path.join(docsDir, 'inception');
    if (fs.existsSync(inceptionDir)) {
      if (!result.phase) result.phase = 'inception';
      const inceptionDocs = findDesignDocs(inceptionDir);
      result.designDocs = [...result.designDocs, ...inceptionDocs];
      result.requirements = [...result.requirements, ...extractRequirements(inceptionDocs)];
    }

  } catch (error) {
    logger.error('Error parsing design docs', {
      error: error.message,
      filePath,
      stack: error.stack
    });
  }

  // Calculate progress metrics expected by gicl-iteration-hook
  const totalCount = result.requirements.length;
  const completedCount = result.requirements.filter(r => r.completed).length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const uniqueSources = [...new Set(result.designDocs)];

  return {
    ...result,
    criteria: result.requirements,
    sources: uniqueSources.map(p => ({ path: p, type: 'design_doc' })),
    totalCount,
    completedCount,
    progressPercentage
  };
}

/**
 * Find all design document files in a directory
 * @param {string} dir - Directory to search
 * @returns {Array} - List of design doc file paths
 */
function findDesignDocs(dir) {
  const designDocs = [];

  try {
    // Common design doc directories
    const designDirs = [
      'functional-design',
      'nfr-design',
      'database-design',
      'auth-design',
      'api-gateway-design',
      'requirements',
      'user-stories'
    ];

    for (const designDir of designDirs) {
      const fullPath = path.join(dir, designDir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            designDocs.push(path.join(fullPath, file));
          }
        }
      }
    }

    // Also check root of dir
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          designDocs.push(path.join(dir, file));
        }
      }
    }

  } catch (error) {
    logger.error('Error finding design docs', {
      error: error.message,
      dir,
      stack: error.stack
    });
  }

  return designDocs;
}

/**
 * Extract requirements from design documents
 * @param {Array} designDocPaths - List of design doc file paths
 * @returns {Array} - List of requirement objects
 */
function extractRequirements(designDocPaths) {
  const requirements = [];

  for (const docPath of designDocPaths) {
    try {
      const content = fs.readFileSync(docPath, 'utf-8');

      // Find "## Success Criteria" or similar sections
      const sections = [
        /##\s*Success Criteria\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i,
        /##\s*Requirements\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i,
        /##\s*Acceptance Criteria\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i,
        /##\s*Functional Requirements\s*\n([\s\S]*?)(?=\n##|\n---|\Z)/i
      ];

      for (const sectionRegex of sections) {
        const match = content.match(sectionRegex);
        if (match && match[1]) {
          const sectionContent = match[1];

          // Extract checklist items: - [ ] or - [x]
          const checklistRegex = /^[\s]*-\s*\[([ xX])\]\s*(.+)$/gm;
          let checkMatch;

          while ((checkMatch = checklistRegex.exec(sectionContent)) !== null) {
            const isCompleted = checkMatch[1].toLowerCase() === 'x';
            const text = checkMatch[2].trim();

            requirements.push({
              text,
              completed: isCompleted,
              source: docPath,
              type: 'success_criteria'
            });
          }

          // Also extract non-checklist requirements (bullet points)
          const bulletRegex = /^[\s]*[-*]\s+(?!\[)(.+)$/gm;
          let bulletMatch;

          while ((bulletMatch = bulletRegex.exec(sectionContent)) !== null) {
            const text = bulletMatch[1].trim();

            requirements.push({
              text,
              completed: false,
              source: docPath,
              type: 'requirement'
            });
          }
        }
      }

    } catch (error) {
      logger.error('Error extracting requirements', {
        error: error.message,
        docPath,
        stack: error.stack
      });
    }
  }

  return requirements;
}

/**
 * Extract searchable keywords from requirement text
 * @param {string} requirementText - Requirement text to parse
 * @returns {Array} - List of keywords for code searching
 */
function extractKeywords(requirementText) {
  if (!requirementText || typeof requirementText !== 'string') {
    return [];
  }

  // Common stopwords to exclude from keyword extraction
  const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should',
    'now', 'be', 'is', 'are', 'was', 'were', 'been', 'being', 'have',
    'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall'
  ]);

  // Normalize text
  const normalized = requirementText.toLowerCase()
    // Remove special characters but keep hyphens and underscores
    .replace(/[^\w\s-]/g, ' ')
    // Split into words
    .split(/\s+/)
    // Filter out empty strings and stopwords
    .filter(word => word.length > 2 && !stopwords.has(word));

  // Remove duplicates and return
  return [...new Set(normalized)];
}

module.exports = {
  parseDesignDocsForFile,
  findDesignDocs,
  extractRequirements,
  extractKeywords
};
