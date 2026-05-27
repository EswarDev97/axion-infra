#!/usr/bin/env node
/**
 * AICodePath Guideline Validator Hook
 *
 * Pre-tool-use hook that validates code against guidelines before Write/Edit operations.
 * Blocks writes that contain error-level violations.
 */

const fs = require('fs').promises;
const path = require('path');
const { guidelines, findProjectRoot } = require('../lib/path-resolver');
const ValidationStorageFactory = require('../lib/validation-storage-factory');
const logger = require('../lib/logger');

// Preferences file lives in aicodepath-docs/ (runtime artifact), not .aicodepath/ (framework source)
const PREFERENCES_RELATIVE_PATH = path.join('aicodepath-docs', 'preferences', 'project-preferences.json');

/**
 * Load project preference rules from preferences/project-preferences.json
 */
async function loadPreferences(projectPath) {
  try {
    const root = projectPath || findProjectRoot();
    const raw = await fs.readFile(path.join(root, PREFERENCES_RELATIVE_PATH), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Filter enabled preference rules applicable to the given file path
 */
function getApplicablePreferences(filePath, preferences) {
  if (!preferences || !Array.isArray(preferences.rules)) return [];
  const normalized = filePath.replace(/\\/g, '/');
  return preferences.rules.filter(r => {
    if (!r.enabled) return false;
    const appliesTo = (r.applies_to || '*').replace(/\\/g, '/');
    if (appliesTo === '*') return true;
    return normalized.includes(appliesTo.replace(/\/$/, ''));
  });
}

/**
 * Format applicable preference rules as additionalContext text
 */
function formatPreferenceReminders(rules) {
  if (!rules || !rules.length) return null;
  const lines = ['## Active Preference Reminders\n'];
  for (const r of rules) {
    lines.push(`**[${r.severity.toUpperCase()}] ${r.title}**`);
    lines.push(r.rule);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Merge preference context into a hook result object
 */
function buildResult(base, prefContext) {
  if (!prefContext) return base;
  return Object.assign({}, base, { hookSpecificOutput: { additionalContext: prefContext } });
}

/**
 * Escape hatch - allows bypass of authenticity check
 * Usage: // aicodepath: allow-stub  or  // aicodepath: allow-mock  or  // aicodepath: allow-fake
 */
function hasAuthenticityBypass(content) {
  return /aicodepath:\s*allow-(stub|mock|fake)/i.test(content);
}

/**
 * Category aliases for normalization
 */
const AUTH_CATEGORY_ALIASES = {
  mock: 'mock_data',
  placeholder: 'stub',
};

// Valid authenticity categories
const AUTH_CATEGORIES = new Set(['stub', 'mock_data', 'fake_logic']);

/**
 * Normalize category name using aliases
 */
function normalizeCategory(category) {
  return AUTH_CATEGORY_ALIASES[category] || category;
}

// Guideline files to load for all projects
const GUIDELINE_FILES = [
  'ai-implementation-rules.json',
  'ai-regression-patterns.json',
  'api-design-rules.json',
  'architecture-rules.json',
  'coding-standards.json',
  'data-modeling-rules.json',
  'database-operations-rules.json',
  'devops-rules.json',
  'linting-rules.json',
  'mobile-design-rules.json',
  'observability-rules.json',
  'project-preferences.json',
  'search-rules.json',
  'security-rules.json',
  'testing-standards.json',
  'type-design-rules.json',
  'writing-style-rules.json',
];

// Language-specific guideline files — loaded only when the language is detected in the project
const LANGUAGE_GUIDELINE_FILES = {
  typescript: ['typescript-security-rules.json', 'typescript-lint-rules.json'],
  javascript: ['typescript-security-rules.json', 'typescript-lint-rules.json'],
  python: ['python-security-rules.json', 'python-lint-rules.json'],
  go: ['go-security-rules.json', 'go-lint-rules.json'],
  rust: ['rust-security-rules.json', 'rust-lint-rules.json'],
  java: ['java-security-rules.json', 'java-lint-rules.json'],
  kotlin: ['kotlin-security-rules.json', 'kotlin-lint-rules.json'],
};

// Files whose presence at the project root indicate a language is used
const LANGUAGE_INDICATORS = {
  typescript: ['tsconfig.json'],
  python: ['pyproject.toml', 'requirements.txt', 'setup.py', 'Pipfile'],
  go: ['go.mod'],
  rust: ['Cargo.toml'],
  java: ['pom.xml', 'build.gradle'],
  kotlin: ['build.gradle.kts'],
};

// File type detection patterns
const FILE_TYPE_PATTERNS = {
  controller: /\.(controller|ctrl)\.(ts|js)$/,
  service: /\.service\.(ts|js)$/,
  repository: /\.(repository|repo)\.(ts|js)$/,
  test: /\.(test|spec)\.(ts|js)$/,
  config: /\.(config|conf)\.(ts|js|json)$/,
  entity: /\.entity\.(ts|js)$/,
  dto: /\.dto\.(ts|js)$/,
  migration: /migration.*\.(ts|js)$/,
};

// Extension to language mapping
const EXTENSION_TO_LANGUAGE = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.cs': 'csharp',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.sql': 'sql',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
};

/**
 * Get language from file extension
 */
function getLanguageFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || 'unknown';
}

/**
 * Check if rule applies to given language
 */
function ruleAppliesToLanguage(rule, language) {
  // If no languages specified, rule applies to all
  if (!rule.languages || rule.languages.length === 0) {
    return true;
  }
  // Check for wildcard
  if (rule.languages.includes('*')) {
    return true;
  }
  // TypeScript is a superset of JavaScript for most rules
  if (language === 'typescript' && rule.languages.includes('javascript')) {
    return true;
  }
  return rule.languages.includes(language);
}

/**
 * Check if file path matches rule's file_pattern
 */
function ruleMatchesFilePattern(rule, filePath) {
  if (rule.context) {
    const contextPath = rule.context.replace(/\\/g, '/');
    if (!filePath.replace(/\\/g, '/').includes(contextPath)) {
      return false;
    }
  }

  // Support both file_pattern (singular string) and file_patterns (array)
  const patterns = rule.file_patterns || (rule.file_pattern ? [rule.file_pattern] : null);
  if (!patterns) {
    return true;
  }

  const normalizedPath = filePath.replace(/\\/g, '/');
  try {
    // Separate positive (include) and negative (exclude, starting with !) patterns
    const includePatterns = [];
    const excludePatterns = [];
    for (const pattern of patterns) {
      if (pattern.startsWith('!')) {
        excludePatterns.push(pattern.slice(1));
      } else {
        includePatterns.push(pattern);
      }
    }

    // Convert a glob pattern to a RegExp
    const globToRegex = (pattern) => {
      const regexStr = pattern
        .replace(/[.]/g, '[.]')
        .replace(/[*][*]/g, '##GLOBSTAR##')
        .replace(/[*]/g, '[^/]*')
        .replace(/##GLOBSTAR##/g, '.*');
      return new RegExp(regexStr, 'i');
    };

    // File must match at least one include pattern (or have no include patterns)
    const included = includePatterns.length === 0 ||
      includePatterns.some(p => globToRegex(p).test(normalizedPath));
    if (!included) return false;

    // File must NOT match any exclude pattern
    const excluded = excludePatterns.some(p => globToRegex(p).test(normalizedPath));
    if (excluded) return false;

    return true;
  } catch (e) {
    return true;
  }
}

function normalizeIdentifier(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function getFileBaseName(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function extractImportPaths(content) {
  const paths = new Set();
  const importRegex = /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
  const exportRegex = /export\s+[^'"]*from\s+['"]([^'"]+)['"]/g;
  const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    paths.add(match[1]);
  }
  while ((match = exportRegex.exec(content)) !== null) {
    paths.add(match[1]);
  }
  while ((match = requireRegex.exec(content)) !== null) {
    paths.add(match[1]);
  }

  return Array.from(paths);
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}

async function resolveImportPath(baseFilePath, importPath) {
  if (!importPath.startsWith('.')) {
    return null;
  }

  const baseDir = path.dirname(baseFilePath);
  const resolvedBase = path.resolve(baseDir, importPath);
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  if (path.extname(resolvedBase) && (await fileExists(resolvedBase))) {
    return resolvedBase;
  }

  for (const ext of extensions) {
    const candidate = `${resolvedBase}${ext}`;
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  for (const ext of extensions) {
    const candidate = path.join(resolvedBase, `index${ext}`);
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeFilePath(filePath) {
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath);
  return ext ? absolutePath.slice(0, -ext.length) : absolutePath;
}

function isTestFilePath(filePath) {
  return (
    /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filePath) ||
    filePath.includes('__tests__') ||
    filePath.includes('/test/') ||
    filePath.includes('/tests/')
  );
}

function classifyImportPath(importPath) {
  if (importPath.startsWith('.')) {
    return 2; // relative
  }
  if (importPath.startsWith('@') || importPath.startsWith('src/') || importPath.startsWith('~')) {
    return 1; // internal
  }
  return 0; // external
}

function extractFunctionBlocks(content) {
  const lines = content.split('\n');
  const blocks = [];
  const startPattern =
    /(?:async\s+function\s+(\w+)|function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|^\s*(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\()/;

  let inFunction = false;
  let braceCount = 0;
  let startLine = 0;
  let signatureLines = [];
  let name = 'anonymous';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inFunction) {
      const match = line.match(startPattern);
      if (match && line.includes('(')) {
        inFunction = true;
        startLine = i;
        name = match[1] || match[2] || match[3] || match[4] || 'anonymous';
        signatureLines = [line];
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

        if (line.includes('=>') && !line.includes('{')) {
          inFunction = false;
          signatureLines = [];
        }
      }
    } else {
      signatureLines.push(line);
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceCount <= 0) {
        const endLine = i;
        const body = lines.slice(startLine, endLine + 1).join('\n');
        const signature = signatureLines.join(' ');
        blocks.push({
          name,
          startLine: startLine + 1,
          endLine: endLine + 1,
          body,
          signature,
        });
        inFunction = false;
        signatureLines = [];
      }
    }
  }

  return blocks;
}

/**
 * Detect languages used in a project by checking for language indicator files
 * @param {string} projectRoot - Absolute path to project root
 * @returns {Promise<Set<string>>} Set of detected language identifiers
 */
async function detectProjectLanguages(projectRoot) {
  const languages = new Set();
  for (const [lang, indicators] of Object.entries(LANGUAGE_INDICATORS)) {
    for (const indicator of indicators) {
      try {
        await fs.access(path.join(projectRoot, indicator));
        languages.add(lang);
        break;
      } catch {
        // Indicator file not present — skip
      }
    }
  }
  return languages;
}

/**
 * Merge project-specific guideline overlay onto the framework base at rule level.
 *
 * Merge rules (applied per category):
 *   - Overlay rule id matches base rule id  → overlay rule replaces base rule
 *   - Overlay rule has "enabled": false     → rule is removed from base (disable)
 *   - Overlay rule id not in base           → appended to base category rules (add)
 *   - Overlay category not in base          → entire category added as-is
 *
 * Top-level metadata ($schema, version, description, _classification) always
 * comes from the framework base so that framework-level classification is preserved.
 *
 * @param {Object} base    - Framework guideline object
 * @param {Object} overlay - Project-specific guideline object
 * @returns {Object} Merged guideline object (base is not mutated)
 */
function mergeGuidelines(base, overlay) {
  const merged = JSON.parse(JSON.stringify(base));

  if (!overlay.categories) return merged;
  if (!merged.categories) merged.categories = {};

  for (const [catName, overlayCategory] of Object.entries(overlay.categories)) {
    if (!merged.categories[catName]) {
      merged.categories[catName] = overlayCategory;
      continue;
    }

    const baseRules = merged.categories[catName].rules || [];
    const overlayRules = overlayCategory.rules || [];

    for (const overlayRule of overlayRules) {
      const baseIdx = baseRules.findIndex((r) => r.id === overlayRule.id);

      if (overlayRule.enabled === false) {
        // Disable: remove matching rule from base (no-op if not found)
        if (baseIdx !== -1) baseRules.splice(baseIdx, 1);
      } else if (baseIdx !== -1) {
        // Replace: overlay wins on collision
        baseRules[baseIdx] = overlayRule;
      } else {
        // New rule: append to category
        baseRules.push(overlayRule);
      }
    }

    merged.categories[catName].rules = baseRules;
  }

  return merged;
}

/**
 * Load all guideline files
 */
async function loadGuidelines(projectPath) {
  const loadedGuidelines = {};
  // Project-specific overrides live in .aicodepath-overrides/guidelines/ — the established
  // convention documented in setup-project.sh, install-central.sh, guideline-enforcement.md,
  // and central-installation.md. This directory is project-owned and never touched by
  // framework updates (unlike .aicodepath/guidelines/ which is the framework source).
  const projectGuidelinesDir = path.join(projectPath, '.aicodepath-overrides', 'guidelines');
  // Framework defaults
  const centralGuidelinesDir = guidelines();

  // Detect project languages and collect language-specific guideline files
  const projectRoot = findProjectRoot();
  const detectedLanguages = await detectProjectLanguages(projectRoot);
  const filesToLoad = new Set(GUIDELINE_FILES);
  for (const lang of detectedLanguages) {
    for (const f of (LANGUAGE_GUIDELINE_FILES[lang] || [])) {
      filesToLoad.add(f);
    }
  }

  for (const file of filesToLoad) {
    // Always load framework base first
    let baseData = null;
    try {
      const content = await fs.readFile(path.join(centralGuidelinesDir, file), 'utf8');
      baseData = JSON.parse(content);
    } catch (e) {
      // Framework file not found for this entry
    }

    // Load project overlay if it exists
    let projectData = null;
    try {
      const content = await fs.readFile(path.join(projectGuidelinesDir, file), 'utf8');
      projectData = JSON.parse(content);
    } catch (e) {
      // No project override — use framework base as-is
    }

    let guidelineData = null;
    if (baseData && projectData) {
      guidelineData = mergeGuidelines(baseData, projectData);
    } else {
      guidelineData = baseData || projectData;
    }

    if (guidelineData) {
      loadedGuidelines[file.replace('.json', '')] = guidelineData;
    }
  }

  return loadedGuidelines;
}

/**
 * Detect file type from path
 */
function detectFileType(filePath) {
  for (const [type, pattern] of Object.entries(FILE_TYPE_PATTERNS)) {
    if (pattern.test(filePath)) {
      return type;
    }
  }

  // Default detection by extension
  if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    return 'typescript';
  }
  if (filePath.endsWith('.json')) {
    return 'json';
  }
  if (filePath.endsWith('.sql')) {
    return 'sql';
  }

  return 'unknown';
}

/**
 * Get applicable rules for a file type
 */
function getApplicableRules(guidelines, fileType) {
  const rules = [];

  for (const [category, guidelineData] of Object.entries(guidelines)) {
    if (!guidelineData.categories) continue;

    for (const [catName, catData] of Object.entries(guidelineData.categories)) {
      if (!catData.rules) continue;

      for (const rule of catData.rules) {
        // Check if rule applies to this file type
        if (rule.applies_to) {
          if (!rule.applies_to.includes(fileType) && !rule.applies_to.includes('*')) {
            continue;
          }
        }

        rules.push({
          ...rule,
          category: rule.category || catName,
          source: category,
        });
      }
    }
  }

  return rules;
}

/**
 * Check handlers for structural rules (check field)
 */
const CHECK_HANDLERS = {
  /**
   * Check total line count
   */
  line_count: (content, rule, filePath) => {
    const lines = content.split('\n').length;
    if (rule.max && lines > rule.max) {
      return [
        {
          rule: rule.id,
          severity: rule.severity || 'warning',
          message: rule.message || `File has ${lines} lines (max: ${rule.max})`,
          file: filePath,
          line: 1,
          match: `${lines} lines`,
          category: rule.category || 'structure',
        },
      ];
    }
    return [];
  },

  /**
   * Check function line counts
   */
  function_line_count: (content, rule, filePath) => {
    const violations = [];
    const lines = content.split('\n');

    // Match function declarations: function name(), async function name(), name = function(), name = () =>
    const funcPattern =
      /(?:(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?.*?\)?\s*(?:=>|function))/;

    let inFunction = false;
    let funcStart = 0;
    let funcName = '';
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!inFunction) {
        const match = line.match(funcPattern);
        if (match) {
          inFunction = true;
          funcStart = i;
          funcName = match[1] || match[2] || 'anonymous';
          braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

          // Arrow function without braces on same line
          if (line.includes('=>') && !line.includes('{')) {
            inFunction = false;
          }
        }
      } else {
        braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

        if (braceCount <= 0) {
          const funcLines = i - funcStart + 1;
          if (rule.max && funcLines > rule.max) {
            violations.push({
              rule: rule.id,
              severity: rule.severity || 'warning',
              message:
                rule.message || `Function '${funcName}' has ${funcLines} lines (max: ${rule.max})`,
              file: filePath,
              line: funcStart + 1,
              match: `${funcName}: ${funcLines} lines`,
              category: rule.category || 'structure',
            });
          }
          inFunction = false;
        }
      }
    }
    return violations;
  },

  /**
   * Check method count per class
   */
  method_count: (content, rule, filePath) => {
    const violations = [];
    const classPattern = /class\s+(\w+)/g;
    const methodPattern =
      /^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/gm;

    let match;
    while ((match = classPattern.exec(content)) !== null) {
      const className = match[1];
      const classStart = match.index;

      // Find class end (simple brace counting)
      let braceCount = 0;
      let classEnd = classStart;
      let foundStart = false;

      for (let i = classStart; i < content.length; i++) {
        if (content[i] === '{') {
          foundStart = true;
          braceCount++;
        } else if (content[i] === '}') {
          braceCount--;
          if (foundStart && braceCount === 0) {
            classEnd = i;
            break;
          }
        }
      }

      const classContent = content.substring(classStart, classEnd);
      const methods = classContent.match(methodPattern) || [];
      const methodCount = methods.length;

      if (rule.max && methodCount > rule.max) {
        const lineNumber = content.substring(0, classStart).split('\n').length;
        violations.push({
          rule: rule.id,
          severity: rule.severity || 'warning',
          message:
            rule.message || `Class '${className}' has ${methodCount} methods (max: ${rule.max})`,
          file: filePath,
          line: lineNumber,
          match: `${className}: ${methodCount} methods`,
          category: rule.category || 'structure',
        });
      }
    }
    return violations;
  },

  /**
   * Check nesting depth
   */
  nesting_depth: (content, rule, filePath) => {
    const violations = [];
    const lines = content.split('\n');
    let maxDepth = 0;
    let currentDepth = 0;
    let maxDepthLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;

      currentDepth += opens;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
        maxDepthLine = i + 1;
      }
      currentDepth -= closes;
    }

    if (rule.max && maxDepth > rule.max) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'warning',
        message: rule.message || `Nesting depth is ${maxDepth} (max: ${rule.max})`,
        file: filePath,
        line: maxDepthLine,
        match: `depth: ${maxDepth}`,
        category: rule.category || 'structure',
      });
    }
    return violations;
  },

  /**
   * Check parameter count per function
   */
  parameter_count: (content, rule, filePath) => {
    const violations = [];
    const funcPattern =
      /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\()\s*([^)]*)\)/g;

    let match;
    while ((match = funcPattern.exec(content)) !== null) {
      const funcName = match[1] || match[2] || 'anonymous';
      const params = match[3];
      const paramCount = params.trim() ? params.split(',').length : 0;

      if (rule.max && paramCount > rule.max) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        violations.push({
          rule: rule.id,
          severity: rule.severity || 'warning',
          message:
            rule.message ||
            `Function '${funcName}' has ${paramCount} parameters (max: ${rule.max})`,
          file: filePath,
          line: lineNumber,
          match: `${funcName}: ${paramCount} params`,
          category: rule.category || 'structure',
        });
      }
    }
    return violations;
  },

  file_export_match: (content, rule, filePath) => {
    const violations = [];
    const fileBase = normalizeIdentifier(getFileBaseName(filePath));
    if (!fileBase) {
      return violations;
    }

    const classMatch = content.match(/export\s+default\s+class\s+(\w+)/);
    const funcMatch = content.match(/export\s+default\s+function\s+(\w+)/);
    const idMatch = content.match(/export\s+default\s+(\w+)/);
    const exportName = classMatch?.[1] || funcMatch?.[1] || idMatch?.[1];

    if (exportName && normalizeIdentifier(exportName) !== fileBase) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'info',
        message: rule.message || rule.description,
        file: filePath,
        line: 1,
        match: exportName,
        category: rule.category || 'imports',
      });
    }

    return violations;
  },

  circular_dependency: async (content, rule, filePath, projectPath) => {
    const violations = [];
    const absoluteFilePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(projectPath, filePath);
    const normalizedFile = normalizeFilePath(absoluteFilePath);
    const importPaths = extractImportPaths(content);

    for (const importPath of importPaths) {
      const resolvedImport = await resolveImportPath(absoluteFilePath, importPath);
      if (!resolvedImport) {
        continue;
      }

      const importedContent = await fs.readFile(resolvedImport, 'utf8').catch(() => null);
      if (!importedContent) {
        continue;
      }

      const importedPaths = extractImportPaths(importedContent);
      for (const nestedPath of importedPaths) {
        const resolvedNested = await resolveImportPath(resolvedImport, nestedPath);
        if (!resolvedNested) {
          continue;
        }

        if (normalizeFilePath(resolvedNested) === normalizedFile) {
          violations.push({
            rule: rule.id,
            severity: rule.severity || 'error',
            message: rule.message || rule.description,
            file: filePath,
            line: 1,
            match: importPath,
            category: rule.category || 'imports',
          });
          return violations;
        }
      }
    }

    return violations;
  },

  import_order: (content, rule, filePath) => {
    const violations = [];
    const lines = content.split('\n');
    const importLines = [];

    lines.forEach((line, index) => {
      if (/^\s*import\s+/.test(line) || /\brequire\(\s*['"]/.test(line)) {
        const match = line.match(/['"]([^'"]+)['"]/);
        if (match) {
          importLines.push({ line: index + 1, path: match[1] });
        }
      }
    });

    let lastGroup = 0;
    for (const entry of importLines) {
      const group = classifyImportPath(entry.path);
      if (group < lastGroup) {
        violations.push({
          rule: rule.id,
          severity: rule.severity || 'info',
          message: rule.message || rule.description,
          file: filePath,
          line: entry.line,
          match: entry.path,
          category: rule.category || 'imports',
        });
        break;
      }
      lastGroup = group;
    }

    return violations;
  },

  jsdoc_coverage: (content, rule, filePath) => {
    const violations = [];
    const lines = content.split('\n');
    const functionPattern = /^\s*(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/;
    const methodPattern = /^\s*(?:public|private|protected)?\s*(?:async\s+)?\w+\s*\([^)]*\)\s*\{/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (functionPattern.test(line) || methodPattern.test(line)) {
        let j = i - 1;
        while (j >= 0 && lines[j].trim() === '') {
          j -= 1;
        }
        if (j < 0 || !lines[j].trim().startsWith('/**')) {
          violations.push({
            rule: rule.id,
            severity: rule.severity || 'info',
            message: rule.message || rule.description,
            file: filePath,
            line: i + 1,
            match: line.trim().substring(0, 80),
            category: rule.category || 'comments',
          });
        }
      }
    }

    return violations;
  },

  async_try_catch: (content, rule, filePath) => {
    const violations = [];
    const blocks = extractFunctionBlocks(content);

    for (const block of blocks) {
      if (!/async\s/.test(block.signature)) {
        continue;
      }
      if (!/try\s*\{/.test(block.body) && !/\.catch\s*\(/.test(block.body)) {
        violations.push({
          rule: rule.id,
          severity: rule.severity || 'warning',
          message: rule.message || rule.description,
          file: filePath,
          line: block.startLine,
          match: block.name,
          category: rule.category || 'errors',
        });
      }
    }

    return violations;
  },

  return_type: (content, rule, filePath) => {
    const violations = [];
    const blocks = extractFunctionBlocks(content);

    for (const block of blocks) {
      if (!/return\s*\{/.test(block.body)) {
        continue;
      }
      const hasReturnType =
        /\)\s*:\s*[^=\s]+/.test(block.signature) ||
        /\)\s*:\s*[^=\s]+/.test(block.body.split('\n')[0]) ||
        /\)\s*:\s*[^=\s]+/.test(block.signature.replace(/\s+/g, ' '));

      if (!hasReturnType) {
        violations.push({
          rule: rule.id,
          severity: rule.severity || 'warning',
          message: rule.message || rule.description,
          file: filePath,
          line: block.startLine,
          match: block.name,
          category: rule.category || 'contracts',
        });
      }
    }

    return violations;
  },

  response_contract: (content, rule, filePath) => {
    const violations = [];
    const isApiFile = /controller|handler|route/i.test(filePath);
    if (!isApiFile) {
      return violations;
    }

    const hasSchemaHint = /(Dto|Schema|OpenAPI|zod|yup|Joi|class-validator)/.test(content);
    const hasReturnObject = /return\s*\{|\bres\.json\s*\(/.test(content);

    if (hasReturnObject && !hasSchemaHint) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'info',
        message: rule.message || rule.description,
        file: filePath,
        line: 1,
        match: 'response',
        category: rule.category || 'contracts',
      });
    }

    return violations;
  },

  config_module: (content, rule, filePath) => {
    const violations = [];
    if (!/process\.env/.test(content)) {
      return violations;
    }

    if (/config/i.test(filePath) || /from\s+['"].*config/.test(content)) {
      return violations;
    }

    violations.push({
      rule: rule.id,
      severity: rule.severity || 'info',
      message: rule.message || rule.description,
      file: filePath,
      line: 1,
      match: 'process.env',
      category: rule.category || 'configuration',
    });

    return violations;
  },

  shared_mutation: (content, rule, filePath) => {
    const violations = [];
    if (!/\.push\(|\.splice\(|\.pop\(/.test(content)) {
      return violations;
    }

    if (!/module\.exports|export\s+/.test(content)) {
      return violations;
    }

    violations.push({
      rule: rule.id,
      severity: rule.severity || 'info',
      message: rule.message || rule.description,
      file: filePath,
      line: 1,
      match: 'mutation',
      category: rule.category || 'concurrency',
    });

    return violations;
  },

  csrf_middleware: (content, rule, filePath) => {
    const violations = [];
    if (!/(post|put|delete|patch)\s*\(/i.test(content)) {
      return violations;
    }
    if (/csrf|csurf/i.test(content)) {
      return violations;
    }

    violations.push({
      rule: rule.id,
      severity: rule.severity || 'warning',
      message: rule.message || rule.description,
      file: filePath,
      line: 1,
      match: 'csrf',
      category: rule.category || 'headers',
    });

    return violations;
  },

  aaa_pattern: (content, rule, filePath) => {
    const violations = [];
    if (!isTestFilePath(filePath)) {
      return violations;
    }

    const hasArrange = /arrange/i.test(content);
    const hasAct = /\bact\b/i.test(content);
    const hasAssert = /assert/i.test(content);

    if (!(hasArrange && hasAct && hasAssert)) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'info',
        message: rule.message || rule.description,
        file: filePath,
        line: 1,
        match: 'AAA',
        category: rule.category || 'structure',
      });
    }

    return violations;
  },

  test_cleanup: (content, rule, filePath) => {
    const violations = [];
    if (!isTestFilePath(filePath)) {
      return violations;
    }

    const hasSetup = /beforeEach|beforeAll/.test(content);
    const hasCleanup = /afterEach|afterAll/.test(content);

    if (hasSetup && !hasCleanup) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'info',
        message: rule.message || rule.description,
        file: filePath,
        line: 1,
        match: 'cleanup',
        category: rule.category || 'structure',
      });
    }

    return violations;
  },

  test_isolation: (content, rule, filePath) => {
    const violations = [];
    if (!isTestFilePath(filePath)) {
      return violations;
    }

    if (/\b(describe|it|test)\.only\b|\b(describe|it|test)\.skip\b/.test(content)) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'warning',
        message: rule.message || rule.description,
        file: filePath,
        line: 1,
        match: 'focused test',
        category: rule.category || 'structure',
      });
    }

    return violations;
  },

  external_mock: (content, rule, filePath) => {
    const violations = [];
    if (!isTestFilePath(filePath)) {
      return violations;
    }

    const hasExternalCalls = /\bfetch\s*\(|axios\.|superagent\.|http\.request|https\.request/.test(
      content
    );
    const hasMock = /jest\.mock|vi\.mock|sinon\.stub|nock\(|msw/.test(content);

    if (hasExternalCalls && !hasMock) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'warning',
        message: rule.message || rule.description,
        file: filePath,
        line: 1,
        match: 'external call',
        category: rule.category || 'mocking',
      });
    }

    return violations;
  },

  mock_count: (content, rule, filePath) => {
    const violations = [];
    if (!isTestFilePath(filePath) || !rule.max) {
      return violations;
    }

    const matches = content.match(/jest\.mock|vi\.mock|sinon\.stub|mock\(/g) || [];
    if (matches.length > rule.max) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'info',
        message: rule.message || rule.description,
        file: filePath,
        line: 1,
        match: `${matches.length} mocks`,
        category: rule.category || 'mocking',
      });
    }

    return violations;
  },

  mock_data_quality: (content, rule, filePath) => {
    const violations = [];
    if (!isTestFilePath(filePath)) {
      return violations;
    }

    const hasPlaceholder = /\blorem\b|example\.com|fake|test@\w+\.\w+/i.test(content);
    if (hasPlaceholder) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'info',
        message: rule.message || rule.description,
        file: filePath,
        line: 1,
        match: 'mock data',
        category: rule.category || 'mocking',
      });
    }

    return violations;
  },

  async_assertion: (content, rule, filePath) => {
    const violations = [];
    if (!isTestFilePath(filePath)) {
      return violations;
    }

    const blocks = extractFunctionBlocks(content);
    for (const block of blocks) {
      if (!/async\s/.test(block.signature)) {
        continue;
      }
      if (!/await\s+|return\s+/.test(block.body)) {
        violations.push({
          rule: rule.id,
          severity: rule.severity || 'error',
          message: rule.message || rule.description,
          file: filePath,
          line: block.startLine,
          match: block.name,
          category: rule.category || 'assertions',
        });
      }
    }

    return violations;
  },

  coverage_threshold: async (content, rule, filePath, projectPath) => {
    const violations = [];
    if (!isTestFilePath(filePath)) {
      return violations;
    }

    const coveragePath = path.join(projectPath, 'aicodepath-docs', 'tests.json');
    const coverageData = await fs.readFile(coveragePath, 'utf8').catch(() => null);
    if (!coverageData) {
      return violations;
    }

    let parsed;
    try {
      parsed = JSON.parse(coverageData);
    } catch (e) {
      return violations;
    }

    if (!parsed.coverage || !rule.threshold) {
      return violations;
    }

    const thresholds = rule.threshold;
    const coverage = parsed.coverage;
    const below = [];

    if (typeof coverage.lines === 'number' && coverage.lines < thresholds.lines) {
      below.push(`lines ${coverage.lines}% < ${thresholds.lines}%`);
    }
    if (typeof coverage.branches === 'number' && coverage.branches < thresholds.branches) {
      below.push(`branches ${coverage.branches}% < ${thresholds.branches}%`);
    }
    if (typeof coverage.functions === 'number' && coverage.functions < thresholds.functions) {
      below.push(`functions ${coverage.functions}% < ${thresholds.functions}%`);
    }
    if (typeof coverage.statements === 'number' && coverage.statements < thresholds.statements) {
      below.push(`statements ${coverage.statements}% < ${thresholds.statements}%`);
    }

    if (below.length > 0) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'warning',
        message: rule.message || rule.description,
        file: filePath,
        line: 1,
        match: below.join(', '),
        category: rule.category || 'coverage',
      });
    }

    return violations;
  },

  /**
   * Check that tsconfig.json has strict mode enabled.
   * Validates the content of tsconfig.json (or tsconfig.*.json) files
   * for "strict": true and flags if individual strict flags are disabled.
   */
  strict_tsconfig: (content, rule, filePath) => {
    const violations = [];
    const basename = path.basename(filePath);

    // Only applies to tsconfig files
    if (!basename.startsWith('tsconfig') || !basename.endsWith('.json')) {
      return violations;
    }

    // Strip JSON comments (// and /* */) for tsconfig which supports JSONC
    const stripped = content
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([\]}])/g, '$1');

    let parsed;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      return violations;
    }

    const compilerOptions = parsed.compilerOptions;
    if (!compilerOptions) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'warning',
        message: 'tsconfig.json is missing compilerOptions — add compilerOptions with strict: true',
        file: filePath,
        line: 1,
        match: 'compilerOptions missing',
        category: 'strict_mode',
      });
      return violations;
    }

    // Check for strict: true
    if (compilerOptions.strict !== true) {
      violations.push({
        rule: rule.id,
        severity: rule.severity || 'warning',
        message: rule.message || 'Enable "strict": true in tsconfig.json compilerOptions for comprehensive type safety',
        file: filePath,
        line: 1,
        match: `strict: ${compilerOptions.strict === undefined ? 'missing' : compilerOptions.strict}`,
        category: 'strict_mode',
      });
    }

    // Even with strict: true, individual flags can be overridden to false
    const strictFlags = [
      'noImplicitAny',
      'strictNullChecks',
      'strictFunctionTypes',
      'strictBindCallApply',
      'strictPropertyInitialization',
      'noImplicitThis',
      'alwaysStrict',
    ];

    for (const flag of strictFlags) {
      if (compilerOptions[flag] === false) {
        violations.push({
          rule: rule.id,
          severity: 'warning',
          message: `"${flag}": false overrides strict mode — remove this override to maintain full strict type checking`,
          file: filePath,
          line: 1,
          match: `${flag}: false`,
          category: 'strict_mode',
        });
      }
    }

    return violations;
  },
};

