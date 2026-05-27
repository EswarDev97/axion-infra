#!/usr/bin/env node
/**
 * Visual Memory Generator Hook
 * Orchestrates diagram generation using static and LLM-based generators
 *
 * This hook can be triggered:
 * - During reverse engineering (brownfield)
 * - During application design (greenfield)
 * - On-demand via /aicodepath-visual-memory skill
 *
 * @module hooks/visual-memory-generator
 */

const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const VisualMemoryWriter = require('../lib/visual-memory-writer');
const { callPythonGenerator, checkPythonGenerators, generateDiagram } = require('./lib/python-bridge');
const logger = require('../lib/logger');

// Generators
const ClassDiagramGenerator = require('./lib/diagram-generators/class-diagram-generator');
const ERDiagramGenerator = require('./lib/diagram-generators/er-diagram-generator');
const FlowchartGenerator = require('./lib/diagram-generators/flowchart-generator');
const SequenceDiagramGenerator = require('./lib/diagram-generators/sequence-diagram-generator');
const JourneyDiagramGenerator = require('./lib/diagram-generators/journey-diagram-generator');

// Cache Python availability check
let pythonGeneratorsAvailable = null;

/**
 * Check if Python generators are available
 * @returns {Promise<boolean>}
 */
async function isPythonAvailable() {
  if (pythonGeneratorsAvailable === null) {
    pythonGeneratorsAvailable = await checkPythonGenerators();
    if (pythonGeneratorsAvailable) {
      console.log('✓ Python generators available - using advanced AST analysis');
    } else {
      console.log('⚠ Python generators not available - using JavaScript fallbacks');
    }
  }
  return pythonGeneratorsAvailable;
}

// Throttle: track last generation time per diagram type
const _lastGenTime = {};
const THROTTLE_MS = 60000; // 60 seconds

/**
 * Infer diagram context from a file path (PostToolUse bridge)
 * @param {string} filePath - Path to the changed file
 * @returns {Object|null} Inferred context or null if not an architecture file
 */
function inferDiagramContext(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  const lc = filePath.toLowerCase();

  if (lc.endsWith('.sql') || lc.endsWith('.prisma')) {
    return { diagramType: 'er', sourceFiles: [filePath], scope: 'global' };
  }
  if (lc.includes('route') && (lc.endsWith('.js') || lc.endsWith('.ts'))) {
    return { diagramType: 'sequence', sourceFiles: [filePath], scope: 'global' };
  }
  if (/\/(server|index|app)\.(js|ts)$/.test(lc)) {
    return { diagramType: 'flowchart', sourceFiles: [filePath], scope: 'global' };
  }
  if ((lc.includes('/lib/') || lc.includes('/hooks/') || lc.includes('/api/')) &&
      (lc.endsWith('.js') || lc.endsWith('.ts'))) {
    return { diagramType: 'class', sourceFiles: [filePath], scope: 'global' };
  }
  return null;
}

/**
 * Main hook function
 * @param {Object} context - Hook context
 */
