#!/usr/bin/env node
/**
 * Insert C4 Diagrams into Visual Memory Database
 *
 * This script scans the memory/global/c4/ directory for C4 architecture diagrams
 * and inserts them into the visual_diagrams database with appropriate metadata.
 *
 * C4 diagrams have high priority for system context loading:
 * - Context: 95 (system boundaries, actors, external systems)
 * - Containers: 93 (high-level architecture, tech choices)
 * - Components: 90 (internal structure, dependencies)
 * - Deployment: 88 (infrastructure topology)
 *
 * Usage:
 *   node .aicodepath/scripts/insert-c4-diagrams.js [options]
 *
 * Options:
 *   --help          Show this help message
 *   --dry-run       Show what would be inserted without actually inserting
 *   --force         Re-insert diagrams even if they already exist
 */

const path = require('path');
const fs = require('fs');

// Find project root by looking for .aicodepath directory
function findProjectRoot(startPath = process.cwd()) {
  let currentPath = startPath;

  while (currentPath !== path.parse(currentPath).root) {
    const aicodePathDir = path.join(currentPath, '.aicodepath');
    if (fs.existsSync(aicodePathDir)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }

  throw new Error('Could not find .aicodepath directory. Are you in a project?');
}

// Helper function to extract individual Mermaid diagrams from markdown file
// Returns an array of diagram strings (one per diagram, never concatenated)
function extractMermaidDiagrams(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const diagrams = [];

  // Match ```mermaid ... ``` blocks
  const mermaidRegex = /```mermaid\s+([\s\S]+?)\s+```/g;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const codeBlockContent = match[1].trim();

    // Split on standalone --- lines (multiple diagrams may exist in one code block)
    const separated = codeBlockContent.split(/\n---\n/);
    for (const part of separated) {
      const trimmed = part.trim();
      if (trimmed.length > 0) {
        diagrams.push(trimmed);
      }
    }
  }

  // If no code blocks, check if entire file is C4 diagram
  if (diagrams.length === 0) {
    const trimmedContent = content.trim();
    if (trimmedContent.startsWith('C4Context') ||
        trimmedContent.startsWith('C4Container') ||
        trimmedContent.startsWith('C4Component') ||
        trimmedContent.startsWith('C4Deployment')) {
      diagrams.push(trimmedContent);
    }
  }

  return diagrams;
}

// Extract title and description from markdown frontmatter or content
function extractMetadata(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const metadata = {
    title: null,
    description: null
  };

  // Try to extract from frontmatter
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const titleMatch = frontmatter.match(/title:\s*(.+)/);
    const descMatch = frontmatter.match(/description:\s*(.+)/);

    if (titleMatch) metadata.title = titleMatch[1].trim();
    if (descMatch) metadata.description = descMatch[1].trim();
  }

  // Try to extract from markdown headers
  if (!metadata.title) {
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) metadata.title = h1Match[1].trim();
  }

  return metadata;
}

// Determine diagram level and priority from filename
function getDiagramInfo(filename) {
  const info = {
    level: 'unknown',
    priority: 85,
    syncStrategy: 'lazy',
    tags: ['architecture', 'c4']
  };

  if (filename.includes('context')) {
    info.level = 'context';
    info.priority = 95;
    info.syncStrategy = 'eager';
    info.tags.push('context', 'system-boundary');
  } else if (filename.includes('container')) {
    info.level = 'containers';
    info.priority = 93;
    info.syncStrategy = 'eager';
    info.tags.push('containers', 'deployment');
  } else if (filename.includes('component')) {
    info.level = 'components';
    info.priority = 90;
    info.syncStrategy = 'lazy';
    info.tags.push('components');
  } else if (filename.includes('deployment')) {
    info.level = 'deployment';
    info.priority = 88;
    info.syncStrategy = 'lazy';
    info.tags.push('deployment', 'infrastructure');
  } else if (filename.includes('dynamic')) {
    info.level = 'dynamic';
    info.priority = 85;
    info.syncStrategy = 'lazy';
    info.tags.push('dynamic', 'flow');
  }

  return info;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    force: false,
    help: false
  };

  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    if (arg === '--force') options.force = true;
    if (arg === '--help' || arg === '-h') options.help = true;
  }

  return options;
}

// Show help
function showHelp() {
  console.log(`
Insert C4 Architecture Diagrams

Usage:
  node .aicodepath/scripts/insert-c4-diagrams.js [options]

Options:
  --help          Show this help message
  --dry-run       Show what would be inserted without actually inserting
  --force         Re-insert diagrams even if they already exist

Description:
  Scans memory/global/c4/ for C4 diagram files (c4-*.md) and inserts them
  into the visual_diagrams database with appropriate priority levels:

  - Context: Priority 95 (highest, system boundaries)
  - Containers: Priority 93 (high-level architecture)
  - Components: Priority 90 (internal structure)
  - Deployment: Priority 88 (infrastructure)
`);
}