/**
 * Validate content against a rule
 * Supports: pattern, inverse, languages, file_pattern, check, max
 */
async function validateRule(content, rule, filePath, language, projectPath) {
  const violations = [];

  // Filter by language
  if (!ruleAppliesToLanguage(rule, language)) {
    return violations;
  }

  // Filter by file_pattern
  if (!ruleMatchesFilePattern(rule, filePath)) {
    return violations;
  }

  // Handle check-based rules (structural checks)
  if (rule.check) {
    if (CHECK_HANDLERS[rule.check]) {
      return await CHECK_HANDLERS[rule.check](content, rule, filePath, projectPath);
    }
    // Handler not implemented - skip rule instead of falling through to pattern matching
    // (pattern matching causes false positives when check handler is the intended validation)
    return violations;
  }

  // Handle pattern-based rules
  if (!rule.pattern) return violations;

  try {
    const regexFlags = rule.case_sensitive === false ? 'gmi' : 'gm';
    const regex = new RegExp(rule.pattern, regexFlags);
    const lines = content.split('\n');

    // For inverse rules, we check if pattern is NOT found when it should be
    if (rule.inverse) {
      // Inverse pattern: violation if pattern matches (indicates bad practice)
      // e.g., "class starts with lowercase" pattern - if it matches, that's a violation
      lines.forEach((line, index) => {
        const matches = line.match(regex);
        if (matches) {
          violations.push({
            rule: rule.id,
            severity: rule.severity || 'warning',
            message: rule.message || rule.description,
            file: filePath,
            line: index + 1,
            match: matches[0],
            fix: rule.fix_suggestion,
            category: rule.category || 'general',
          });
        }
      });
    } else {
      // Normal pattern: violation if pattern matches
      lines.forEach((line, index) => {
        const matches = line.match(regex);
        if (matches) {
          violations.push({
            rule: rule.id,
            severity: rule.severity || 'warning',
            message: rule.message || rule.description,
            file: filePath,
            line: index + 1,
            match: matches[0],
            fix: rule.fix_suggestion,
            category: rule.category || 'general',
          });
        }
      });
    }
  } catch (e) {
    // Invalid regex pattern
  }

  return violations;
}