async function hook(context = {}) {
  // Bridge PostToolUse context to generator parameters
  if (context.tool_name && context.tool_input) {
    const filePath = context.tool_input.file_path || context.tool_input.command;
    const inferred = inferDiagramContext(filePath);
    if (!inferred) {
      return { success: true, message: '' };
    }
    // Throttle: skip if same diagram type was generated recently
    const now = Date.now();
    if (_lastGenTime[inferred.diagramType] && (now - _lastGenTime[inferred.diagramType]) < THROTTLE_MS) {
      return { success: true, message: '' };
    }
    _lastGenTime[inferred.diagramType] = now;
    context = { ...context, ...inferred };
  }

  const {
    diagramType = 'all',        // 'class', 'er', 'flowchart', 'sequence', 'journey', 'all'
    scope = 'global',            // 'global' or 'unit'
    unitName = null,             // Unit name if scope='unit'
    sourceFiles = [],            // Files to analyze
    options = {},                // Generator-specific options
    llmAnalysis = null           // Optional: pre-computed LLM analysis
  } = context;

  const projectRoot = findProjectRoot(process.cwd());
  const writer = new VisualMemoryWriter(projectRoot);

  try {
    // Initialize memory folder if needed
    writer.initializeMemoryFolder();
    if (scope === 'unit' && unitName) {
      writer.initializeUnitFolder(unitName);
    }

    const results = {
      success: true,
      diagrams: [],
      errors: []
    };

    // Generate requested diagrams
    if (diagramType === 'all' || diagramType === 'class') {
      try {
        const diagram = await generateClassDiagram(projectRoot, sourceFiles, scope, unitName, options);
        if (diagram) {
          const stored = writer.storeDiagram(diagram);
          results.diagrams.push({ type: 'class', ...stored });
        }
      } catch (err) {
        results.errors.push({ type: 'class', error: err.message });
      }
    }

    if (diagramType === 'all' || diagramType === 'er') {
      try {
        const diagram = await generateERDiagram(projectRoot, sourceFiles, scope, unitName, options);
        if (diagram) {
          const stored = writer.storeDiagram(diagram);
          results.diagrams.push({ type: 'er', ...stored });
        }
      } catch (err) {
        results.errors.push({ type: 'er', error: err.message });
      }
    }

    if (diagramType === 'all' || diagramType === 'flowchart') {
      try {
        const diagram = await generateFlowchart(projectRoot, sourceFiles, scope, unitName, options);
        if (diagram) {
          const stored = writer.storeDiagram(diagram);
          results.diagrams.push({ type: 'flowchart', ...stored });
        }
      } catch (err) {
        results.errors.push({ type: 'flowchart', error: err.message });
      }
    }

    if (diagramType === 'all' || diagramType === 'sequence') {
      try {
        const diagram = await generateSequenceDiagram(projectRoot, sourceFiles, scope, unitName, options, llmAnalysis);
        if (diagram) {
          const stored = writer.storeDiagram(diagram);
          results.diagrams.push({ type: 'sequence', ...stored });
        }
      } catch (err) {
        results.errors.push({ type: 'sequence', error: err.message });
      }
    }

    if (diagramType === 'all' || diagramType === 'journey') {
      try {
        const diagram = await generateJourneyDiagram(projectRoot, sourceFiles, scope, unitName, options, llmAnalysis);
        if (diagram) {
          const stored = writer.storeDiagram(diagram);
          results.diagrams.push({ type: 'journey', ...stored });
        }
      } catch (err) {
        results.errors.push({ type: 'journey', error: err.message });
      }
    }

    if (diagramType === 'all' || diagramType === 'c4') {
      try {
        const diagram = await generateC4Diagram(projectRoot, sourceFiles, scope, unitName, options);
        if (diagram) {
          const stored = writer.storeDiagram(diagram);
          results.diagrams.push({ type: 'c4', ...stored });
        }
      } catch (err) {
        results.errors.push({ type: 'c4', error: err.message });
      }
    }

    if (diagramType === 'all' || diagramType === 'layered') {
      try {
        const diagram = await generateLayeredDiagram(projectRoot, sourceFiles, scope, unitName, options);
        if (diagram) {
          const stored = writer.storeDiagram(diagram);
          results.diagrams.push({ type: 'layered', ...stored });
        }
      } catch (err) {
        results.errors.push({ type: 'layered', error: err.message });
      }
    }

    writer.close();

    return {
      success: true,
      message: formatResults(results),
      diagrams: results.diagrams,
      errors: results.errors
    };

  } catch (error) {
    writer.close();
    return {
      success: false,
      error: error.message,
      message: `Failed to generate diagrams: ${error.message}`
    };
  }
}

/**
 * Generate class diagram
 */
async function generateClassDiagram(projectRoot, sourceFiles, scope, unitName, options) {
  if (sourceFiles.length === 0) return null;

  // Filter to code files
  const codeFiles = sourceFiles.filter(f =>
    f.match(/\.(ts|tsx|js|jsx|py)$/) &&
    !f.includes('test') &&
    !f.includes('spec')
  );

  if (codeFiles.length === 0) return null;

  // Try Python generator first (higher confidence with AST)
  if (await isPythonAvailable()) {
    try {
      const result = await generateDiagram('class', {
        scope,
        unitName,
        sourceFiles: codeFiles,
        generatorOptions: options.class || {}
      });

      return {
        diagramType: 'class',
        name: unitName ? `${unitName}-classes` : 'system-classes',
        scope,
        unitName,
        title: result.title,
        description: result.description,
        mermaidContent: result.mermaid_content,
        generationMethod: 'python-ast',
        confidence: result.confidence,
        sourceFiles: codeFiles,
        syncStrategy: 'lazy',
        priority: 60,
        relevanceTags: ['architecture', 'classes', 'oop']
      };
    } catch (err) {
      logger.warn('Python class generator failed, using JavaScript fallback', {
        hook: 'visual-memory-generator',
        error: err.message
      });
    }
  }

  // Fallback to existing JS generator
  const generator = new ClassDiagramGenerator(projectRoot);
  const result = generator.generate(codeFiles, {
    title: `${unitName || 'System'} Class Diagram`,
    includePrivate: false,
    maxMethods: 8,
    maxProperties: 8,
    ...options.class
  });

  return {
    diagramType: 'class',
    name: unitName ? `${unitName}-classes` : 'system-classes',
    scope,
    unitName,
    title: result.title,
    description: `Class diagram showing ${result.entities.classes.length} classes and ${result.entities.interfaces.length} interfaces`,
    mermaidContent: result.mermaidContent,
    generationMethod: 'static-ast',
    confidence: result.confidence,
    sourceFiles: codeFiles,
    syncStrategy: 'lazy',
    priority: 60,
    relevanceTags: ['architecture', 'classes', 'oop']
  };
}

