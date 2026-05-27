#!/usr/bin/env node
/**
 * Initial Diagram Generation Script
 * Scans the project and generates diagrams in bulk to populate the visual_diagrams table.
 *
 * Usage: node .aicodepath/scripts/generate-initial-diagrams.js [--project-root /path]
 *
 * @module scripts/generate-initial-diagrams
 */

const path = require('path');
const fs = require('fs');
const { findProjectRoot, getDbPath } = require('../lib/path-resolver');
const VisualMemoryWriter = require('../lib/visual-memory-writer');
const logger = require('../lib/logger');

const ClassDiagramGenerator = require('../hooks/lib/diagram-generators/class-diagram-generator');
const ERDiagramGenerator = require('../hooks/lib/diagram-generators/er-diagram-generator');
const FlowchartGenerator = require('../hooks/lib/diagram-generators/flowchart-generator');
const SequenceDiagramGenerator = require('../hooks/lib/diagram-generators/sequence-diagram-generator');

const LOG_CTX = 'generate-initial-diagrams';

/**
 * Collect files matching patterns under a root directory
 */
function collectFiles(projectRoot, patterns) {
  const results = [];
  for (const pattern of patterns) {
    const fullPath = path.resolve(projectRoot, pattern);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Recursively find files matching an extension in a directory
 */
function findByExt(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...findByExt(full, exts));
    } else if (entry.isFile() && exts.some(ext => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Safely store a diagram, catching errors
 */
function storeSafe(writer, spec, results) {
  try {
    const stored = writer.storeDiagram(spec);
    results.generated.push({ type: spec.diagramType, name: spec.name, id: stored.id });
    logger.info(`Stored ${spec.diagramType} diagram: ${spec.name}`, { context: LOG_CTX });
  } catch (err) {
    results.errors.push({ type: spec.diagramType, name: spec.name, error: err.message });
    logger.warn(`Failed to store ${spec.diagramType} diagram: ${err.message}`, { context: LOG_CTX });
  }
}

/**
 * Build a diagram job definition
 */
function getDiagramJobs(projectRoot) {
  const aicp = path.join(projectRoot, '.aicodepath');

  // SQL files for ER diagram
  const sqlFiles = [
    ...collectFiles(projectRoot, ['.aicodepath/db/schema.sql']),
    ...findByExt(path.join(aicp, 'db', 'migrations'), ['.sql'])
  ];

  // JS/TS files in lib/ for class diagram
  const libFiles = findByExt(path.join(aicp, 'lib'), ['.js']).filter(
    f => !f.includes('test') && !f.includes('spec') && !f.includes('node_modules')
  );

  // Entry points for flowchart
  const entryPoints = collectFiles(projectRoot, [
    '.aicodepath/api/server.js',
    '.aicodepath/bin/aicodepath.js'
  ]);

  // Route files for sequence diagram
  const routeFiles = findByExt(path.join(aicp, 'api', 'routes'), ['.js']);

  // Hook files for class diagram
  const hookFiles = findByExt(path.join(aicp, 'hooks'), ['.js']).filter(
    f => !f.includes('node_modules') && !f.includes('__tests__') && !f.includes('lib/')
  );

  return [
    {
      label: 'ER (database schema)',
      files: sqlFiles,
      generator: ERDiagramGenerator,
      opts: { title: 'AICodePath Database Schema', maxColumns: 15, includeIndexes: true },
      meta: {
        diagramType: 'er', name: 'database-schema', scope: 'global',
        description: 'Entity-relationship diagram of AICodePath database',
        generationMethod: 'static-schema', syncStrategy: 'eager', priority: 90,
        relevanceTags: ['database', 'schema', 'data-model']
      }
    },
    {
      label: 'Class (core libraries)',
      files: libFiles,
      generator: ClassDiagramGenerator,
      opts: { title: 'AICodePath Core Libraries', includePrivate: false, maxMethods: 10, maxProperties: 10 },
      meta: {
        diagramType: 'class', name: 'core-libraries-classes', scope: 'global',
        description: 'Class diagram of core library modules',
        generationMethod: 'static-ast', syncStrategy: 'lazy', priority: 60,
        relevanceTags: ['architecture', 'classes', 'oop']
      }
    },
    {
      label: 'Flowchart (entry points)',
      files: entryPoints,
      generator: FlowchartGenerator,
      opts: { title: 'AICodePath System Flow', maxDepth: 4, includeDetails: true },
      meta: {
        diagramType: 'flowchart', name: 'system-flow', scope: 'global',
        description: 'System-level flowchart showing entry points and control flow',
        generationMethod: 'static-pattern', syncStrategy: 'eager', priority: 85,
        relevanceTags: ['flow', 'process', 'control-flow']
      }
    },
    {
      label: 'Sequence (API routes)',
      files: routeFiles,
      generator: SequenceDiagramGenerator,
      opts: { title: 'AICodePath API Interactions', maxInteractions: 20 },
      meta: {
        diagramType: 'sequence', name: 'api-interactions', scope: 'global',
        description: 'Sequence diagram showing API route interactions',
        generationMethod: 'static-pattern', syncStrategy: 'lazy', priority: 55,
        relevanceTags: ['api', 'interactions', 'services', 'sequence']
      }
    },
    {
      label: 'Class (hooks)',
      files: hookFiles,
      generator: ClassDiagramGenerator,
      opts: { title: 'AICodePath Hook Classes', includePrivate: false, maxMethods: 8, maxProperties: 8 },
      meta: {
        diagramType: 'class', name: 'hook-classes', scope: 'global',
        description: 'Class diagram of hook modules',
        generationMethod: 'static-ast', syncStrategy: 'lazy', priority: 50,
        relevanceTags: ['hooks', 'classes', 'lifecycle']
      }
    }
  ];
}

/**
 * Main entry point
 */
function main() {
  const projectRootArg = process.argv.includes('--project-root')
    ? process.argv[process.argv.indexOf('--project-root') + 1]
    : null;
  const projectRoot = projectRootArg || findProjectRoot(process.cwd());

  logger.info(`Generating initial diagrams for: ${projectRoot}`, { context: LOG_CTX });

  const dbPath = getDbPath(projectRoot);
  if (!fs.existsSync(dbPath)) {
    logger.error(`Database not found at ${dbPath}. Run init-knowledge-base.sh first.`, { context: LOG_CTX });
    process.exit(1);
  }

  const writer = new VisualMemoryWriter(projectRoot);
  writer.initializeMemoryFolder();

  const results = { generated: [], skipped: [], errors: [] };
  const jobs = getDiagramJobs(projectRoot);

  for (const job of jobs) {
    if (job.files.length === 0) {
      results.skipped.push({ label: job.label, reason: 'no source files found' });
      logger.info(`Skipping ${job.label}: no source files found`, { context: LOG_CTX });
      continue;
    }

    logger.info(`Generating ${job.label} from ${job.files.length} file(s)...`, { context: LOG_CTX });

    try {
      const generator = new job.generator(projectRoot);
      const result = generator.generate(job.files, job.opts);

      if (!result || !result.mermaidContent) {
        results.skipped.push({ label: job.label, reason: 'generator returned empty content' });
        continue;
      }

      const spec = {
        ...job.meta,
        title: result.title || job.opts.title,
        mermaidContent: result.mermaidContent,
        confidence: result.confidence || 0.7,
        sourceFiles: job.files
      };

      storeSafe(writer, spec, results);
    } catch (err) {
      results.errors.push({ label: job.label, error: err.message });
      logger.warn(`Error generating ${job.label}: ${err.message}`, { context: LOG_CTX });
    }
  }

  writer.close();

  // Print summary
  console.log('\n=== Initial Diagram Generation Complete ===');
  console.log(`Generated: ${results.generated.length}`);
  for (const d of results.generated) {
    console.log(`  + ${d.type}: ${d.name} (ID: ${d.id})`);
  }
  if (results.skipped.length > 0) {
    console.log(`Skipped: ${results.skipped.length}`);
    for (const s of results.skipped) {
      console.log(`  - ${s.label}: ${s.reason}`);
    }
  }
  if (results.errors.length > 0) {
    console.log(`Errors: ${results.errors.length}`);
    for (const e of results.errors) {
      console.log(`  ! ${e.label}: ${e.error}`);
    }
  }
}

main();
