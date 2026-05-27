#!/usr/bin/env node
/**
 * Mermaid Syntax Validator
 * Validates Mermaid diagram syntax before storing
 *
 * Features:
 * - Basic syntax checking
 * - Diagram type validation
 * - Common error detection
 * - Helpful error messages
 *
 * @module hooks/lib/mermaid-validator
 */

class MermaidValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate Mermaid diagram syntax
   * @param {string} mermaidContent - Mermaid diagram code
   * @param {string} expectedType - Expected diagram type
   * @returns {Object} - Validation result
   */
  validate(mermaidContent, expectedType = null) {
    this.errors = [];
    this.warnings = [];

    if (!mermaidContent || typeof mermaidContent !== 'string') {
      this.errors.push('Mermaid content is required and must be a string');
      return this.getResult();
    }

    const trimmed = mermaidContent.trim();
    if (trimmed.length === 0) {
      this.errors.push('Mermaid content cannot be empty');
      return this.getResult();
    }

    // Detect diagram type from first line
    const firstLine = trimmed.split('\n')[0].trim();
    const detectedType = this.detectDiagramType(firstLine);

    if (!detectedType) {
      this.errors.push(`Invalid or missing diagram type. First line should be one of: flowchart, sequenceDiagram, classDiagram, erDiagram, journey`);
      return this.getResult();
    }

    // Validate expected type matches
    if (expectedType && detectedType !== expectedType) {
      this.errors.push(`Diagram type mismatch. Expected '${expectedType}', found '${detectedType}'`);
    }

    // Perform type-specific validation
    switch (detectedType) {
      case 'flowchart':
        this.validateFlowchart(trimmed);
        break;
      case 'sequenceDiagram':
        this.validateSequenceDiagram(trimmed);
        break;
      case 'classDiagram':
        this.validateClassDiagram(trimmed);
        break;
      case 'erDiagram':
        this.validateERDiagram(trimmed);
        break;
      case 'journey':
        this.validateJourney(trimmed);
        break;
    }

    // General syntax checks
    this.validateGeneralSyntax(trimmed);

    return this.getResult();
  }

  /**
   * Detect diagram type from first line
   */
  detectDiagramType(firstLine) {
    const typePatterns = {
      flowchart: /^flowchart\s+(TD|TB|BT|RL|LR)/,
      sequenceDiagram: /^sequenceDiagram/,
      classDiagram: /^classDiagram/,
      erDiagram: /^erDiagram/,
      journey: /^journey/
    };

    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(firstLine)) {
        return type;
      }
    }

    return null;
  }

  /**
   * Validate flowchart syntax
   */
  validateFlowchart(content) {
    const lines = content.split('\n');

    // Check for node definitions
    const nodePattern = /^\s+\w+[\[\(\{]/;
    const hasNodes = lines.some(line => nodePattern.test(line));

    if (!hasNodes) {
      this.warnings.push('Flowchart should contain node definitions');
    }

    // Check for connections
    const connectionPattern = /-->/;
    const hasConnections = lines.some(line => connectionPattern.test(line));

    if (!hasConnections) {
      this.warnings.push('Flowchart should contain node connections (-->)');
    }

    // Check for common syntax errors
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;
      if (i === 0) continue; // Skip first line (type declaration)

      // Unclosed brackets
      if (this.hasUnclosedBrackets(line)) {
        this.errors.push(`Line ${i + 1}: Unclosed brackets in '${line.substring(0, 40)}'`);
      }
    }
  }

  /**
   * Validate sequence diagram syntax
   */
  validateSequenceDiagram(content) {
    const lines = content.split('\n');

    // Check for participants
    const hasParticipants = lines.some(line =>
      line.trim().startsWith('participant ')
    );

    if (!hasParticipants) {
      this.warnings.push('Sequence diagram should define participants');
    }

    // Check for interactions
    const interactionPattern = /[-.]>>/;
    const hasInteractions = lines.some(line => interactionPattern.test(line));

    if (!hasInteractions) {
      this.errors.push('Sequence diagram must contain interactions (->>, ->>)');
    }

    // Validate participant references
    const participants = new Set();
    const references = new Set();

    for (const line of lines) {
      const participantMatch = line.match(/participant\s+(\w+)/);
      if (participantMatch) {
        participants.add(participantMatch[1]);
      }

      const interactionMatch = line.match(/(\w+)[-.]>>(\w+)/);
      if (interactionMatch) {
        references.add(interactionMatch[1]);
        references.add(interactionMatch[2]);
      }
    }

    for (const ref of references) {
      if (!participants.has(ref)) {
        this.warnings.push(`Participant '${ref}' is used but not defined`);
      }
    }
  }

  /**
   * Validate class diagram syntax
   */
  validateClassDiagram(content) {
    const lines = content.split('\n');

    // Check for class definitions
    const classPattern = /^\s+class\s+\w+/;
    const hasClasses = lines.some(line => classPattern.test(line));

    if (!hasClasses) {
      this.errors.push('Class diagram must contain class definitions');
    }

    // Check for balanced braces
    let braceCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (braceCount < 0) {
        this.errors.push(`Line ${i + 1}: Unmatched closing brace`);
        break;
      }
    }

    if (braceCount > 0) {
      this.errors.push('Unmatched opening brace in class diagram');
    }

    // Check for relationships
    const relationPattern = /(--|\.\.|\*--|o--)/;
    const hasRelations = lines.some(line => relationPattern.test(line));

    if (!hasRelations) {
      this.warnings.push('Class diagram typically includes relationships');
    }
  }

  /**
   * Validate ER diagram syntax
   */
  validateERDiagram(content) {
    const lines = content.split('\n');

    // Check for entity definitions
    const entityPattern = /^\s+\w+\s+{/;
    const hasEntities = lines.some(line => entityPattern.test(line));

    if (!hasEntities) {
      this.errors.push('ER diagram must contain entity definitions');
    }

    // Check for relationships
    const relationPattern = /\|\|--[o\|]/;
    const hasRelations = lines.some(line => relationPattern.test(line));

    if (!hasRelations) {
      this.warnings.push('ER diagram typically includes relationships');
    }

    // Check for balanced braces
    let braceCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (braceCount < 0) {
        this.errors.push(`Line ${i + 1}: Unmatched closing brace`);
        break;
      }
    }

    if (braceCount > 0) {
      this.errors.push('Unmatched opening brace in ER diagram');
    }
  }

  /**
   * Validate user journey syntax
   */
  validateJourney(content) {
    const lines = content.split('\n');

    // Check for title
    const hasTitle = lines.some(line => line.trim().startsWith('title '));

    if (!hasTitle) {
      this.warnings.push('Journey diagram should have a title');
    }

    // Check for sections
    const hasSection = lines.some(line => line.trim().startsWith('section '));

    if (!hasSection) {
      this.errors.push('Journey diagram must contain at least one section');
    }

    // Check for tasks (lines with scores)
    const taskPattern = /:\s*\d+\s*:/;
    const hasTasks = lines.some(line => taskPattern.test(line));

    if (!hasTasks) {
      this.errors.push('Journey diagram must contain tasks with scores');
    }
  }

  /**
   * General syntax validation
   */
  validateGeneralSyntax(content) {
    const lines = content.split('\n');

    // Check for very long lines
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 200) {
        this.warnings.push(`Line ${i + 1}: Very long line (${lines[i].length} chars), consider breaking it up`);
      }
    }

    // Check for special characters that might cause issues
    const problematicChars = /[<>]/;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (problematicChars.test(line) && !line.includes('-->') && !line.includes('->>')) {
        this.warnings.push(`Line ${i + 1}: Contains special characters (<, >) that might cause rendering issues`);
      }
    }

    // Check for reasonable line count
    if (lines.length > 100) {
      this.warnings.push(`Diagram is very large (${lines.length} lines), consider splitting into multiple diagrams`);
    }
  }

  /**
   * Check for unclosed brackets
   */
  hasUnclosedBrackets(line) {
    const brackets = { '[': ']', '(': ')', '{': '}' };
    const stack = [];

    for (const char of line) {
      if (brackets[char]) {
        stack.push(brackets[char]);
      } else if (Object.values(brackets).includes(char)) {
        if (stack.length === 0 || stack.pop() !== char) {
          return true;
        }
      }
    }

    return stack.length > 0;
  }

  /**
   * Get validation result
   */
  getResult() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      errorCount: this.errors.length,
      warningCount: this.warnings.length
    };
  }

  /**
   * Format result as string
   */
  formatResult(result) {
    const lines = [];

    if (result.valid) {
      lines.push('✓ Mermaid diagram is valid');
    } else {
      lines.push('✗ Mermaid diagram has errors');
    }

    if (result.errors.length > 0) {
      lines.push('\nErrors:');
      for (const error of result.errors) {
        lines.push(`  • ${error}`);
      }
    }

    if (result.warnings.length > 0) {
      lines.push('\nWarnings:');
      for (const warning of result.warnings) {
        lines.push(`  • ${warning}`);
      }
    }

    return lines.join('\n');
  }
}

module.exports = MermaidValidator;

// CLI usage
if (require.main === module) {
  const fs = require('fs');
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Mermaid Validator - Validate Mermaid diagram syntax

Usage: mermaid-validator.js <file> [--type <type>]

Options:
  --type <type>    Expected diagram type (flowchart, sequenceDiagram, etc.)

Examples:
  mermaid-validator.js diagram.md
  mermaid-validator.js diagram.md --type classDiagram
    `);
    process.exit(0);
  }

  const filePath = args[0];
  const typeIdx = args.indexOf('--type');
  const expectedType = typeIdx >= 0 ? args[typeIdx + 1] : null;

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Extract mermaid content if it's in a markdown code block
  const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
  const mermaidContent = mermaidMatch ? mermaidMatch[1] : content;

  const validator = new MermaidValidator();
  const result = validator.validate(mermaidContent, expectedType);

  console.log(validator.formatResult(result));

  process.exit(result.valid ? 0 : 1);
}
