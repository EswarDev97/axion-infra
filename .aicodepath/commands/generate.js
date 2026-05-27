const pythonBridge = require('../lib/python-bridge');
const ErrorHandler = require('../lib/error-handler');
const { PythonBridgeError, FileSystemError } = require('../lib/errors');

/**
 * Generate diagrams from code using Python generators
 * @param {string} type - Diagram type (er, class)
 * @param {Object} options - Command options
 * @param {string[]} options.files - Source files to analyze
 * @param {string} options.output - Output file path
 * @param {string} options.unit - Unit name
 */
async function generateCommandImpl(type, options) {
  console.log(`\n🔨 Generating ${type} diagram...\n`);

  // Validate diagram type — c4, flowchart, sequence, layered_architecture, user_journey
  // are stub Python generators (not_implemented); removed from advertised types
  const validTypes = ['er', 'class'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid diagram type: ${type}. Valid types: ${validTypes.join(', ')}`);
  }

  // Check Python availability
  const availability = await pythonBridge.checkAvailability();
  if (!availability.available) {
    throw new PythonBridgeError(
      `Python is not available: ${availability.error}. Please install Python 3.8+ and ensure it is in your PATH`
    );
  }

  // Generate diagram
  const result = await pythonBridge.generateDiagram(type, options);

  if (result.success) {
    console.log('✅ Diagram generated successfully\n');

    if (result.data.output_path) {
      console.log(`📄 Output: ${result.data.output_path}`);
    }

    if (result.data.confidence !== undefined) {
      console.log(`🎯 Confidence: ${result.data.confidence}%`);
    }

    if (result.data.entities !== undefined) {
      console.log(`📊 Entities: ${result.data.entities}`);
    }

    if (result.data.relationships !== undefined) {
      console.log(`🔗 Relationships: ${result.data.relationships}`);
    }

    if (result.message) {
      console.log(`\n${result.message}`);
    }

    console.log('');
  } else {
    throw new PythonBridgeError(
      `Generation failed: ${result.error || 'Unknown error'}`,
      result.details || ''
    );
  }
}

// Export wrapped version for CLI use
module.exports = ErrorHandler.wrapCLICommand('generate', generateCommandImpl);
