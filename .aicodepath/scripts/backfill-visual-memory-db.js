#!/usr/bin/env node
/**
 * Backfill Visual Memory Database
 *
 * This script inserts all generated diagram files from disk into the
 * visual_diagrams database table. It reads existing diagram files,
 * extracts Mermaid code and metadata, and inserts them using
 * VisualMemoryWriter.
 *
 * CRITICAL: This fixes the issue where diagrams were generated on disk
 * but never inserted into the database, preventing visual-memory-loader
 * from loading them into Claude's context.
 *
 * Usage:
 *   node .aicodepath/scripts/backfill-visual-memory-db.js [options]
 *
 * Options:
 *   --help          Show this help message
 *   --dry-run       Show what would be inserted without actually inserting
 *   --force         Re-insert diagrams even if they already exist (updates)
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

/**
 * Extract Mermaid diagrams from markdown file
 * @param {string} filePath - Path to markdown file
 * @returns {Array<{content: string, type: string, index: number}>} Array of diagram blocks
 */
function extractMermaidDiagrams(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const diagrams = [];

  // Match ```mermaid ... ``` blocks
  const mermaidRegex = /```mermaid\s+([\s\S]+?)\s+```/g;
  let match;
  let globalIndex = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    const codeBlockContent = match[1].trim();

    // Split on standalone --- lines (diagram separators WITHIN the code block)
    const separatedDiagrams = codeBlockContent.split(/\n---\n/);

    for (const diagramContent of separatedDiagrams) {
      const trimmed = diagramContent.trim();
      if (trimmed.length === 0) continue;

      const diagramType = detectDiagramType(trimmed);
      if (!diagramType) continue;

      // Sanitize content to fix common Mermaid syntax issues
      const sanitized = sanitizeMermaidContent(trimmed, diagramType);

      diagrams.push({
        content: sanitized,
        type: diagramType,
        index: globalIndex++
      });
    }
  }

  // If no code blocks found, check if entire file is mermaid (like ER diagram)
  if (diagrams.length === 0) {
    const trimmedContent = content.trim();
    const diagramType = detectDiagramType(trimmedContent);

    if (diagramType) {
      // Sanitize content to fix common Mermaid syntax issues
      const sanitized = sanitizeMermaidContent(trimmedContent, diagramType);

      diagrams.push({
        content: sanitized,
        type: diagramType,
        index: 0
      });
    }
  }

  return diagrams;
}

/**
 * Detect diagram type from Mermaid content
 * @param {string} content - Mermaid diagram content
 * @returns {string|null} Diagram type or null
 */
function detectDiagramType(content) {
  const firstLine = content.trim().split('\n')[0].toLowerCase();

  if (firstLine.startsWith('erdiagram')) return 'er';
  if (firstLine.startsWith('classdiagram')) return 'class';
  if (firstLine.startsWith('sequencediagram')) return 'sequence';
  if (firstLine.startsWith('flowchart')) return 'flowchart';
  if (firstLine.startsWith('graph')) return 'flowchart';
  if (firstLine.startsWith('statediagram')) return 'state';
  if (firstLine.startsWith('journey')) return 'journey';
  if (firstLine.startsWith('c4context')) return 'c4-context';
  if (firstLine.startsWith('c4container')) return 'c4-container';
  if (firstLine.startsWith('c4component')) return 'c4-component';
  if (firstLine.startsWith('c4deployment')) return 'c4-deployment';

  return null;
}

/**
 * Sanitize Mermaid content to fix common syntax issues
 * @param {string} content - Mermaid diagram content
 * @param {string} diagramType - Type of diagram
 * @returns {string} Sanitized content
 */
function sanitizeMermaidContent(content, diagramType) {
  let sanitized = content;

  // Fix: Parentheses in node labels (flowchart, sequence, stateDiagram)
  // Mermaid treats () as shape definitions, so escape them in labels
  // Pattern: [text with (x) in label]
  if (diagramType === 'flowchart' || diagramType === 'sequence' || diagramType === 'state') {
    // Replace (x) with HTML entities in node labels
    // Match: [any text (content) any text]
    sanitized = sanitized.replace(/(\[[^\]]*)\(([^)]*)\)([^\]]*\])/g, (match, before, inside, after) => {
      // Only replace if inside a label (between [ and ])
      return `${before}#40;${inside}#41;${after}`;
    });
  }

  return sanitized;
}

