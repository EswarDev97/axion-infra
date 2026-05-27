#!/usr/bin/env node
/**
 * Class Diagram Generator
 * Generates Mermaid class diagrams from code using static analysis (AST)
 *
 * Features:
 * - Extracts classes, interfaces, and type definitions
 * - Maps inheritance (extends) and implementation (implements)
 * - Identifies methods and properties
 * - Supports TypeScript, JavaScript, and Python
 *
 * @module hooks/lib/diagram-generators/class-diagram-generator
 */

const path = require('path');
const fs = require('fs');
const pathResolver = require('../../../lib/path-resolver');

class ClassDiagramGenerator {
  static JS_KEYWORDS = new Set([
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'throw', 'try', 'catch', 'finally', 'new', 'delete', 'typeof',
    'void', 'const', 'let', 'var', 'function', 'class', 'import', 'export',
    'default', 'from', 'await', 'yield', 'this', 'super', 'true', 'false',
    'null', 'undefined', 'in', 'of', 'instanceof', 'with', 'debugger'
  ]);

  /**
   * Sanitize a string for safe use in Mermaid class diagrams.
   * Removes characters that break Mermaid parsing: | { } " ' ; < >
   */
  static sanitizeMermaid(str) {
    if (!str) return '';
    return str
      .replace(/[|{};"'<>\[\](),~#]/g, '')
      .replace(/\s+/g, '_')
      .trim()
      .substring(0, 30);
  }

  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.classes = new Map();
    this.interfaces = new Map();
    this.relations = [];
  }

  /**
   * Generate class diagram from source files
   * @param {Array} sourceFiles - Array of file paths to analyze
   * @param {Object} options - Generation options
   * @returns {Object} - Generated diagram and metadata
   */
  generate(sourceFiles, options = {}) {
    const {
      includePrivate = false,
      maxMethods = 10,
      maxProperties = 10,
      title = 'Class Diagram'
    } = options;

    // Reset state
    this.classes.clear();
    this.interfaces.clear();
    this.relations = [];

    // Analyze each file
    for (const filePath of sourceFiles) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.projectRoot, filePath);

      if (!fs.existsSync(absolutePath)) continue;

      const content = fs.readFileSync(absolutePath, 'utf8');
      const language = this.detectLanguage(absolutePath);

      this.analyzeFile(content, filePath, language, { includePrivate });
    }

    // Generate Mermaid diagram
    const mermaid = this.generateMermaid({ maxMethods, maxProperties });

    return {
      title,
      mermaidContent: mermaid,
      sourceFiles,
      entities: {
        classes: Array.from(this.classes.keys()),
        interfaces: Array.from(this.interfaces.keys()),
        relations: this.relations.length
      },
      confidence: this.calculateConfidence()
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
   * Analyze a file and extract class information
   */
  analyzeFile(content, filePath, language, options) {
    switch (language) {
      case 'typescript':
      case 'javascript':
        this.analyzeJavaScript(content, filePath, options);
        break;
      case 'python':
        this.analyzePython(content, filePath, options);
        break;
    }
  }

  /**
   * Analyze JavaScript/TypeScript file
   */
  analyzeJavaScript(content, filePath, options) {
    const lines = content.split('\n');

    // Extract interfaces
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([\w,\s]+))?\s*\{/g;
    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const name = match[1];
      const extendsInterfaces = match[2] ? match[2].split(',').map(s => s.trim()) : [];

      this.interfaces.set(name, {
        name,
        extends: extendsInterfaces,
        methods: [],
        properties: [],
        filePath
      });

      // Add extends relations
      for (const ext of extendsInterfaces) {
        this.relations.push({ from: name, to: ext, type: 'extends' });
      }
    }

    // Extract classes
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const extendsClass = match[2];
      const implementsInterfaces = match[3] ? match[3].split(',').map(s => s.trim()) : [];
      const isAbstract = match[0].includes('abstract');

      const classInfo = {
        name,
        extends: extendsClass,
        implements: implementsInterfaces,
        methods: [],
        properties: [],
        isAbstract,
        filePath
      };

      // Extract class body for methods and properties
      const bodyStart = match.index + match[0].length;
      const body = this.extractClassBody(content, bodyStart);
      this.extractMembers(body, classInfo, options);

      this.classes.set(name, classInfo);

      // Add relations
      if (extendsClass) {
        this.relations.push({ from: name, to: extendsClass, type: 'extends' });
      }
      for (const iface of implementsInterfaces) {
        this.relations.push({ from: name, to: iface, type: 'implements' });
      }
    }

