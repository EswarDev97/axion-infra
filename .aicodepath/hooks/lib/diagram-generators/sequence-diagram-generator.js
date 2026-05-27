#!/usr/bin/env node
/**
 * Sequence Diagram Generator
 * Generates Mermaid sequence diagrams from code using LLM analysis
 *
 * Features:
 * - Traces API request flows
 * - Maps service interactions
 * - Identifies actors and participants
 * - Supports async/await patterns
 *
 * @module hooks/lib/diagram-generators/sequence-diagram-generator
 */

const path = require('path');
const fs = require('fs');

class SequenceDiagramGenerator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.participants = new Set();
    this.interactions = [];
  }

  /**
   * Generate sequence diagram from source files
   * @param {Array} sourceFiles - Array of file paths to analyze
   * @param {Object} options - Generation options
   * @returns {Object} - Generated diagram and metadata
   */
  generate(sourceFiles, options = {}) {
    const {
      title = 'Sequence Diagram',
      focusEndpoint = null,
      maxInteractions = 20,
      llmAnalysis = null  // Optional: pre-analyzed LLM output
    } = options;

    // Reset state
    this.participants.clear();
    this.interactions = [];

    if (llmAnalysis) {
      // Use LLM-provided analysis
      return this.generateFromLLMAnalysis(llmAnalysis, options);
    }

    // Pattern-based generation (fallback)
    return this.generateFromPatterns(sourceFiles, options);
  }

  /**
   * Generate from LLM analysis
   * Expects LLM to provide structured interaction data
   */
  generateFromLLMAnalysis(analysis, options) {
    const { title } = options;

    // Extract participants
    if (analysis.participants) {
      for (const participant of analysis.participants) {
        this.participants.add(participant);
      }
    }

    // Extract interactions
    if (analysis.interactions) {
      this.interactions = analysis.interactions.map(i => ({
        from: i.from,
        to: i.to,
        message: i.message,
        type: i.type || 'sync', // sync, async, return
        note: i.note || null
      }));
    }

    const mermaid = this.generateMermaid();

    return {
      title,
      mermaidContent: mermaid,
      sourceFiles: analysis.sourceFiles || [],
      entities: {
        participants: this.participants.size,
        interactions: this.interactions.length
      },
      confidence: analysis.confidence || 0.8,
      generationMethod: 'llm'
    };
  }

  /**
   * Generate from pattern matching (fallback when LLM not available)
   */
  generateFromPatterns(sourceFiles, options) {
    const { title, focusEndpoint, maxInteractions } = options;

    // Analyze files for patterns
    for (const filePath of sourceFiles) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.projectRoot, filePath);

      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, 'utf8');
      const language = this.detectLanguage(absolutePath);

      this.analyzeFile(content, filePath, language, focusEndpoint);
    }

    // Limit interactions
    if (this.interactions.length > maxInteractions) {
      this.interactions = this.interactions.slice(0, maxInteractions);
    }

    const mermaid = this.generateMermaid();

    return {
      title,
      mermaidContent: mermaid,
      sourceFiles,
      entities: {
        participants: this.participants.size,
        interactions: this.interactions.length
      },
      confidence: 0.6, // Pattern-based has lower confidence
      generationMethod: 'pattern'
    };
  }

  /**
   * Detect programming language
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
   * Analyze file for sequence patterns
   */
  analyzeFile(content, filePath, language, focusEndpoint) {
    // Identify participants
    this.extractParticipants(content, language);

    // Extract interactions
    this.extractInteractions(content, language, focusEndpoint);
  }

  /**
   * Extract participants (actors, services, components)
   */
  extractParticipants(content, language) {
    // Client/User actor
    if (content.match(/router\.|app\.(get|post|put|delete)/)) {
      this.participants.add('Client');
    }

    // Controllers
    const controllerMatch = content.match(/class\s+(\w*Controller)/g);
    if (controllerMatch) {
      for (const match of controllerMatch) {
        const name = match.match(/class\s+(\w+)/)[1];
        this.participants.add(name);
      }
    }

    // Services
    const serviceMatch = content.match(/class\s+(\w*Service)/g);
    if (serviceMatch) {
      for (const match of serviceMatch) {
        const name = match.match(/class\s+(\w+)/)[1];
        this.participants.add(name);
      }
    }

    // Repositories
    const repoMatch = content.match(/class\s+(\w*Repository)/g);
    if (repoMatch) {
      for (const match of repoMatch) {
        const name = match.match(/class\s+(\w+)/)[1];
        this.participants.add(name);
      }
    }

    // Database
    if (content.match(/\.(query|findOne|findMany|create|update|delete)/)) {
      this.participants.add('Database');
    }

    // External API
    if (content.match(/fetch|axios|http\.(get|post)/)) {
      this.participants.add('External API');
    }
  }

  /**
   * Extract interactions between participants
   */
  extractInteractions(content, language, focusEndpoint) {
    const lines = content.split('\n');

    let currentActor = null;
    let inFunction = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect function/method entry
      const funcMatch = trimmed.match(/(?:async\s+)?(\w+)\s*\([^)]*\)/);
      if (funcMatch && (trimmed.includes('function') || trimmed.includes('async'))) {
        currentActor = this.guessActor(funcMatch[1]);
        inFunction = true;
        continue;
      }

      if (!inFunction) continue;

      // Function exit
      if (trimmed === '}' && inFunction) {
        inFunction = false;
        currentActor = null;
      }

      // Database calls
      if (trimmed.match(/\.(query|findOne|findMany|create|update|delete)/)) {
        const operation = trimmed.match(/\.(query|findOne|findMany|create|update|delete)/)[1];
        this.interactions.push({
          from: currentActor || 'Service',
          to: 'Database',
          message: operation,
          type: 'sync'
        });
      }

      // External API calls
      if (trimmed.match(/(fetch|axios\.(get|post))/)) {
        const method = trimmed.match(/(get|post|put|delete)/i)?.[1] || 'call';
        this.interactions.push({
          from: currentActor || 'Service',
          to: 'External API',
          message: method.toUpperCase(),
          type: 'async'
        });
      }

      // Service calls
      const serviceCall = trimmed.match(/(\w+Service)\.\w+\(/);
      if (serviceCall) {
        this.interactions.push({
          from: currentActor || 'Controller',
          to: serviceCall[1],
          message: 'process',
          type: 'sync'
        });
      }
    }
  }

  /**
   * Guess actor from function name
   */
  guessActor(functionName) {
    const lower = functionName.toLowerCase();
    if (lower.includes('controller') || lower.includes('handler')) return 'Controller';
    if (lower.includes('service')) return 'Service';
    if (lower.includes('repository') || lower.includes('repo')) return 'Repository';
    return 'Service';
  }

  /**
   * Generate Mermaid sequence diagram
   */
  generateMermaid() {
    const lines = ['sequenceDiagram'];

    // Ensure all actors referenced in interactions are added as participants
    for (const interaction of this.interactions) {
      if (interaction.from) this.participants.add(interaction.from);
      if (interaction.to) this.participants.add(interaction.to);
    }

    // Add participants
    for (const participant of this.participants) {
      lines.push(`    participant ${participant}`);
    }

    // Add interactions
    for (const interaction of this.interactions) {
      let arrow;
      switch (interaction.type) {
        case 'async':
          arrow = '-)';
          break;
        case 'return':
          arrow = '-->';
          break;
        case 'sync':
        default:
          arrow = '->>';
      }

      lines.push(`    ${interaction.from}${arrow}${interaction.to}: ${interaction.message}`);

      if (interaction.note) {
        lines.push(`    Note over ${interaction.to}: ${interaction.note}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Template for LLM prompt to generate sequence diagram
   * This can be used by the calling code to request LLM analysis
   */
  static getLLMPromptTemplate(sourceFiles, options = {}) {
    const { focusEndpoint, businessTransaction } = options;

    return `
Analyze the following source files and generate a sequence diagram showing the interaction flow.

${focusEndpoint ? `Focus on endpoint: ${focusEndpoint}` : ''}
${businessTransaction ? `Business transaction: ${businessTransaction}` : ''}

Please provide:
1. List of participants (actors, services, components, databases)
2. Sequence of interactions with:
   - from: source participant
   - to: target participant
   - message: brief description
   - type: sync/async/return
   - note (optional): additional context

Return as JSON:
{
  "participants": ["Client", "OrderService", "PaymentService", "Database"],
  "interactions": [
    {"from": "Client", "to": "OrderService", "message": "POST /orders", "type": "sync"},
    {"from": "OrderService", "to": "Database", "message": "create order", "type": "sync"},
    {"from": "OrderService", "to": "PaymentService", "message": "process payment", "type": "async"}
  ],
  "confidence": 0.9,
  "sourceFiles": [...]
}

Source files:
${sourceFiles.map(f => `- ${f}`).join('\n')}
    `.trim();
  }
}

module.exports = SequenceDiagramGenerator;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Sequence Diagram Generator - Generate Mermaid sequence diagrams

Usage: sequence-diagram-generator.js <file1> [file2] [...]

Options:
  --title <title>           Set diagram title
  --endpoint <path>         Focus on specific endpoint
  --llm-prompt              Show LLM prompt template

Examples:
  sequence-diagram-generator.js src/controllers/OrderController.ts
  sequence-diagram-generator.js src/**/*.ts --endpoint "/api/orders"
  sequence-diagram-generator.js --llm-prompt
    `);
    process.exit(0);
  }

  if (args.includes('--llm-prompt')) {
    console.log(SequenceDiagramGenerator.getLLMPromptTemplate(['example.ts']));
    process.exit(0);
  }

  const files = args.filter(a => !a.startsWith('--'));
  const titleIdx = args.indexOf('--title');
  const title = titleIdx >= 0 ? args[titleIdx + 1] : 'Sequence Diagram';
  const endpointIdx = args.indexOf('--endpoint');
  const focusEndpoint = endpointIdx >= 0 ? args[endpointIdx + 1] : null;

  const generator = new SequenceDiagramGenerator(process.cwd());
  const result = generator.generate(files, { title, focusEndpoint });

  console.log(`\n# ${result.title}\n`);
  console.log('```mermaid');
  console.log(result.mermaidContent);
  console.log('```\n');
  console.log(`Participants: ${result.entities.participants}`);
  console.log(`Interactions: ${result.entities.interactions}`);
  console.log(`Method: ${result.generationMethod}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
}
