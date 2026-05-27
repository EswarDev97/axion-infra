const { spawn } = require('child_process');
const path = require('path');
const { findProjectRoot } = require('./path-resolver');
const { PythonBridgeError } = require('./errors');
const { findPython } = require('./platform-utils');

/**
 * Bridge for executing Python generators from JavaScript
 * Handles spawning Python processes and parsing JSON responses
 */
class PythonBridge {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || findPython();
    this.generatorsPath = null;
  }

  /**
   * Initialize the generators path
   * @private
   */
  _initGeneratorsPath() {
    if (!this.generatorsPath) {
      const projectRoot = findProjectRoot();
      this.generatorsPath = path.join(projectRoot, '.aicodepath', 'generators');
    }
    return this.generatorsPath;
  }

  /**
   * Generate a diagram using Python generators
   * @param {string} diagramType - Type of diagram (er, class, c4, flowchart)
   * @param {Object} options - Generation options
   * @param {string[]} options.files - Source files to analyze
   * @param {string} options.output - Output file path
   * @param {string} options.unit - Unit name
   * @param {number} options.timeout - Timeout in milliseconds (default: 60000)
   * @returns {Promise<Object>} Generation result with success/error status
   */
  async generateDiagram(diagramType, options = {}) {
    const generatorsPath = this._initGeneratorsPath();
    const timeout = options.timeout || parseInt(process.env.AICODEPATH_PYTHON_TIMEOUT) || 60000;

    return new Promise((resolve, reject) => {
      // Build command arguments
      const args = ['-m', 'generators', diagramType];

      if (options.files && Array.isArray(options.files)) {
        options.files.forEach(f => {
          args.push('--files', f);
        });
      }
      if (options.output) {
        args.push('--output', options.output);
      }
      if (options.unit) {
        args.push('--unit', options.unit);
      }

      // Spawn Python process
      const proc = spawn(this.pythonPath, args, {
        cwd: generatorsPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', data => {
        stdout += data.toString();
      });

      proc.stderr.on('data', data => {
        stderr += data.toString();
      });

      proc.on('close', code => {
        if (code !== 0) {
          return reject(new PythonBridgeError(`Python generator failed with code ${code}`, stderr));
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new PythonBridgeError(`Failed to parse generator output as JSON: ${e.message}`, stdout));
        }
      });

      proc.on('error', err => {
        reject(new PythonBridgeError(`Failed to spawn Python process: ${err.message}`));
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        proc.kill();
        reject(new PythonBridgeError(`Generator timed out after ${timeout}ms`));
      }, timeout);

      proc.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  /**
   * Check if Python and required dependencies are available
   * @returns {Promise<Object>} Status with available flag and any errors
   */
  async checkAvailability() {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      proc.stdout.on('data', data => output += data.toString());
      proc.stderr.on('data', data => output += data.toString());

      proc.on('close', code => {
        if (code === 0) {
          resolve({
            available: true,
            version: output.trim()
          });
        } else {
          resolve({
            available: false,
            error: 'Python not found or not executable'
          });
        }
      });

      proc.on('error', err => {
        resolve({
          available: false,
          error: err.message
        });
      });

      setTimeout(() => {
        proc.kill();
        resolve({
          available: false,
          error: 'Python check timed out'
        });
      }, 5000);
    });
  }
}

// Export singleton instance
module.exports = new PythonBridge();
