#!/usr/bin/env node
/**
 * Diagnose Visual Diagram Data Issues
 *
 * Checks for:
 * - NULL or empty mermaid_content in database
 * - Data type mismatches
 * - Content length/truncation issues
 * - File vs database discrepancies
 */

const pathResolver = require('../lib/path-resolver');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

function main() {
  const projectPath = process.argv[2] || process.cwd();
  const dbPath = path.join(projectPath, 'aicodepath-docs', 'aicodepath.db');

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`Visual Diagrams Diagnostic Report`);
  console.log(`═══════════════════════════════════════════════════`);
  console.log(`Project: ${projectPath}`);
  console.log(`Database: ${dbPath}\n`);

  if (!fs.existsSync(dbPath)) {
    console.error(`✗ Database not found: ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath, { readonly: true });

  // 1. Check for NULL or empty content
  console.log(`\n1. NULL/Empty Content Check`);
  console.log(`${'─'.repeat(50)}`);

  const nullCheck = db.prepare(`
    SELECT
      id,
      name,
      diagram_type,
      mermaid_content IS NULL as is_null,
      length(mermaid_content) as len,
      typeof(mermaid_content) as sql_type
    FROM visual_diagrams
    WHERE status = 'active'
      AND (mermaid_content IS NULL OR length(mermaid_content) = 0)
  `).all();

  if (nullCheck.length === 0) {
    console.log(`✓ No NULL or empty mermaid_content found`);
  } else {
    console.log(`✗ Found ${nullCheck.length} diagrams with NULL/empty content:`);
    nullCheck.forEach(d => {
      console.log(`  - ID ${d.id}: ${d.diagram_type}/${d.name}`);
      console.log(`    Status: ${d.is_null ? 'NULL' : 'EMPTY'} (SQL type: ${d.sql_type})`);
    });
  }

  // 2. Check data types
  console.log(`\n2. Data Type Analysis`);
  console.log(`${'─'.repeat(50)}`);

  const typeCheck = db.prepare(`
    SELECT
      typeof(mermaid_content) as sql_type,
      COUNT(*) as count,
      AVG(length(mermaid_content)) as avg_len
    FROM visual_diagrams
    WHERE status = 'active'
    GROUP BY typeof(mermaid_content)
  `).all();

  typeCheck.forEach(row => {
    const icon = row.sql_type === 'text' ? '✓' : '✗';
    console.log(`${icon} ${row.sql_type}: ${row.count} diagrams (avg ${Math.round(row.avg_len)} chars)`);
  });

  // 3. Content length distribution
  console.log(`\n3. Content Length Distribution`);
  console.log(`${'─'.repeat(50)}`);

  const lengthDist = db.prepare(`
    SELECT
      CASE
        WHEN length(mermaid_content) = 0 THEN '0 (EMPTY)'
        WHEN length(mermaid_content) < 50 THEN '1-49 (TOO SHORT)'
        WHEN length(mermaid_content) < 500 THEN '50-499 (SHORT)'
        WHEN length(mermaid_content) < 5000 THEN '500-4999 (NORMAL)'
        ELSE '5000+ (LARGE)'
      END as range,
      COUNT(*) as count
    FROM visual_diagrams
    WHERE status = 'active'
    GROUP BY range
    ORDER BY MIN(length(mermaid_content))
  `).all();

  lengthDist.forEach(row => {
    const isGood = row.range.includes('NORMAL') || row.range.includes('LARGE');
    const icon = isGood ? '✓' : '✗';
    console.log(`${icon} ${row.range}: ${row.count} diagrams`);
  });

  // 4. Check for --- separators (the concatenation bug)
  console.log(`\n4. Concatenation Check (--- separators)`);
  console.log(`${'─'.repeat(50)}`);

  const concatCheck = db.prepare(`
    SELECT
      id,
      name,
      diagram_type,
      (length(mermaid_content) - length(REPLACE(mermaid_content, '---', ''))) / 3 as dash_count,
      CASE
        WHEN instr(mermaid_content, '---') > 0 THEN 'FOUND'
        ELSE 'NONE'
      END as has_separator
    FROM visual_diagrams
    WHERE status = 'active'
    ORDER BY dash_count DESC
  `).all();

  const withSeparators = concatCheck.filter(d => d.dash_count > 0);
  if (withSeparators.length === 0) {
    console.log(`✓ No --- separators found (no concatenation issues)`);
  } else {
    console.log(`✗ Found ${withSeparators.length} diagrams with --- separators:`);
    withSeparators.forEach(d => {
      console.log(`  - ID ${d.id}: ${d.diagram_type}/${d.name} (${d.dash_count} separators)`);
    });
  }

  // 5. Check individual diagram validity
  console.log(`\n5. Content Validation`);
  console.log(`${'─'.repeat(50)}`);

  const allDiagrams = db.prepare(`
    SELECT id, name, diagram_type, mermaid_content
    FROM visual_diagrams
    WHERE status = 'active'
    ORDER BY id
  `).all();

  const validKeywords = ['erDiagram', 'classDiagram', 'sequenceDiagram',
                         'flowchart', 'graph', 'stateDiagram', 'journey',
                         'C4Context', 'C4Container', 'C4Component', 'C4Deployment'];

  let validCount = 0;
  let invalidCount = 0;
  const issues = [];

  for (const diagram of allDiagrams) {
    if (!diagram.mermaid_content) {
      invalidCount++;
      issues.push(`ID ${diagram.id}: NULL content`);
      continue;
    }

    // Convert Buffer to string if blob type
    let content = diagram.mermaid_content;
    if (Buffer.isBuffer(content)) {
      content = content.toString('utf8');
      issues.push(`ID ${diagram.id}: BLOB type detected (should be TEXT)`);
      invalidCount++;
    }

    const trimmed = content.trim();
    const hasValidStart = validKeywords.some(kw => trimmed.startsWith(kw));

    if (!hasValidStart) {
      invalidCount++;
      issues.push(`ID ${diagram.id}: Invalid start - "${trimmed.substring(0, 30)}..."`);
    } else if (trimmed.length < 50) {
      invalidCount++;
      issues.push(`ID ${diagram.id}: Too short (${trimmed.length} chars)`);
    } else if (!Buffer.isBuffer(diagram.mermaid_content)) {
      validCount++;
    }
  }

  console.log(`✓ Valid diagrams: ${validCount}`);
  if (invalidCount > 0) {
    console.log(`✗ Invalid diagrams: ${invalidCount}`);
    console.log(`\nIssues found:`);
    issues.slice(0, 10).forEach(issue => console.log(`  - ${issue}`));
    if (issues.length > 10) {
      console.log(`  ... and ${issues.length - 10} more`);
    }
  }

  // 6. Sample content check
  console.log(`\n6. Sample Content (First Diagram)`);
  console.log(`${'─'.repeat(50)}`);

  const sample = db.prepare(`
    SELECT id, name, diagram_type,
           length(mermaid_content) as len,
           substr(mermaid_content, 1, 200) as sample
    FROM visual_diagrams
    WHERE status = 'active' AND mermaid_content IS NOT NULL
    ORDER BY id
    LIMIT 1
  `).get();

  if (sample) {
    console.log(`Diagram: ${sample.diagram_type}/${sample.name} (ID ${sample.id})`);
    console.log(`Length: ${sample.len} characters`);

    // Convert Buffer to string if needed
    let sampleText = sample.sample;
    if (Buffer.isBuffer(sampleText)) {
      sampleText = sampleText.toString('utf8');
    }
    console.log(`Sample:\n${sampleText}...`);
  }

  // 7. Summary
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`Summary`);
  console.log(`═══════════════════════════════════════════════════`);
  console.log(`Total active diagrams: ${allDiagrams.length}`);
  console.log(`NULL/Empty content: ${nullCheck.length}`);
  console.log(`With --- separators: ${withSeparators.length}`);
  console.log(`Valid for rendering: ${validCount}`);
  console.log(`Issues found: ${invalidCount}`);

  if (invalidCount === 0 && nullCheck.length === 0 && withSeparators.length === 0) {
    console.log(`\n✓ Database looks healthy - issue might be in API/UI layer`);
  } else {
    console.log(`\n✗ Database has data quality issues - run cleanup/regeneration`);
    if (withSeparators.length > 0) {
      console.log(`\nRecommended fix:`);
      console.log(`1. Fix backfill script (extract only first diagram)`);
      console.log(`2. Delete diagrams with separators`);
      console.log(`3. Re-run backfill script`);
    }
  }

  console.log(`═══════════════════════════════════════════════════\n`);

  db.close();
}

main();