/**
 * Generate ER diagram
 */
async function generateERDiagram(projectRoot, sourceFiles, scope, unitName, options) {
  // Filter to schema files
  const schemaFiles = sourceFiles.filter(f =>
    f.match(/\.(sql|prisma)$/) ||
    f.includes('schema') ||
    f.includes('migration') ||
    f.includes('entity') ||
    f.includes('model')
  );

  if (schemaFiles.length === 0) return null;

  // Try Python generator first (higher confidence with advanced parsing)
  if (await isPythonAvailable()) {
    try {
      const result = await generateDiagram('er', {
        scope,
        unitName,
        sourceFiles: schemaFiles,
        generatorOptions: options.er || {}
      });

      return {
        diagramType: 'er',
        name: unitName ? `${unitName}-database` : 'database-schema',
        scope,
        unitName,
        title: result.title,
        description: result.description,
        mermaidContent: result.mermaid_content,
        generationMethod: 'python-ast',
        confidence: result.confidence,
        sourceFiles: schemaFiles,
        syncStrategy: 'eager',
        priority: 90,
        relevanceTags: ['database', 'schema', 'data-model']
      };
    } catch (err) {
      logger.warn('Python ER generator failed, using JavaScript fallback', {
        hook: 'visual-memory-generator',
        error: err.message
      });
    }
  }

  // Fallback to existing JS generator
  const generator = new ERDiagramGenerator(projectRoot);
  const result = generator.generate(schemaFiles, {
    title: `${unitName || 'System'} Database Schema`,
    maxColumns: 12,
    includeIndexes: false,
    ...options.er
  });

  return {
    diagramType: 'er',
    name: unitName ? `${unitName}-database` : 'database-schema',
    scope,
    unitName,
    title: result.title,
    description: `ER diagram showing ${result.entities.tables.length} tables and ${result.entities.relations} relationships`,
    mermaidContent: result.mermaidContent,
    generationMethod: 'static-schema',
    confidence: result.confidence,
    sourceFiles: schemaFiles,
    syncStrategy: 'eager', // Critical - database changes need immediate sync
    priority: 90,
    relevanceTags: ['database', 'schema', 'data-model']
  };
}

/**
 * Generate flowchart
 */