function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  const projectRoot = findProjectRoot();

  // Import VisualMemoryWriter from the project
  const VisualMemoryWriter = require(path.join(projectRoot, '.aicodepath', 'lib', 'visual-memory-writer'));
  const writer = new VisualMemoryWriter(projectRoot);

  console.log('═══════════════════════════════════════════════');
  console.log('  Insert C4 Architecture Diagrams');
  console.log('═══════════════════════════════════════════════');
  console.log(`Project: ${projectRoot}`);
  if (options.dryRun) console.log('Mode: DRY RUN (no changes will be made)');
  if (options.force) console.log('Mode: FORCE (will update existing diagrams)');
  console.log();

  // Check if c4 directory exists
  const c4Dir = path.join(projectRoot, 'aicodepath-docs', 'memory', 'global', 'c4');
  if (!fs.existsSync(c4Dir)) {
    console.log('❌ No C4 directory found at:', c4Dir);
    console.log('   Create C4 diagrams first or generate them using /aicodepath-c4-architecture skill.');
    writer.close();
    return;
  }

  // Scan for c4-*.md files
  const files = fs.readdirSync(c4Dir).filter(f => f.startsWith('c4-') && f.endsWith('.md'));

  if (files.length === 0) {
    console.log('No C4 diagram files (c4-*.md) found in:', c4Dir);
    writer.close();
    return;
  }

  console.log(`Found ${files.length} C4 diagram files\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(c4Dir, file);
    const name = path.basename(file, '.md');

    // Get diagram info from filename
    const info = getDiagramInfo(file);

    // Extract metadata from file
    const metadata = extractMetadata(filePath);

    // Check if already in database
    const existing = writer.db.prepare(`
      SELECT id FROM visual_diagrams
      WHERE name = ? AND diagram_type = 'c4' AND status = 'active'
    `).get(name);

    if (existing && !options.force) {
      console.log(`⏭️  Skipping ${name} (already in database, id=${existing.id})`);
      skipped++;
      continue;
    }

    try {
      // Extract individual Mermaid diagrams from file (returns array, never concatenated)
      const diagramList = extractMermaidDiagrams(filePath);

      if (diagramList.length === 0) {
        console.log(`⚠️  Warning: No Mermaid code found in ${file}`);
        errors++;
        continue;
      }

      // If forcing and exists, supersede old one
      if (existing && options.force) {
        writer.db.prepare(`
          UPDATE visual_diagrams SET status = 'superseded', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(existing.id);
      }

      // Insert each diagram as a separate DB record
      for (let i = 0; i < diagramList.length; i++) {
        const mermaidContent = diagramList[i];
        const diagramName = diagramList.length > 1 ? `${name}-${i + 1}` : name;

        if (options.dryRun) {
          console.log(`[DRY RUN] Would insert ${diagramName} (level=${info.level}, priority=${info.priority})`);
          inserted++;
          continue;
        }

        const result = writer.storeDiagram({
          diagramType: 'c4',
          name: diagramName,
          scope: 'global',
          unitName: null,
          title: metadata.title ? (diagramList.length > 1 ? `${metadata.title} (${i + 1})` : metadata.title) : `C4 ${info.level} Diagram`,
          description: metadata.description || `C4 architecture diagram showing ${info.level} level`,
          mermaidContent: mermaidContent,
          generationMethod: 'manual',
          confidence: 0.85,
          sourceFiles: [],
          syncStrategy: info.syncStrategy,
          priority: info.priority,
          relevanceTags: info.tags,
          crNumber: 'CR-C4-ARCHITECTURE'
        });

        if (existing && options.force) {
          console.log(`✓ Updated ${diagramName} (id=${result.id}, level=${info.level}, priority=${info.priority})`);
          updated++;
        } else {
          console.log(`✓ Inserted ${diagramName} (id=${result.id}, level=${info.level}, priority=${info.priority})`);
          inserted++;
        }
      }

    } catch (error) {
      console.log(`❌ Error processing ${name}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════');
  console.log(`✓ Inserted: ${inserted}`);
  if (updated > 0) console.log(`✓ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  if (!options.dryRun) {
    // Show updated statistics
    const stats = writer.getStatistics();
    console.log('\n═══════════════════════════════════════════════');
    console.log('  Database Statistics');
    console.log('═══════════════════════════════════════════════');
    console.log(`Total active diagrams: ${stats.total}`);
    console.log('\nBy Type:');
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`  ${type}: ${count}`);
    }

    // Show C4 diagrams specifically
    const c4Diagrams = writer.db.prepare(`
      SELECT id, name, priority, confidence FROM visual_diagrams
      WHERE diagram_type = 'c4' AND status = 'active'
      ORDER BY priority DESC
    `).all();

    if (c4Diagrams.length > 0) {
      console.log('\n═══════════════════════════════════════════════');
      console.log('  C4 Diagrams in Database');
      console.log('═══════════════════════════════════════════════\n');
      for (const d of c4Diagrams) {
        console.log(`[${d.id}] ${d.name} - Priority: ${d.priority}, Confidence: ${d.confidence}`);
      }
    }
  }

  writer.close();

  console.log('\n✓ C4 diagram insertion complete!\n');
}

try {
  main();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
