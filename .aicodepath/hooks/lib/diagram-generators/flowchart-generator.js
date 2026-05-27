#!/usr/bin/env node
/**
 * Flowchart Generator
 * Generates Mermaid flowcharts from code control flow using pattern matching
 *
 * Features:
 * - Extracts control flow from functions
 * - Identifies decision points (if/switch)
 * - Maps loops and iterations
 * - Detects function calls and branches
 *
 * @module hooks/lib/diagram-generators/flowchart-generator
 */

const path = require('path');
const fs = require('fs');

class FlowchartGenerator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.nodes = [];
    this.edges = [];
    this.nodeCounter = 0;
  }

  /**
   * Generate flowchart from source files
   * @param {Array} sourceFiles - Array of file paths to analyze
   * @param {Object} options - Generation options
   * @returns {Object} - Generated diagram and metadata
   */
  generate(sourceFiles, options = {}) {
    const {
      title = 'System Flowchart',
      maxDepth = 3,
      includeDetails = false,
      focusFunction = null
    } = options;

    // Reset state
    this.nodes = [];
    this.edges = [];
    this.nodeCounter = 0;

    if (focusFunction) {
      // Generate flowchart for a specific function
      return this.generateFunctionFlowchart(sourceFiles, focusFunction, options);
    }

    // Generate high-level system flowchart
    return this.generateSystemFlowchart(sourceFiles, options);
  }

  /**
   * Generate system-level flowchart showing main flow
   */
  generateSystemFlowchart(sourceFiles, options) {
    const { title, includeDetails } = options;

    // Start node
    const startNode = this.addNode('Start', 'start', 'Start');

    let currentNode = startNode;

    // Analyze files for main entry points and flow
    for (const filePath of sourceFiles) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.projectRoot, filePath);

      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, 'utf8');
      const language = this.detectLanguage(absolutePath);

      // Extract main functions and flow
      const mainFlow = this.extractMainFlow(content, language);

      for (const step of mainFlow) {
        const stepNode = this.addNode(step.label, step.type, step.details);
        this.addEdge(currentNode, stepNode, step.condition);
        currentNode = stepNode;
      }
    }

    // End node
    const endNode = this.addNode('End', 'end', 'End');
    this.addEdge(currentNode, endNode);

    const mermaid = this.generateMermaid();

    return {
      title,
      mermaidContent: mermaid,
      sourceFiles,
      entities: {
        nodes: this.nodes.length,
        edges: this.edges.length
      },
      confidence: 0.6 // Pattern-based has moderate confidence
    };
  }

  /**
   * Generate flowchart for a specific function
   */
  generateFunctionFlowchart(sourceFiles, functionName, options) {
    const { title } = options;

    // Find function in source files
    let functionContent = null;
    let foundInFile = null;

    for (const filePath of sourceFiles) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.projectRoot, filePath);

      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, 'utf8');
      const language = this.detectLanguage(absolutePath);

      const extracted = this.extractFunction(content, functionName, language);
      if (extracted) {
        functionContent = extracted;
        foundInFile = filePath;
        break;
      }
    }

    if (!functionContent) {
      return {
        title,
        mermaidContent: 'flowchart TD\n    Error[Function not found]',
        sourceFiles,
        entities: { nodes: 0, edges: 0 },
        confidence: 0
      };
    }

    // Parse function control flow
    this.parseFunctionFlow(functionContent, functionName);

    const mermaid = this.generateMermaid();

    return {
      title: title || `${functionName} Flow`,
      mermaidContent: mermaid,
      sourceFiles: [foundInFile],
      entities: {
        nodes: this.nodes.length,
        edges: this.edges.length
      },
      confidence: 0.7
    };
  }

  /**
   * Detect programming language from file extension
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const langMap = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python'
    };
    return langMap[ext] || 'unknown';
  }

  /**
   * Extract main flow from file content
   */
  extractMainFlow(content, language) {
    const flow = [];

    // Look for common patterns
    const patterns = {
      // HTTP request handling
      route: /(?:router|app)\.(get|post|put|delete|patch)\s*\(['"]([\w\/:]+)['"]/gi,
      // Main function
      main: /(?:function\s+main|def\s+main|async\s+function\s+main)/gi,
      // Class constructor
      constructor: /constructor\s*\(/gi,
      // Initialization
      init: /(?:function\s+init|initialize|setup)/gi,
      // Processing
      process: /(?:function\s+process|handle|execute)/gi,
      // Validation
      validate: /(?:function\s+validate|check|verify)/gi,
      // Database operations
      db: /(?:db\.|database\.|query|findOne|findMany|create|update|delete)/gi,
      // API calls
      api: /(?:fetch|axios|http\.get|http\.post|api\.)/gi,
      // Error handling
      error: /(?:try\s*\{|catch\s*\(|throw\s+new)/gi
    };

    for (const [type, regex] of Object.entries(patterns)) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        let label = '';
        let details = match[0].substring(0, 50);

        switch (type) {
          case 'route':
            label = `${match[1].toUpperCase()} ${match[2]}`;
            break;
          case 'main':
            label = 'Main Entry Point';
            break;
          case 'constructor':
            label = 'Initialize';
            break;
          case 'init':
            label = 'Setup';
            break;
          case 'process':
            label = 'Process Request';
            break;
          case 'validate':
            label = 'Validate Input';
            break;
          case 'db':
            label = 'Database Operation';
            break;
          case 'api':
            label = 'API Call';
            break;
          case 'error':
            label = 'Error Handling';
            break;
        }

        if (label) {
          flow.push({
            type: type === 'route' ? 'process' : type === 'error' ? 'decision' : 'process',
            label,
            details
          });
        }
      }
    }

    // Remove duplicates and limit
    const unique = [];
    const seen = new Set();
    for (const item of flow) {
      if (!seen.has(item.label) && unique.length < 10) {
        seen.add(item.label);
        unique.push(item);
      }
    }

    return unique;
  }

  /**
   * Extract function from content
   */
  extractFunction(content, functionName, language) {
    let funcRegex;

    switch (language) {
      case 'typescript':
      case 'javascript':
        funcRegex = new RegExp(
          `(?:export\\s+)?(?:async\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)[^{]*\\{([\\s\\S]*?)\\n\\}`,
          'i'
        );
        break;
      case 'python':
        funcRegex = new RegExp(
          `def\\s+${functionName}\\s*\\([^)]*\\):[\\s\\S]*?(?=\\ndef\\s|\\nclass\\s|$)`,
          'i'
        );
        break;
      default:
        return null;
    }

    const match = content.match(funcRegex);
    return match ? match[0] : null;
  }

  /**
   * Parse function control flow
   */
  parseFunctionFlow(functionContent, functionName) {
    // Start node
    const startNode = this.addNode(functionName, 'start', 'Function Entry');
    let currentNode = startNode;

    // Split into statements
    const lines = functionContent.split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip function declaration
      if (line.includes('function') || line.includes('def ')) continue;

      // If statement
      if (line.match(/^if\s*\(/)) {
        const condition = this.extractCondition(line);
        const decisionNode = this.addNode(condition, 'decision', line);
        this.addEdge(currentNode, decisionNode);

        // Yes branch
        const yesNode = this.addNode('Process', 'process', 'If true');
        this.addEdge(decisionNode, yesNode, 'Yes');

        // No branch
        const noNode = this.addNode('Alternative', 'process', 'If false');
        this.addEdge(decisionNode, noNode, 'No');

        currentNode = yesNode; // Continue from yes branch
        continue;
      }

      // Loop
      if (line.match(/^(?:for|while|forEach)/)) {
        const loopCondition = this.extractCondition(line);
        const loopNode = this.addNode(loopCondition, 'decision', line);
        this.addEdge(currentNode, loopNode);

        const loopBody = this.addNode('Loop Body', 'process', 'Iterate');
        this.addEdge(loopNode, loopBody, 'Continue');

        // Loop back
        this.addEdge(loopBody, loopNode);

        const afterLoop = this.addNode('Continue', 'process', 'After loop');
        this.addEdge(loopNode, afterLoop, 'Done');

        currentNode = afterLoop;
        continue;
      }

      // Return statement
      if (line.match(/^return/)) {
        const returnNode = this.addNode('Return', 'end', line);
        this.addEdge(currentNode, returnNode);
        currentNode = returnNode;
        continue;
      }

      // Throw/error
      if (line.match(/^throw/)) {
        const errorNode = this.addNode('Throw Error', 'end', line);
        this.addEdge(currentNode, errorNode);
        continue;
      }

      // Try-catch
      if (line.match(/^try/)) {
        const tryNode = this.addNode('Try', 'process', 'Attempt operation');
        this.addEdge(currentNode, tryNode);

        const successNode = this.addNode('Success', 'process', 'Operation succeeded');
        this.addEdge(tryNode, successNode, 'Success');

        const catchNode = this.addNode('Handle Error', 'process', 'Catch exception');
        this.addEdge(tryNode, catchNode, 'Error');

        currentNode = successNode;
        continue;
      }

      // Function call (important ones)
      const callMatch = line.match(/await\s+(\w+)\(/);
      if (callMatch) {
        const callNode = this.addNode(`Call ${callMatch[1]}`, 'process', line);
        this.addEdge(currentNode, callNode);
        currentNode = callNode;
      }
    }

    // End node
    if (currentNode.type !== 'end') {
      const endNode = this.addNode('End', 'end', 'Function Exit');
      this.addEdge(currentNode, endNode);
    }
  }

  /**
   * Extract condition from if/while statement
   */
  extractCondition(line) {
    const match = line.match(/(?:if|while)\s*\(([^)]+)\)/);
    if (match) {
      return match[1].trim().substring(0, 30);
    }
    return 'Condition';
  }

  /**
   * Add a node to the flowchart
   */
  addNode(label, type, details) {
    const id = `node${this.nodeCounter++}`;
    const node = { id, label, type, details };
    this.nodes.push(node);
    return node;
  }

  /**
   * Add an edge between nodes
   */
  addEdge(from, to, label = '') {
    this.edges.push({ from: from.id, to: to.id, label });
  }

  /**
   * Generate Mermaid flowchart
   */
  generateMermaid() {
    const lines = ['flowchart TD'];

    // Add nodes with shapes based on type
    for (const node of this.nodes) {
      let shape;
      switch (node.type) {
        case 'start':
        case 'end':
          shape = `([${node.label}])`;
          break;
        case 'decision':
          shape = `{${node.label}}`;
          break;
        case 'process':
        default:
          shape = `[${node.label}]`;
      }

      lines.push(`    ${node.id}${shape}`);
    }

    // Add edges
    for (const edge of this.edges) {
      const label = edge.label ? `|${edge.label}|` : '';
      lines.push(`    ${edge.from} -->${label} ${edge.to}`);
    }

    return lines.join('\n');
  }
}

module.exports = FlowchartGenerator;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Flowchart Generator - Generate Mermaid flowcharts from code

Usage: flowchart-generator.js <file1> [file2] [...]

Options:
  --title <title>           Set diagram title
  --function <name>         Generate flowchart for specific function
  --include-details         Include detailed annotations

Examples:
  flowchart-generator.js src/main.ts --title "System Flow"
  flowchart-generator.js src/service.ts --function processOrder
    `);
    process.exit(0);
  }

  const files = args.filter(a => !a.startsWith('--'));
  const titleIdx = args.indexOf('--title');
  const title = titleIdx >= 0 ? args[titleIdx + 1] : 'Flowchart';
  const funcIdx = args.indexOf('--function');
  const focusFunction = funcIdx >= 0 ? args[funcIdx + 1] : null;
  const includeDetails = args.includes('--include-details');

  const generator = new FlowchartGenerator(process.cwd());
  const result = generator.generate(files, { title, focusFunction, includeDetails });

  console.log(`\n# ${result.title}\n`);
  console.log('```mermaid');
  console.log(result.mermaidContent);
  console.log('```\n');
  console.log(`Nodes: ${result.entities.nodes}`);
  console.log(`Edges: ${result.entities.edges}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
}
