/**
 * Bridge between Node.js hooks and Python generators
 *
 * This module provides async communication between the Node.js hook system
 * and the Python-based AST/tree-sitter diagram generators.
 *
 * @module hooks/lib/python-bridge
 */

const { spawn } = require('child_process');
const path = require('path');
const { findPython } = require('../../lib/platform-utils');

/**
 * Call Python generator with specified arguments
 *
 * @param {string[]} args - Command line arguments for the Python generator
 * @param {Object} options - Additional options
 * @param {string} options.cwd - Working directory (defaults to generators path)
 * @param {number} options.timeout - Timeout in milliseconds (default: 60000)
 * @returns {Promise<Object>} - Parsed JSON output from Python generator
 */
async function callPythonGenerator(args, options = {}) {
  const generatorPath = path.join(__dirname, '../../generators');
  const {
    cwd = generatorPath,
    timeout = 60000
  } = options;

  return new Promise((resolve, reject) => {
    const python = spawn(findPython(), ['-m', 'generators', ...args], {
      cwd,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      python.kill('SIGTERM');
      reject(new Error(`Python generator timed out after ${timeout}ms`));
    }, timeout);

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      clearTimeout(timeoutId);

      if (timedOut) return;

      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Python output: ${parseError.message}\nOutput: ${stdout}`));
        }
      } else {
        reject(new Error(`Python generator failed with code ${code}: ${stderr || stdout}`));
      }
    });

    python.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to spawn Python process: ${err.message}`));
    });
  });
}

/**
 * Check if Python generators are available
 *
 * @returns {Promise<boolean>} - True if Python generators are properly installed
 */
async function checkPythonGenerators() {
  try {
    const result = await callPythonGenerator(['--version'], { timeout: 5000 });
    return result && result.version;
  } catch {
    return false;
  }
}

/**
 * Generate diagram using Python generator
 *
 * @param {string} diagramType - Type of diagram (er, class, flowchart, sequence, journey, c4, layered)
 * @param {Object} options - Generation options
 * @param {string} options.scope - Scope (global or unit)
 * @param {string} options.unitName - Unit name if scope is 'unit'
 * @param {string[]} options.sourceFiles - Files to analyze
 * @param {Object} options.generatorOptions - Additional generator-specific options
 * @returns {Promise<Object>} - Generated diagram result
 */
async function generateDiagram(diagramType, options = {}) {
  const {
    scope = 'global',
    unitName = '',
    sourceFiles = [],
    generatorOptions = {}
  } = options;

  const args = [
    'generate',
    '--type', diagramType,
    '--scope', scope,
    '--output', 'json'
  ];

  if (unitName) {
    args.push('--unit', unitName);
  }

  if (sourceFiles.length > 0) {
    args.push('--files', sourceFiles.join(','));
  }

  // Add any additional options as JSON
  if (Object.keys(generatorOptions).length > 0) {
    args.push('--options', JSON.stringify(generatorOptions));
  }

  return callPythonGenerator(args);
}

/**
 * Generate multiple diagram types
 *
 * @param {string[]} diagramTypes - Array of diagram types to generate
 * @param {Object} options - Generation options (same as generateDiagram)
 * @returns {Promise<Object[]>} - Array of generated diagram results
 */
async function generateMultipleDiagrams(diagramTypes, options = {}) {
  const results = [];
  const errors = [];

  for (const type of diagramTypes) {
    try {
      const result = await generateDiagram(type, options);
      results.push({ type, ...result });
    } catch (err) {
      errors.push({ type, error: err.message });
    }
  }

  return { results, errors };
}

module.exports = {
  callPythonGenerator,
  checkPythonGenerators,
  generateDiagram,
  generateMultipleDiagrams
};