/**
 * Calculate Implementation Authenticity Score
 * Detects mock/stub/fake implementations and scores the code
 * Uses two-signal FAIL threshold: requires violations in 2+ categories to FAIL
 */
function calculateAuthenticityScore(violations, linesOfCode, hasBypass = false) {
  // Normalize categories and filter relevant violations
  const mockViolations = violations
    .map((v) => ({ ...v, category: normalizeCategory(v.category) }))
    .filter((v) => AUTH_CATEGORIES.has(v.category));

  if (mockViolations.length === 0) {
    return {
      score: 100,
      status: 'PASS',
      message: 'Code appears to have real implementations',
      breakdown: { stub: 0, mock_data: 0, fake_logic: 0 },
    };
  }

  // Category weights
  const weights = {
    stub: 3,
    mock_data: 2,
    fake_logic: 3,
  };

  // Count by category
  const breakdown = {
    stub: mockViolations.filter((v) => v.category === 'stub').length,
    mock_data: mockViolations.filter((v) => v.category === 'mock_data').length,
    fake_logic: mockViolations.filter((v) => v.category === 'fake_logic').length,
  };

  // Count how many categories have violations (two-signal check)
  const signalCount = Object.values(breakdown).filter((count) => count > 0).length;

  // Calculate weighted penalty
  const totalPenalty =
    breakdown.stub * weights.stub +
    breakdown.mock_data * weights.mock_data +
    breakdown.fake_logic * weights.fake_logic;

  // Normalize by lines of code (1 violation per 50 lines = 10 point penalty)
  const normalizedPenalty = Math.min(100, (totalPenalty / Math.max(linesOfCode / 50, 1)) * 10);
  const score = Math.max(0, Math.round(100 - normalizedPenalty));

  let status, message;
  if (score >= 90) {
    status = 'PASS';
    message = 'Code is production-ready with real implementations';
  } else if (score >= 70) {
    status = 'REVIEW';
    message = 'Code has some mock elements that may need attention';
  } else {
    // Two-signal FAIL: only FAIL if 2+ categories have violations AND no bypass
    if (signalCount >= 2 && !hasBypass) {
      status = 'FAIL';
      message = 'Code contains significant mock/stub implementations';
    } else {
      status = 'REVIEW';
      message = 'Code has mock elements but may be acceptable (single category or bypass)';
    }
  }

  return {
    score,
    status,
    message,
    breakdown,
    mockViolations,
    signalCount,
  };
}