async function generateFlowchart(projectRoot, sourceFiles, scope, unitName, options) {
  if (sourceFiles.length === 0) return null;

  // Filter to main code files
  const codeFiles = sourceFiles.filter(f =>
    f.match(/\.(ts|tsx|js|jsx)$/) &&
    (f.includes('main') || f.includes('index') || f.includes('app') || f.includes('controller'))
  );

  if (codeFiles.length === 0) return null;

  // Try Python generator first (higher confidence with AST)
  if (await isPythonAvailable()) {
    try {
      const result = await generateDiagram('flowchart', {
        scope,
        unitName,
        sourceFiles: codeFiles,
        generatorOptions: options.flowchart || {}
      });

      return {
        diagramType: 'flowchart',
        name: unitName ? `${unitName}-flow` : 'system-flow',
        scope,
        unitName,
        title: result.title,
        description: result.description,
        mermaidContent: result.mermaid_content,
        generationMethod: 'python-ast',
        confidence: result.confidence,
        sourceFiles: codeFiles,
        syncStrategy: scope === 'global' ? 'eager' : 'lazy',
        priority: scope === 'global' ? 85 : 50,
        relevanceTags: ['flow', 'process', 'control-flow']
      };
    } catch (err) {
      logger.warn('Python flowchart generator failed, using JavaScript fallback', {
        hook: 'visual-memory-generator',
        error: err.message
      });
    }
  }

  // Fallback to existing JS generator
  const generator = new FlowchartGenerator(projectRoot);
  const result = generator.generate(codeFiles, {
    title: `${unitName || 'System'} Flow`,
    maxDepth: 3,
    includeDetails: false,
    ...options.flowchart
  });

  return {
    diagramType: 'flowchart',
    name: unitName ? `${unitName}-flow` : 'system-flow',
    scope,
    unitName,
    title: result.title,
    description: `Flowchart showing system control flow with ${result.entities.nodes} nodes`,
    mermaidContent: result.mermaidContent,
    generationMethod: 'static-pattern',
    confidence: result.confidence,
    sourceFiles: codeFiles,
    syncStrategy: scope === 'global' ? 'eager' : 'lazy',
    priority: scope === 'global' ? 85 : 50,
    relevanceTags: ['flow', 'process', 'control-flow']
  };
}

/**
 * Generate sequence diagram
 */
async function generateSequenceDiagram(projectRoot, sourceFiles, scope, unitName, options, llmAnalysis) {
  if (sourceFiles.length === 0 && !llmAnalysis) return null;

  // Try Python generator first (higher confidence with AST)
  if (await isPythonAvailable() && sourceFiles.length > 0) {
    try {
      const result = await generateDiagram('sequence', {
        scope,
        unitName,
        sourceFiles,
        generatorOptions: { llmAnalysis, ...options.sequence }
      });

      return {
        diagramType: 'sequence',
        name: unitName ? `${unitName}-sequence` : 'system-interactions',
        scope,
        unitName,
        title: result.title,
        description: result.description,
        mermaidContent: result.mermaid_content,
        generationMethod: 'python-ast',
        confidence: result.confidence,
        sourceFiles: sourceFiles,
        syncStrategy: 'lazy',
        priority: 55,
        relevanceTags: ['api', 'interactions', 'services', 'sequence']
      };
    } catch (err) {
      logger.warn('Python sequence generator failed, using JavaScript fallback', {
        hook: 'visual-memory-generator',
        error: err.message
      });
    }
  }

  // Fallback to existing JS generator
  const generator = new SequenceDiagramGenerator(projectRoot);

  // Prefer LLM analysis if available
  const result = generator.generate(sourceFiles, {
    title: `${unitName || 'System'} Interactions`,
    maxInteractions: 15,
    llmAnalysis,
    ...options.sequence
  });

  return {
    diagramType: 'sequence',
    name: unitName ? `${unitName}-sequence` : 'system-interactions',
    scope,
    unitName,
    title: result.title,
    description: `Sequence diagram showing ${result.entities.interactions} interactions between ${result.entities.participants} participants`,
    mermaidContent: result.mermaidContent,
    generationMethod: result.generationMethod,
    confidence: result.confidence,
    sourceFiles: result.sourceFiles || sourceFiles,
    syncStrategy: 'lazy',
    priority: 55,
    relevanceTags: ['api', 'interactions', 'services', 'sequence']
  };
}

/**
 * Generate user journey diagram
 */
