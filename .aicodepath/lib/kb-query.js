#!/usr/bin/env node
/**
 * Knowledge Base Query CLI
 *
 * Query AICodePath documentation database and code index
 *
 * Usage:
 *   node lib/kb-query.js get-stats              # Database statistics
 *   node lib/kb-query.js search <term>          # Search artifacts
 *   node lib/kb-query.js recent-decisions       # Recent decisions
 *   node lib/kb-query.js workflow-progress      # Workflow progress
 *   node lib/kb-query.js artifacts [phase]      # List artifacts
 *   node lib/kb-query.js export-markdown        # Export all to markdown
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

const { getDbPath } = require('./path-resolver');
const PROJECT_ROOT = process.cwd();
const DB_PATH = getDbPath();

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('Error: Knowledge base not initialized.');
  console.error('Run: npm run init-kb');
  process.exit(1);
}

const db = new Database(DB_PATH);

/**
 * Get database statistics
 */
function getStats() {
  console.log('\n📊 Knowledge Base Statistics\n');
  console.log('━'.repeat(50));

  // Overall counts
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM artifacts) as artifacts,
      (SELECT COUNT(*) FROM decisions) as decisions,
      (SELECT COUNT(*) FROM links) as links,
      (SELECT COUNT(*) FROM code_entities) as code_entities,
      (SELECT COUNT(*) FROM validations) as validations
  `).get();

  console.log(`\n📁 Overall:`);
  console.log(`   Artifacts:     ${counts.artifacts}`);
  console.log(`   Decisions:     ${counts.decisions}`);
  console.log(`   Links:         ${counts.links}`);
  console.log(`   Code Entities: ${counts.code_entities}`);
  console.log(`   Validations:   ${counts.validations}`);

  // Artifacts by type
  const byType = db.prepare(`
    SELECT artifact_type, COUNT(*) as count
    FROM artifacts
    GROUP BY artifact_type
    ORDER BY count DESC
  `).all();

  if (byType.length > 0) {
    console.log(`\n📋 Artifacts by Type:`);
    byType.forEach(row => {
      console.log(`   ${row.artifact_type.padEnd(15)} ${row.count}`);
    });
  }

  // Artifacts by phase
  const byPhase = db.prepare(`
    SELECT phase, COUNT(*) as count
    FROM artifacts
    WHERE phase IS NOT NULL
    GROUP BY phase
    ORDER BY phase
  `).all();

  if (byPhase.length > 0) {
    console.log(`\n🎯 Artifacts by Phase:`);
    byPhase.forEach(row => {
      console.log(`   ${row.phase.padEnd(15)} ${row.count}`);
    });
  }

  // Recent activity
  const recent = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM artifacts
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 5
  `).all();

  if (recent.length > 0) {
    console.log(`\n📅 Recent Activity:`);
    recent.forEach(row => {
      console.log(`   ${row.date}  ${row.count} artifacts`);
    });
  }

  console.log('\n' + '━'.repeat(50) + '\n');
}

/**
 * Search artifacts
 */
function searchArtifacts(term) {
  console.log(`\n🔍 Searching for: "${term}"\n`);
  console.log('━'.repeat(80));

  const results = db.prepare(`
    SELECT
      a.id,
      a.artifact_type,
      a.title,
      a.phase,
      snippet(artifacts_fts, 0, '→ ', ' ←', '...', 50) as snippet
    FROM artifacts_fts
    JOIN artifacts a ON a.id = artifacts_fts.rowid
    WHERE artifacts_fts MATCH ?
    ORDER BY rank
    LIMIT 20
  `).all(term);

  if (results.length === 0) {
    console.log('\n❌ No results found\n');
    return;
  }

  results.forEach((row, i) => {
    console.log(`\n${i + 1}. [${row.artifact_type}] ${row.title}`);
    if (row.phase) console.log(`   Phase: ${row.phase}`);
    if (row.snippet) console.log(`   ${row.snippet}`);
  });

  console.log('\n' + '━'.repeat(80));
  console.log(`\n✓ Found ${results.length} results\n`);
}

/**
 * Show recent decisions
 */
function recentDecisions(limit = 10) {
  console.log(`\n📝 Recent Decisions (${limit})\n`);
  console.log('━'.repeat(80));

  const decisions = db.prepare(`
    SELECT
      id,
      title,
      decision,
      status,
      decided_at
    FROM decisions
    ORDER BY decided_at DESC
    LIMIT ?
  `).all(limit);

  if (decisions.length === 0) {
    console.log('\n❌ No decisions recorded yet\n');
    return;
  }

  decisions.forEach((row, i) => {
    const date = new Date(row.decided_at).toLocaleDateString();
    console.log(`\n${i + 1}. ${row.title}`);
    console.log(`   Status: ${row.status} | Date: ${date}`);
    console.log(`   Decision: ${row.decision.substring(0, 200)}${row.decision.length > 200 ? '...' : ''}`);
  });

  console.log('\n' + '━'.repeat(80) + '\n');
}

