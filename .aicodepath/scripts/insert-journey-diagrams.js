#!/usr/bin/env node
/**
 * Insert User Journey Diagrams into Visual Memory Database
 *
 * This script scans the memory/global/journey/ directory for user journey diagrams
 * and inserts them into the visual_diagrams database with appropriate metadata.
 *
 * Journey diagrams help understand user flows and experience paths through the system.
 *
 * Usage:
 *   node .aicodepath/scripts/insert-journey-diagrams.js [options]
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

  // If no code blocks, check if entire file is journey diagram
  if (diagrams.length === 0) {
    const trimmedContent = content.trim();
    if (trimmedContent.startsWith('journey')) {
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
Insert User Journey Diagrams

Usage:
  node .aicodepath/scripts/insert-journey-diagrams.js [options]

Options:
  --help          Show this help message
  --dry-run       Show what would be inserted without actually inserting
  --force         Re-insert diagrams even if they already exist

Description:
  Scans memory/global/journey/ for journey diagram files (*.md) and inserts
  them into the visual_diagrams database. Journey diagrams help understand
  user experience paths and workflows through the system.
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
  console.log('  Insert User Journey Diagrams');
  console.log('═══════════════════════════════════════════════');
  console.log(`Project: ${projectRoot}`);
  if (options.dryRun) console.log('Mode: DRY RUN (no changes will be made)');
  if (options.force) console.log('Mode: FORCE (will update existing diagrams)');
  console.log();

  // Check if journey directory exists
  const journeyDir = path.join(projectRoot, 'aicodepath-docs', 'memory', 'global', 'journey');
  if (!fs.existsSync(journeyDir)) {
    console.log('❌ No journey directory found at:', journeyDir);
    console.log('   Create journey diagrams first or generate them using LLM.');
    writer.close();
    return;
  }

  // Scan for *.md files
  const files = fs.readdirSync(journeyDir).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('No journey diagram files (*.md) found in:', journeyDir);
    writer.close();
    return;
  }

  console.log(`Found ${files.length} journey diagram files\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(journeyDir, file);
    const name = path.basename(file, '.md');

    // Extract metadata from file
    const metadata = extractMetadata(filePath);

    // Check if already in database
    const existing = writer.db.prepare(`
      SELECT id FROM visual_diagrams
      WHERE name = ? AND diagram_type = 'journey' AND status = 'active'
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
          console.log(`[DRY RUN] Would insert ${diagramName} (priority=80)`);
          inserted++;
          continue;
        }

        const result = writer.storeDiagram({
          diagramType: 'journey',
          name: diagramName,
          scope: 'global',
          unitName: null,
          title: metadata.title ? (diagramList.length > 1 ? `${metadata.title} (${i + 1})` : metadata.title) : `User Journey: ${diagramName}`,
          description: metadata.description || 'User journey diagram showing experience path',
          mermaidContent: mermaidContent,
          generationMethod: 'llm',
          confidence: 0.8,
          sourceFiles: [],
          syncStrategy: 'lazy',
          priority: 80,
          relevanceTags: ['ux', 'journey', 'user-flow'],
          crNumber: 'CR-USER-JOURNEY'
        });

        if (existing && options.force) {
          console.log(`✓ Updated ${diagramName} (id=${result.id})`);
          updated++;
        } else {
          console.log(`✓ Inserted ${diagramName} (id=${result.id})`);
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

    // Show journey diagrams specifically
    const journeyDiagrams = writer.db.prepare(`
      SELECT id, name, priority FROM visual_diagrams
      WHERE diagram_type = 'journey' AND status = 'active'
      ORDER BY priority DESC
    `).all();

    if (journeyDiagrams.length > 0) {
      console.log('\n═══════════════════════════════════════════════');
      console.log('  Journey Diagrams in Database');
      console.log('═══════════════════════════════════════════════\n');
      for (const d of journeyDiagrams) {
        console.log(`[${d.id}] ${d.name} - Priority: ${d.priority}`);
      }
    }
  }

  writer.close();

  console.log('\n✓ Journey diagram insertion complete!\n');
}

try {
  main();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