async function generateJourneyDiagram(projectRoot, sourceFiles, scope, unitName, options, llmAnalysis) {
  // Journey diagrams require LLM or story files
  if (!llmAnalysis && sourceFiles.length === 0) return null;

  // Try Python generator first (higher confidence with requirement parsing)
  if (await isPythonAvailable() && (sourceFiles.length > 0 || llmAnalysis)) {
    try {
      const result = await generateDiagram('journey', {
        scope,
        unitName,
        sourceFiles,
        generatorOptions: {
          title: options.journey?.title || 'User Journey',
          userPersona: options.journey?.userPersona || 'User',
          llmAnalysis,
          ...options.journey
        }
      });

      return {
        diagramType: 'journey',
        name: unitName ? `${unitName}-journey` : 'user-journey',
        scope,
        unitName,
        title: result.title,
        description: result.description,
        mermaidContent: result.mermaid_content,
        generationMethod: 'python-ast',
        confidence: result.confidence,
        sourceFiles: sourceFiles,
        syncStrategy: 'manual',
        priority: 40,
        relevanceTags: ['ux', 'user-flow', 'journey', 'requirements']
      };
    } catch (err) {
      logger.warn('Python journey generator failed, using JavaScript fallback', {
        hook: 'visual-memory-generator',
        error: err.message
      });
    }
  }

  // Fallback to existing JS generator
  const generator = new JourneyDiagramGenerator(projectRoot);

  const result = generator.generate(sourceFiles, {
    title: options.journey?.title || 'User Journey',
    userPersona: options.journey?.userPersona || 'User',
    llmAnalysis,
    ...options.journey
  });

  return {
    diagramType: 'journey',
    name: unitName ? `${unitName}-journey` : 'user-journey',
    scope,
    unitName,
    title: result.title,
    description: `User journey with ${result.entities.sections} sections and ${result.entities.totalTasks} tasks`,
    mermaidContent: result.mermaidContent,
    generationMethod: result.generationMethod,
    confidence: result.confidence,
    sourceFiles: result.sourceFiles || sourceFiles,
    syncStrategy: 'manual', // User journeys are requirement-driven, not code-driven
    priority: 40,
    relevanceTags: ['ux', 'user-flow', 'journey', 'requirements']
  };
}

/**
 * Generate C4 architecture diagram
 * @note C4 diagrams are only available with Python generators
 */
async function generateC4Diagram(projectRoot, sourceFiles, scope, unitName, options) {
  if (!await isPythonAvailable()) {
    logger.warn('C4 diagrams require Python generators', {
      hook: 'visual-memory-generator',
      reason: 'Python generators not available'
    });
    return null;
  }

  if (sourceFiles.length === 0) return null;

  try {
    const result = await generateDiagram('c4', {
      scope,
      unitName,
      sourceFiles,
      generatorOptions: {
        level: options.c4?.level || 'context',
        ...options.c4
      }
    });

    return {
      diagramType: 'c4',
      name: unitName ? `${unitName}-c4` : 'system-c4',
      scope,
      unitName,
      title: result.title,
      description: result.description,
      mermaidContent: result.mermaid_content,
      generationMethod: 'python-ast',
      confidence: result.confidence,
      sourceFiles,
      syncStrategy: 'lazy',
      priority: 70,
      relevanceTags: ['architecture', 'c4', 'system-design', 'structure']
    };
  } catch (err) {
    console.error(`C4 diagram generation failed: ${err.message}`);
    return null;
  }
}

/**
 * Generate layered architecture diagram
 * @note Layered diagrams are only available with Python generators
 */
async function generateLayeredDiagram(projectRoot, sourceFiles, scope, unitName, options) {
  if (!await isPythonAvailable()) {
    logger.warn('Layered architecture diagrams require Python generators', {
      hook: 'visual-memory-generator',
      reason: 'Python generators not available'
    });
    return null;
  }

  if (sourceFiles.length === 0) return null;

  try {
    const result = await generateDiagram('layered', {
      scope,
      unitName,
      sourceFiles,
      generatorOptions: options.layered || {}
    });

    return {
      diagramType: 'layered',
      name: unitName ? `${unitName}-layered` : 'system-layered',
      scope,
      unitName,
      title: result.title,
      description: result.description,
      mermaidContent: result.mermaid_content,
      generationMethod: 'python-ast',
      confidence: result.confidence,
      sourceFiles,
      syncStrategy: 'lazy',
      priority: 65,
      relevanceTags: ['architecture', 'layers', 'separation-of-concerns', 'structure']
    };
  } catch (err) {
    console.error(`Layered diagram generation failed: ${err.message}`);
    return null;
  }
}

/**
 * Format results message
 */
function formatResults(results) {
  const lines = ['Visual Memory Generation Complete'];
  lines.push('');

  if (results.diagrams.length > 0) {
    lines.push(`✓ Generated ${results.diagrams.length} diagram(s):`);
    for (const diagram of results.diagrams) {
      lines.push(`  • ${diagram.type}: ${diagram.name} (ID: ${diagram.id})`);
    }
  }

  if (results.errors.length > 0) {
    lines.push('');
    lines.push(`⚠ ${results.errors.length} diagram(s) failed:`);
    for (const error of results.errors) {
      lines.push(`  • ${error.type}: ${error.error}`);
    }
  }

  return lines.join('\n');
}

// Export for programmatic use and testing
module.exports = { hook };

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(hook, { name: 'visual-memory-generator' });
}