/**
 * Format authenticity report
 */
function formatAuthenticityReport(authenticity) {
  const lines = [];

  if (authenticity.status === 'FAIL') {
    lines.push('## Implementation Authenticity: FAIL\n');
    lines.push(
      '**Critical**: This code contains mock/stub implementations that need real logic.\n'
    );
  } else if (authenticity.status === 'REVIEW') {
    lines.push('## Implementation Authenticity: NEEDS REVIEW\n');
    lines.push('**Warning**: This code may contain placeholder implementations.\n');
  } else {
    lines.push('## Implementation Authenticity: PASS\n');
  }

  lines.push(`**Score**: ${authenticity.score}/100\n`);
  lines.push(`**Status**: ${authenticity.message}\n`);

  if (authenticity.breakdown) {
    lines.push('\n### Mock Implementation Breakdown\n');
    lines.push('| Category | Count | Impact |');
    lines.push('|----------|-------|--------|');
    lines.push(`| Stub/Placeholder | ${authenticity.breakdown.stub} | High |`);
    lines.push(`| Mock Data | ${authenticity.breakdown.mock_data} | Medium |`);
    lines.push(`| Fake Logic | ${authenticity.breakdown.fake_logic} | High |`);
    lines.push('');
  }

  if (authenticity.mockViolations && authenticity.mockViolations.length > 0) {
    lines.push('\n### Mock Implementation Details\n');
    lines.push('| Line | Category | Issue |');
    lines.push('|------|----------|-------|');

    for (const v of authenticity.mockViolations.slice(0, 10)) {
      lines.push(`| ${v.line} | ${v.category} | ${v.message} |`);
    }

    if (authenticity.mockViolations.length > 10) {
      lines.push(`| ... | ... | +${authenticity.mockViolations.length - 10} more issues |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Main validation function
 */
async function validateContent(content, filePath, projectPath = findProjectRoot()) {
  const guidelines = await loadGuidelines(projectPath);
  const fileType = detectFileType(filePath);
  const language = getLanguageFromPath(filePath);
  const rules = getApplicableRules(guidelines, fileType);

  const violations = [];

  for (const rule of rules) {
    const ruleViolations = await validateRule(content, rule, filePath, language, projectPath);
    violations.push(...ruleViolations);
  }

  // Calculate lines of code
  const linesOfCode = content.split('\n').length;

  // Check for authenticity bypass
  const hasBypass = hasAuthenticityBypass(content);

  // Calculate authenticity score (with bypass awareness)
  const authenticity = calculateAuthenticityScore(violations, linesOfCode, hasBypass);

  return {
    file: filePath,
    fileType,
    rulesChecked: rules.length,
    linesOfCode,
    violations,
    hasErrors: violations.some((v) => v.severity === 'error'),
    hasWarnings: violations.some((v) => v.severity === 'warning'),
    errorCount: violations.filter((v) => v.severity === 'error').length,
    warningCount: violations.filter((v) => v.severity === 'warning').length,
    authenticity,
    hasBypass,
    hasMockImplementations: authenticity.status !== 'PASS',
  };
}

/**
 * Format violations as markdown
 */
function formatViolations(results) {
  const lines = [];

  if (results.hasErrors) {
    lines.push('## Guideline Violations Found\n');
    lines.push('The following violations must be fixed before proceeding:\n');
  }

  if (results.errorCount > 0) {
    lines.push('### Error-Level Violations (must fix)\n');
    lines.push('| File | Line | Rule | Message |');
    lines.push('|------|------|------|---------|');

    for (const v of results.violations.filter((v) => v.severity === 'error')) {
      lines.push(`| ${v.file} | ${v.line} | ${v.rule} | ${v.message} |`);
    }
    lines.push('');
  }

  if (results.warningCount > 0) {
    lines.push('### Warning-Level Violations (should fix)\n');
    lines.push('| File | Line | Rule | Message |');
    lines.push('|------|------|------|---------|');

    for (const v of results.violations.filter((v) => v.severity === 'warning')) {
      lines.push(`| ${v.file} | ${v.line} | ${v.rule} | ${v.message} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Hook entry point
 * Called by Claude Code before Write/Edit operations
 */
async function hook(params) {
  // Defensive check: Only run on Write/Edit tools
  if (!params || !params.tool_name) {
    return { proceed: true };
  }

  const allowedTools = ['Write', 'Edit'];
  if (!allowedTools.includes(params.tool_name)) {
    return { proceed: true };
  }

  const { tool_input, project_path } = params;

  // Extract file path and content based on tool type
  let filePath, content;

  if (tool_input.file_path) {
    filePath = tool_input.file_path;
  }

  if (tool_input.content) {
    content = tool_input.content;
  } else if (tool_input.new_string) {
    // For Edit tool, validate the new content
    content = tool_input.new_string;
  }

  if (!filePath || !content) {
    return { proceed: true };
  }

  // Load applicable preference reminders for this file
  const preferences = await loadPreferences(project_path);
  const applicablePrefs = getApplicablePreferences(filePath, preferences);
  const prefContext = formatPreferenceReminders(applicablePrefs);

  // ADR-013 enforcement: aicodepath-docs/ is runtime-only — block README.md (static spec indicator)
  const basename = path.basename(filePath);
  const normalizedPath = filePath.replace(/\\/g, '/');
  if (
    basename === 'README.md' &&
    (normalizedPath.includes('/aicodepath-docs/') || normalizedPath.startsWith('aicodepath-docs/'))
  ) {
    return buildResult({
      proceed: false,
      message: '**[ADR-013] aicodepath-docs/ is runtime-only**\n\n' +
        '`README.md` files are static framework documentation, not runtime artifacts.\n' +
        'Place reference material in `.aicodepath/skills/<name>/references/` instead.\n\n' +
        'See ADR-013 in `aicodepath-docs/adr-log.md` for the full runtime/framework-source boundary.',
    }, prefContext);
  }

  // Plan file check: warn if ## Recommended Agents section is missing
  if (normalizedPath.includes('/plans/') && normalizedPath.endsWith('-plan.md')) {
    if (content.length > 300 && !content.includes('## Recommended Agents')) {
      return buildResult({
        proceed: true,
        message: '⚠️ Plan file is missing the `## Recommended Agents` section.\n' +
          'Add it under Architecture Notes before saving — required by preference rule `write-plan-persist-agent-recommendations`.',
      }, prefContext);
    }
    return buildResult({ proceed: true }, prefContext);
  }

  // Skip non-code files (inject preferences if applicable)
  const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs'];
  const ext = path.extname(filePath);
  if (!codeExtensions.includes(ext)) {
    return buildResult({ proceed: true }, prefContext);
  }

  // Skip test files from mock detection (mocks are allowed in tests)
  const isTestFile = isTestFilePath(filePath);

  const results = await validateContent(content, filePath, project_path);

  // **NEW: Record validation to database**
  try {
    const storage = ValidationStorageFactory.create(project_path);
    const score = results.authenticity ? results.authenticity.score : 100;
    const status = results.hasErrors ? 'failed' :
                   results.hasWarnings ? 'warning' : 'passed';

    await storage.recordValidation({
      artifactId: null,
      filePath,
      validationType: 'guideline',
      score,
      status,
      violations: {
        violations: results.violations || [],
        rulesChecked: results.rulesChecked,
        authenticity: results.authenticity
      }
    });
    await storage.close();
  } catch (err) {
    // Don't fail the hook if DB write fails
    logger.error('Failed to record validation', {
      error: err.message,
      stack: err.stack,
      filePath
    });
  }

  // Build response message
  let message = '';

  // Check for mock implementations (but not in test files)
  if (!isTestFile && results.hasMockImplementations) {
    message += formatAuthenticityReport(results.authenticity);

    // Block on FAIL status for mock implementations
    if (results.authenticity.status === 'FAIL') {
      return buildResult({
        proceed: false,
        message:
          message +
          '\n\n**Action Required**: Replace mock/stub implementations with real code before proceeding.',
        violations: results.violations,
        authenticity: results.authenticity,
      }, prefContext);
    }
  }

  // Check for other errors
  if (results.hasErrors) {
    message += formatViolations(results);
    return buildResult({
      proceed: false,
      message: message,
      violations: results.violations,
      authenticity: results.authenticity,
    }, prefContext);
  }

  // Check for warnings (including mock implementations that aren't FAIL)
  if (results.hasWarnings || (!isTestFile && results.authenticity.status === 'REVIEW')) {
    message += formatViolations(results);
    if (!isTestFile && results.authenticity.status === 'REVIEW') {
      message += '\n' + formatAuthenticityReport(results.authenticity);
    }
    return buildResult({
      proceed: true,
      message: message,
      violations: results.violations,
      authenticity: results.authenticity,
    }, prefContext);
  }

  return buildResult({
    proceed: true,
    message: `Guideline check passed: ${results.rulesChecked} rules verified | Authenticity Score: ${results.authenticity.score}/100`,
    authenticity: results.authenticity,
  }, prefContext);
}

module.exports = {
  hook,
  validateContent,
  loadGuidelines,
  mergeGuidelines,
  detectFileType,
  getApplicableRules,
  formatViolations,
  calculateAuthenticityScore,
  formatAuthenticityReport,
  hasAuthenticityBypass,
  normalizeCategory,
  AUTH_CATEGORIES,
  // New exports for enhanced rule validation
  getLanguageFromPath,
  ruleAppliesToLanguage,
  ruleMatchesFilePattern,
  validateRule,
  CHECK_HANDLERS,
  // Preference integration
  loadPreferences,
  getApplicablePreferences,
  formatPreferenceReminders,
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(hook, { name: 'guideline-validator' });
}