/**
 * Generate unique name for diagram block
 * @param {string} baseName - Base name from index.json
 * @param {number} index - Block index (0-based)
 * @param {number} total - Total blocks in file
 * @param {string} blockType - Detected diagram type
 * @returns {string} Unique name
 */
function generateDiagramName(baseName, index, total, blockType) {
  // If only one diagram, keep original name
  if (total === 1) {
    return baseName;
  }

  // For multiple diagrams, append descriptive suffix
  // Examples:
  //   ai-workflows-sequence-1 (OCR)
  //   ai-workflows-sequence-2 (Damage)
  //   system-architecture-c4-context
  //   system-architecture-c4-container

  if (blockType.startsWith('c4-')) {
    // For C4 diagrams, use the level name
    const level = blockType.replace('c4-', '');
    return `${baseName}-${level}`;
  }

  // For other multi-block files, use sequential numbering
  return `${baseName}-${index + 1}`;
}

// Helper function to extract source files from markdown frontmatter
function extractSourceFiles(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Try to find sourceFiles in frontmatter or content
  const sourceFilesMatch = content.match(/sourceFiles:\s*(\[.*?\])/);
  if (sourceFilesMatch) {
    try {
      return JSON.parse(sourceFilesMatch[1]);
    } catch (e) {
      return [];
    }
  }

  return [];
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
Backfill Visual Memory Database

Usage:
  node .aicodepath/scripts/backfill-visual-memory-db.js [options]

Options:
  --help          Show this help message
  --dry-run       Show what would be inserted without actually inserting
  --force         Re-insert diagrams even if they already exist (updates)

Description:
  Reads diagram files from aicodepath-docs/memory/ and inserts them into
  the visual_diagrams database table. Uses index.json for metadata.
`);
}

// Main execution
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
  console.log('  Visual Memory Database Backfill');
  console.log('═══════════════════════════════════════════════');
  console.log(`Project: ${projectRoot}`);
  if (options.dryRun) console.log('Mode: DRY RUN (no changes will be made)');
  if (options.force) console.log('Mode: FORCE (will update existing diagrams)');
  console.log();

  // Check if index.json exists
  const indexPath = path.join(projectRoot, 'aicodepath-docs', 'memory', 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.log('❌ No index.json found at:', indexPath);
    console.log('   Run visual memory generation first or create diagrams manually.');
    writer.close();
    return;
  }

  // Read index.json to get diagram metadata
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

  console.log(`Found ${index.diagrams.length} diagrams in index.json\n`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const diagram of index.diagrams) {
    const filePath = path.join(projectRoot, 'aicodepath-docs', 'memory', diagram.filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Error: File not found: ${diagram.filePath}`);
      errors++;
      continue;
    }

    try {
      // Extract ALL diagram blocks from file
      const diagramBlocks = extractMermaidDiagrams(filePath);

      if (diagramBlocks.length === 0) {
        console.log(`⚠️  Warning: No Mermaid code found in ${diagram.filePath}`);
        errors++;
        continue;
      }

      // Extract source files if available (shared by all blocks)
      const sourceFiles = extractSourceFiles(filePath);

      // Determine generation method from index metadata
      let generationMethod = diagram.method || 'manual';
      if (generationMethod === 'schema-analysis') generationMethod = 'static-ast';
      if (generationMethod === 'static-pattern') generationMethod = 'static-ast';
      if (generationMethod === 'regex') generationMethod = 'static-ast';

      // Process each diagram block separately
      for (const block of diagramBlocks) {
        // Generate unique name for this block
        const blockName = generateDiagramName(
          diagram.name,
          block.index,
          diagramBlocks.length,
          block.type
        );

        // Use detected type if available, otherwise fall back to index type
        const blockType = block.type || diagram.type;

        // Check if already in database (check by name and type)
        const existing = writer.db.prepare(`
          SELECT id FROM visual_diagrams
          WHERE name = ? AND diagram_type = ? AND status = 'active'
        `).get(blockName, blockType);

        if (existing && !options.force) {
          console.log(`⏭️  Skipping ${blockType}/${blockName} (already in database, id=${existing.id})`);
          skipped++;
          continue;
        }

        // Generate title for this block
        const blockTitle = diagramBlocks.length === 1
          ? diagram.title
          : `${diagram.title} (${block.index + 1}/${diagramBlocks.length})`;

        // Generate description
        const blockDescription = diagramBlocks.length === 1
          ? diagram.notes || null
          : `${diagram.notes || ''} - Block ${block.index + 1} of ${diagramBlocks.length} from ${path.basename(filePath)}`.trim();

        if (options.dryRun) {
          console.log(`[DRY RUN] Would insert ${blockType}/${blockName} (priority=${diagram.priority}, confidence=${diagram.confidence})`);
          inserted++;
          continue;
        }

        // If forcing and exists, delete old one first
        if (existing && options.force) {
          writer.db.prepare(`
            UPDATE visual_diagrams SET status = 'inactive'
            WHERE id = ?
          `).run(existing.id);
        }

        // Insert into database
        const result = writer.storeDiagram({
          diagramType: blockType,
          name: blockName,
          scope: diagram.scope || 'global',
          unitName: diagram.unitName || null,
          title: blockTitle,
          description: blockDescription,
          mermaidContent: block.content,
          generationMethod: generationMethod,
          confidence: diagram.confidence || 0.5,
          sourceFiles: sourceFiles,
          syncStrategy: diagram.syncStrategy || 'lazy',
          priority: diagram.priority || 50,
          relevanceTags: diagram.tags || [],
          filePath: `${diagram.filePath}#block-${block.index}`,
          crNumber: 'CR-VISUAL-MEMORY-BACKFILL'
        });

        if (existing && options.force) {
          console.log(`✓ Updated ${blockType}/${blockName} (id=${result.id}, blocks=${diagramBlocks.length})`);
          updated++;
        } else {
          console.log(`✓ Inserted ${blockType}/${blockName} (id=${result.id}, blocks=${diagramBlocks.length})`);
          inserted++;
        }
      }

    } catch (error) {
      console.log(`❌ Error processing ${diagram.filePath}: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Backfill Summary');
  console.log('═══════════════════════════════════════════════');
  console.log(`✓ Inserted: ${inserted}`);
  if (updated > 0) console.log(`✓ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total: ${index.diagrams.length}`);

  if (!options.dryRun) {
    // Show updated statistics
    console.log('\n═══════════════════════════════════════════════');
    console.log('  Database Statistics (After Backfill)');
    console.log('═══════════════════════════════════════════════');

    const stats = writer.getStatistics();
    console.log(`Total active diagrams: ${stats.total}`);
    console.log(`Fresh: ${stats.fresh}, Stale: ${stats.stale}`);
    console.log('\nBy Type:');
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`  ${type}: ${count}`);
    }
    console.log('\nBy Scope:');
    for (const [scope, count] of Object.entries(stats.byScope)) {
      console.log(`  ${scope}: ${count}`);
    }

    // List all diagrams (limit to 50 for readability)
    console.log('\n═══════════════════════════════════════════════');
    console.log('  Recent Diagrams in Database (Last 50)');
    console.log('═══════════════════════════════════════════════\n');

    const allDiagrams = writer.getActiveDiagrams({ includeStale: true, limit: 50 });
    for (const d of allDiagrams) {
      const staleIndicator = d.is_stale ? ' [STALE]' : '';
      console.log(`[${d.id}] ${d.diagram_type}/${d.name} - Priority: ${d.priority}, Confidence: ${d.confidence}${staleIndicator}`);
    }
  }

  writer.close();

  console.log('\n✓ Backfill complete!\n');
}

// Run main
try {
  main();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