/**
 * Show workflow progress
 */
function workflowProgress() {
  console.log('\n🎯 Workflow Progress\n');
  console.log('━'.repeat(80));

  const progress = db.prepare(`
    SELECT * FROM v_workflow_progress
  `).all();

  if (progress.length === 0) {
    console.log('\n❌ No workflow data available\n');
    return;
  }

  progress.forEach(row => {
    const percentage = ((row.completed_count / row.total_count) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));

    console.log(`\n${row.phase}`);
    console.log(`   ${bar} ${percentage}%`);
    console.log(`   ${row.completed_count}/${row.total_count} completed`);
  });

  console.log('\n' + '━'.repeat(80) + '\n');
}

/**
 * List artifacts
 */
function listArtifacts(phase = null) {
  const title = phase ? `Artifacts - ${phase}` : 'All Artifacts';
  console.log(`\n📁 ${title}\n`);
  console.log('━'.repeat(80));

  let query = `
    SELECT
      id,
      artifact_type,
      title,
      phase,
      status,
      created_at
    FROM artifacts
  `;

  const params = [];
  if (phase) {
    query += ' WHERE phase = ?';
    params.push(phase);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  const artifacts = db.prepare(query).all(...params);

  if (artifacts.length === 0) {
    console.log('\n❌ No artifacts found\n');
    return;
  }

  let currentPhase = null;
  artifacts.forEach((row, i) => {
    if (row.phase !== currentPhase) {
      if (currentPhase !== null) console.log('');
      currentPhase = row.phase;
      console.log(`\n📌 ${currentPhase || 'No Phase'}`);
    }

    const date = new Date(row.created_at).toLocaleDateString();
    const status = row.status ? `[${row.status}]` : '';
    console.log(`   ${i + 1}. [${row.artifact_type}] ${row.title} ${status}`);
    console.log(`      Created: ${date}`);
  });

  console.log('\n' + '━'.repeat(80));
  console.log(`\n✓ Found ${artifacts.length} artifacts\n`);
}

/**
 * Export all artifacts to markdown
 */
function exportMarkdown(outputDir = 'aicodepath-docs/export') {
  const exportPath = path.join(PROJECT_ROOT, outputDir);

  // Create export directory
  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
  }

  console.log(`\n📤 Exporting to: ${exportPath}\n`);
  console.log('━'.repeat(80));

  const artifacts = db.prepare(`
    SELECT * FROM artifacts ORDER BY phase, artifact_type, created_at
  `).all();

  let exported = 0;
  let currentPhase = null;

  artifacts.forEach(artifact => {
    // Create phase directory
    const phaseDir = path.join(exportPath, artifact.phase || 'general');
    if (!fs.existsSync(phaseDir)) {
      fs.mkdirSync(phaseDir, { recursive: true });
    }

    if (artifact.phase !== currentPhase) {
      currentPhase = artifact.phase;
      console.log(`\n📁 ${currentPhase || 'General'}`);
    }

    // Create filename
    const filename = `${artifact.artifact_type}-${artifact.id}.md`;
    const filepath = path.join(phaseDir, filename);

    // Generate markdown content
    const content = `# ${artifact.title}

**Type**: ${artifact.artifact_type}
**Phase**: ${artifact.phase || 'N/A'}
**Stage**: ${artifact.stage || 'N/A'}
**Status**: ${artifact.status || 'N/A'}
**CR Number**: ${artifact.cr_number || 'N/A'}
**Created**: ${artifact.created_at}

## Content

${artifact.content || 'No content'}

## Metadata

\`\`\`json
${artifact.metadata || '{}'}
\`\`\`

---
*Exported from AICodePath Knowledge Base*
`;

    fs.writeFileSync(filepath, content);
    console.log(`   ✓ ${filename}`);
    exported++;
  });

  console.log('\n' + '━'.repeat(80));
  console.log(`\n✅ Exported ${exported} artifacts to ${outputDir}\n`);
}

// CLI commands
program
  .name('kb-query')
  .description('Query AICodePath knowledge base')
  .version('1.0.0');

program
  .command('get-stats')
  .description('Show database statistics')
  .action(getStats);

program
  .command('search <term>')
  .description('Search artifacts by keyword')
  .action(searchArtifacts);

program
  .command('recent-decisions')
  .description('Show recent decisions')
  .option('-l, --limit <number>', 'Number of decisions to show', '10')
  .action((options) => recentDecisions(parseInt(options.limit)));

program
  .command('workflow-progress')
  .description('Show workflow progress by phase')
  .action(workflowProgress);

program
  .command('artifacts [phase]')
  .description('List all artifacts or filter by phase')
  .action(listArtifacts);

program
  .command('export-markdown')
  .description('Export all artifacts to markdown files')
  .option('-o, --output <dir>', 'Output directory', 'aicodepath-docs/export')
  .action((options) => exportMarkdown(options.output));

program.parse();

// Close database on exit
process.on('exit', () => {
  db.close();
});