    // Extract type aliases (simplified as interfaces)
    const typeRegex = /(?:export\s+)?type\s+(\w+)\s*=\s*\{/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const name = match[1];
      this.interfaces.set(name, {
        name,
        extends: [],
        methods: [],
        properties: [],
        isType: true,
        filePath
      });
    }
  }

  /**
   * Analyze Python file
   */
  analyzePython(content, filePath, options) {
    const classRegex = /class\s+(\w+)(?:\(([^)]+)\))?:/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const name = match[1];
      const bases = match[2] ? match[2].split(',').map(s => s.trim()) : [];

      const classInfo = {
        name,
        extends: bases.length > 0 ? bases[0] : null,
        implements: bases.slice(1),
        methods: [],
        properties: [],
        isAbstract: false,
        filePath
      };

      // Extract class body
      const bodyStart = match.index;
      const body = this.extractPythonClassBody(content, bodyStart);
      this.extractPythonMembers(body, classInfo, options);

      this.classes.set(name, classInfo);

      // Add relations
      for (const base of bases) {
        if (!base.startsWith('ABC') && base !== 'object') {
          this.relations.push({ from: name, to: base, type: 'extends' });
        }
      }
    }
  }

  /**
   * Extract class body from JavaScript/TypeScript
   */
  extractClassBody(content, startIndex) {
    // Start at 1 because we're already inside the class opening brace
    let braceCount = 1;
    let body = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      body += char;

      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return body;
        }
      }
    }

    return body;
  }

  /**
   * Extract Python class body
   */
  extractPythonClassBody(content, startIndex) {
    const lines = content.substring(startIndex).split('\n');
    const baseIndent = lines[0].match(/^\s*/)?.[0].length || 0;
    const bodyLines = [lines[0]];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const indent = line.match(/^\s*/)?.[0].length || 0;

      if (line.trim() === '') {
        bodyLines.push(line);
        continue;
      }

      if (indent <= baseIndent) break;
      bodyLines.push(line);
    }

    return bodyLines.join('\n');
  }

  /**
   * Extract methods and properties from class body (JS/TS)
   */
  extractMembers(body, classInfo, options) {
    const { includePrivate } = options;
    const lines = body.split('\n');
    const seen = new Set();

    for (const line of lines) {
      const trimmed = line.trim();

      // Only match lines that START with an optional modifier then a method name
      // This avoids matching obj.method() calls mid-line
      const methodMatch = trimmed.match(
        /^(?:(public|private|protected|static|async)\s+)*(?:(public|private|protected|static|async)\s+)?([\w$]+)\s*\(([^)]*)\)(?:\s*:\s*([\w<>,\s[\]]+))?\s*\{?\s*$/
      );
      if (methodMatch) {
        const mods = (methodMatch[1] || '') + ' ' + (methodMatch[2] || '');
        const name = methodMatch[3];
        const returnType = methodMatch[5]?.trim();

        if (name === 'constructor') continue;
        if (ClassDiagramGenerator.JS_KEYWORDS.has(name)) continue;
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) continue;
        if (!includePrivate && (mods.includes('private') || name.startsWith('_'))) continue;
        if (seen.has('m:' + name)) continue;
        seen.add('m:' + name);

        const visibility = mods.includes('private') ? '-' :
                          mods.includes('protected') ? '#' : '+';

        classInfo.methods.push({
          name,
          visibility,
          params: methodMatch[4] ? methodMatch[4].split(',').map(p => p.trim()).filter(Boolean) : [],
          returnType: returnType || 'void',
          isStatic: mods.includes('static'),
          isAsync: mods.includes('async')
        });
        continue;
      }

      // Match property declarations - MUST have explicit modifier or type annotation
      // Format: [modifier] name[?]: type [= value];
      const propMatch = trimmed.match(
        /^((?:(?:public|private|protected|readonly|static)\s+)+)([\w$]+)\??(?:\s*:\s*([\w]+))?\s*(?:=\s*[^;]+)?\s*;?\s*$/
      ) || trimmed.match(
        /^([\w$]+)\s*:\s*([\w]+)\s*(?:=\s*[^;]+)?\s*;\s*$/
      );
      if (propMatch) {
        let mods, name, type;
        if (propMatch.length === 4) {
          // First regex: has modifier
          mods = propMatch[1] || '';
          name = propMatch[2];
          type = propMatch[3]?.trim();
        } else {
          // Second regex: has type annotation with semicolon
          mods = '';
          name = propMatch[1];
          type = propMatch[2]?.trim();
        }

        if (ClassDiagramGenerator.JS_KEYWORDS.has(name)) continue;
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) continue;
        if (!includePrivate && (mods.includes('private') || name.startsWith('_'))) continue;
        if (seen.has('p:' + name)) continue;
        seen.add('p:' + name);

        const visibility = mods.includes('private') ? '-' :
                          mods.includes('protected') ? '#' : '+';

        classInfo.properties.push({
          name,
          visibility,
          type: type || 'any',
          isStatic: mods.includes('static'),
          isReadonly: mods.includes('readonly')
        });
      }
    }
  }

  /**
   * Extract methods and properties from Python class
   */
  extractPythonMembers(body, classInfo, options) {
    const { includePrivate } = options;

    // Extract methods
    const methodRegex = /def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/g;
    let match;

    while ((match = methodRegex.exec(body)) !== null) {
      const name = match[1];
      const params = match[2];
      const returnType = match[3]?.trim();

      // Skip magic methods and private if not included
      if (name.startsWith('__') && name.endsWith('__')) continue;
      if (!includePrivate && name.startsWith('_')) continue;

      const visibility = name.startsWith('_') ? '-' : '+';

      classInfo.methods.push({
        name,
        visibility,
        params: params ? params.split(',').map(p => p.trim()).filter(p => p && p !== 'self') : [],
        returnType: returnType || 'None',
        isStatic: false
      });
    }

    // Extract properties (class-level assignments)
    const propRegex = /^\s+(\w+)(?:\s*:\s*([^=\n]+))?(?:\s*=\s*[^\n]+)?$/gm;
    while ((match = propRegex.exec(body)) !== null) {
      const name = match[1];
      const type = match[2]?.trim();

      if (!includePrivate && name.startsWith('_')) continue;
      if (name === 'self') continue;

      const visibility = name.startsWith('_') ? '-' : '+';

      classInfo.properties.push({
        name,
        visibility,
        type: type || 'Any'
      });
    }
  }

  /**
   * Generate Mermaid class diagram
   */
  generateMermaid(options) {
    const { maxMethods, maxProperties } = options;
    const lines = ['classDiagram'];

    // Add interfaces
    for (const [name, iface] of this.interfaces) {
      lines.push(`    class ${name} {`);
      lines.push(`        <<interface>>`);

      // Add properties (limited)
      const props = iface.properties.slice(0, maxProperties);
      for (const prop of props) {
        const safePType = ClassDiagramGenerator.sanitizeMermaid(prop.type);
        const safePName = ClassDiagramGenerator.sanitizeMermaid(prop.name);
        if (!safePName) continue;
        lines.push(`        ${prop.visibility}${safePType} ${safePName}`);
      }

      // Add methods (limited)
      const methods = iface.methods.slice(0, maxMethods);
      for (const method of methods) {
        const params = method.params.length > 0 ? '...' : '';
        const safeMethodName = ClassDiagramGenerator.sanitizeMermaid(method.name);
        const safeReturnType = ClassDiagramGenerator.sanitizeMermaid(method.returnType);
        if (!safeMethodName) continue;
        lines.push(`        ${method.visibility}${safeMethodName}(${params}) ${safeReturnType}`);
      }

      lines.push('    }');
    }

    // Add classes
    for (const [name, cls] of this.classes) {
      lines.push(`    class ${name} {`);

      if (cls.isAbstract) {
        lines.push(`        <<abstract>>`);
      }

      // Add properties (limited)
      const props = cls.properties.slice(0, maxProperties);
      for (const prop of props) {
        const staticMod = prop.isStatic ? '$' : '';
        const safePropType = ClassDiagramGenerator.sanitizeMermaid(prop.type);
        const safePropName = ClassDiagramGenerator.sanitizeMermaid(prop.name);
        if (!safePropName) continue;
        lines.push(`        ${prop.visibility}${staticMod}${safePropType} ${safePropName}`);
      }

      // Add methods (limited)
      const methods = cls.methods.slice(0, maxMethods);
      for (const method of methods) {
        const staticMod = method.isStatic ? '$' : '';
        const asyncMod = method.isAsync ? 'async ' : '';
        const params = method.params.length > 0 ? '...' : '';
        const safeName = ClassDiagramGenerator.sanitizeMermaid(method.name);
        const safeReturn = ClassDiagramGenerator.sanitizeMermaid(method.returnType);
        if (!safeName) continue;
        lines.push(`        ${method.visibility}${staticMod}${asyncMod}${safeName}(${params}) ${safeReturn}`);
      }

      lines.push('    }');
    }

    // Add relations
    for (const rel of this.relations) {
      // Only add if both ends exist
      const fromExists = this.classes.has(rel.from) || this.interfaces.has(rel.from);
      const toExists = this.classes.has(rel.to) || this.interfaces.has(rel.to);

      if (fromExists && toExists) {
        if (rel.type === 'extends') {
          lines.push(`    ${rel.from} --|> ${rel.to}`);
        } else if (rel.type === 'implements') {
          lines.push(`    ${rel.from} ..|> ${rel.to}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence() {
    const totalEntities = this.classes.size + this.interfaces.size;
    if (totalEntities === 0) return 0;

    // Higher confidence if we found relations
    let confidence = 0.7;
    if (this.relations.length > 0) {
      confidence += 0.2;
    }

    // Higher confidence if we found methods/properties
    let hasDetails = false;
    for (const cls of this.classes.values()) {
      if (cls.methods.length > 0 || cls.properties.length > 0) {
        hasDetails = true;
        break;
      }
    }
    if (hasDetails) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }
}

module.exports = ClassDiagramGenerator;

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Class Diagram Generator - Generate Mermaid class diagrams from code

Usage: class-diagram-generator.js <file1> [file2] [...]

Options:
  --title <title>       Set diagram title
  --include-private     Include private members

Examples:
  class-diagram-generator.js src/services/*.ts
  class-diagram-generator.js src/models/User.ts src/models/Order.ts --title "Domain Model"
    `);
    process.exit(0);
  }

  const files = args.filter(a => !a.startsWith('--'));
  const includePrivate = args.includes('--include-private');
  const titleIdx = args.indexOf('--title');
  const title = titleIdx >= 0 ? args[titleIdx + 1] : 'Class Diagram';

  const projectRoot = pathResolver.findProjectRoot();
  const generator = new ClassDiagramGenerator(projectRoot);
  const result = generator.generate(files, { includePrivate, title });

  console.log(`\n# ${result.title}\n`);
  console.log('```mermaid');
  console.log(result.mermaidContent);
  console.log('```\n');
  console.log(`Classes: ${result.entities.classes.length}`);
  console.log(`Interfaces: ${result.entities.interfaces.length}`);
  console.log(`Relations: ${result.entities.relations}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
}
