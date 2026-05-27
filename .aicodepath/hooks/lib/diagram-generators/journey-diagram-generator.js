#!/usr/bin/env node
/**
 * User Journey Diagram Generator
 * Generates Mermaid user journey diagrams from user stories and requirements
 *
 * Features:
 * - Maps user stories to journey steps
 * - Identifies user satisfaction levels
 * - Visualizes user flow through system
 * - Requires LLM analysis (cannot be pattern-based)
 *
 * @module hooks/lib/diagram-generators/journey-diagram-generator
 */

const path = require('path');
const fs = require('fs');

class JourneyDiagramGenerator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.sections = [];
  }

  /**
   * Generate journey diagram from requirements/stories
   * @param {Array} sourceFiles - Array of file paths (stories, requirements)
   * @param {Object} options - Generation options
   * @returns {Object} - Generated diagram and metadata
   */
  generate(sourceFiles, options = {}) {
    const {
      title = 'User Journey',
      userPersona = 'User',
      llmAnalysis = null  // Required: LLM-analyzed journey
    } = options;

    // Reset state
    this.sections = [];

    if (llmAnalysis) {
      return this.generateFromLLMAnalysis(llmAnalysis, options);
    }

    // Try to extract from user stories (basic pattern matching)
    return this.generateFromStories(sourceFiles, options);
  }

  /**
   * Generate from LLM analysis
   * Expects structured journey data from LLM
   */
  generateFromLLMAnalysis(analysis, options) {
    const { title, userPersona } = options;

    // Extract sections
    if (analysis.sections) {
      this.sections = analysis.sections.map(section => ({
        name: section.name,
        tasks: section.tasks.map(task => ({
          name: task.name,
          score: task.score || 3  // 1-5 satisfaction score
        }))
      }));
    }

    const mermaid = this.generateMermaid(userPersona);

    return {
      title,
      mermaidContent: mermaid,
      sourceFiles: analysis.sourceFiles || [],
      entities: {
        sections: this.sections.length,
        totalTasks: this.sections.reduce((sum, s) => sum + s.tasks.length, 0)
      },
      confidence: analysis.confidence || 0.9,
      generationMethod: 'llm'
    };
  }

  /**
   * Generate from user stories (basic pattern matching)
   */
  generateFromStories(sourceFiles, options) {
    const { title, userPersona } = options;

    // Read story files
    for (const filePath of sourceFiles) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.projectRoot, filePath);

      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, 'utf8');
      this.extractFromStories(content);
    }

    if (this.sections.length === 0) {
      // Create placeholder
      this.sections.push({
        name: 'Discovery',
        tasks: [
          { name: 'Find product', score: 3 },
          { name: 'View details', score: 4 }
        ]
      });
    }

    const mermaid = this.generateMermaid(userPersona);

    return {
      title,
      mermaidContent: mermaid,
      sourceFiles,
      entities: {
        sections: this.sections.length,
        totalTasks: this.sections.reduce((sum, s) => sum + s.tasks.length, 0)
      },
      confidence: 0.5, // Low confidence without LLM
      generationMethod: 'pattern'
    };
  }

  /**
   * Extract journey from user stories
   */
  extractFromStories(content) {
    // Look for "As a ... I want to ... so that ..." patterns
    const storyRegex = /As\s+a\s+([^,]+),?\s+I\s+want\s+to\s+([^,]+),?\s+so\s+that\s+([^.\n]+)/gi;
    let match;

    const tasks = [];
    while ((match = storyRegex.exec(content)) !== null) {
      const want = match[2].trim();
      tasks.push({
        name: want.substring(0, 40),
        score: 3 // Default neutral
      });
    }

    if (tasks.length > 0) {
      this.sections.push({
        name: 'User Flow',
        tasks
      });
    }
  }

  /**
   * Generate Mermaid user journey diagram
   */
  generateMermaid(userPersona) {
    const lines = ['journey'];
    lines.push(`    title ${userPersona} Journey`);

    for (const section of this.sections) {
      lines.push(`    section ${section.name}`);
      for (const task of section.tasks) {
        lines.push(`      ${task.name}: ${task.score}: ${userPersona}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Template for LLM prompt to generate journey diagram
   */
  static getLLMPromptTemplate(sourceFiles, options = {}) {
    const { userPersona = 'User', businessContext } = options;

    return `
Analyze the following user stories/requirements and generate a user journey diagram.

User Persona: ${userPersona}
${businessContext ? `Business Context: ${businessContext}` : ''}

Please provide a structured journey with:
1. Sections (major phases like "Discovery", "Purchase", "Post-Purchase")
2. For each section, list tasks with:
   - name: brief task description
   - score: satisfaction level (1=very dissatisfied, 5=very satisfied)

Return as JSON:
{
  "sections": [
    {
      "name": "Discovery",
      "tasks": [
        {"name": "Browse products", "score": 4},
        {"name": "Search for item", "score": 3}
      ]
    },
    {
      "name": "Purchase",
      "tasks": [
        {"name": "Add to cart", "score": 5},
        {"name": "Checkout", "score": 3},
        {"name": "Enter payment", "score": 2}
      ]
    }
  ],
  "confidence": 0.9,
  "sourceFiles": [...]
}

Source files:
${sourceFiles.map(f => `- ${f}`).join('\n')}
    `.trim();
  }
}

module.exports = JourneyDiagramGenerator;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
User Journey Diagram Generator - Generate Mermaid user journey diagrams

Usage: journey-diagram-generator.js <file1> [file2] [...]

Options:
  --title <title>           Set diagram title
  --persona <name>          User persona name (default: "User")
  --llm-prompt              Show LLM prompt template

Examples:
  journey-diagram-generator.js docs/stories/user-stories.md
  journey-diagram-generator.js docs/requirements.md --persona "Customer"
  journey-diagram-generator.js --llm-prompt
    `);
    process.exit(0);
  }

  if (args.includes('--llm-prompt')) {
    console.log(JourneyDiagramGenerator.getLLMPromptTemplate(['stories.md']));
    process.exit(0);
  }

  const files = args.filter(a => !a.startsWith('--'));
  const titleIdx = args.indexOf('--title');
  const title = titleIdx >= 0 ? args[titleIdx + 1] : 'User Journey';
  const personaIdx = args.indexOf('--persona');
  const userPersona = personaIdx >= 0 ? args[personaIdx + 1] : 'User';

  const generator = new JourneyDiagramGenerator(process.cwd());
  const result = generator.generate(files, { title, userPersona });

  console.log(`\n# ${result.title}\n`);
  console.log('```mermaid');
  console.log(result.mermaidContent);
  console.log('```\n');
  console.log(`Sections: ${result.entities.sections}`);
  console.log(`Total Tasks: ${result.entities.totalTasks}`);
  console.log(`Method: ${result.generationMethod}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
}
