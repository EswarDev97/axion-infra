#!/usr/bin/env node
/**
 * Backfill Artifacts
 *
 * Scans aicodepath-docs/ for existing files and creates artifact entries
 * for any files not already in the database.
 */

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const ArtifactWriter = require('../lib/artifact-writer');
const KBWriter = require('../lib/kb-writer');

// Import detection functions from auto-artifact-creator
function detectArtifactType(filePath) {
  const normalized = filePath.toLowerCase();

  if (normalized.includes('/requirements/')) return 'requirement';
  if (normalized.includes('/user-stories/')) return 'story';
  if (normalized.includes('/plans/')) return 'plan';
  if (normalized.includes('/functional-design/')) return 'design';
  if (normalized.includes('/nfr-design/')) return 'design';
  if (normalized.includes('/database-design/')) return 'design';
  if (normalized.includes('/infrastructure-design/')) return 'design';
  if (normalized.includes('/docker-design/')) return 'design';
  if (normalized.includes('/kubernetes-design/')) return 'design';
  if (normalized.includes('/mobile-design/')) return 'design';
  if (normalized.includes('/web-ux-design/')) return 'design';
  if (normalized.includes('/ai-implementation/')) return 'design';
  if (normalized.includes('/cicd-design/')) return 'design';
  if (normalized.includes('/environment-strategy/')) return 'design';
  if (normalized.includes('/gap-analysis/')) return 'design';
  if (normalized.includes('/reverse-engineering/')) return 'design';
  if (normalized.includes('/application-design/')) return 'design';
  if (normalized.includes('/code/')) return 'code';
  if (normalized.includes('/build-and-test/')) return 'test';
  if (normalized.includes('/deployment/')) return 'deployment';
  if (normalized.includes('/sprint-tracking/')) return 'documentation';

  return 'documentation';
}

function detectPhase(filePath) {
  const normalized = filePath.toLowerCase();
  if (normalized.includes('/inception/')) return 'inception';
  if (normalized.includes('/construction/')) return 'construction';
  if (normalized.includes('/operations/')) return 'operations';
  return 'inception';
}

function detectStage(filePath) {
  const match = filePath.match(/aicodepath-docs\/[^/]+\/([^/]+)\//);
  return match ? match[1] : null;
}

function detectUnit(filePath) {
  const match = filePath.match(/construction\/([^/]+)\//);
  return match && match[1] !== 'cicd-design' && match[1] !== 'environment-strategy'
    ? match[1]
    : null;
}

function generateTitle(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));
  return basename
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function findAllMarkdownFiles(dir) {
  const files = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Skip special files
        if (!entry.name.match(/^(audit|aicodepath-state)\.md$/)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files;
}

async function backfillArtifacts() {
  try {
    const projectRoot = findProjectRoot(process.cwd());
    const docsDir = path.join(projectRoot, 'aicodepath-docs');

    if (!fs.existsSync(docsDir)) {
      console.log('No aicodepath-docs directory found');
      return;
    }

    console.log('🔍 Scanning for files...\n');

    const files = findAllMarkdownFiles(docsDir);
    console.log(`Found ${files.length} markdown files\n`);

    const writer = new ArtifactWriter(projectRoot);
    const kbWriter = new KBWriter(projectRoot);

    let created = 0;
    let skipped = 0;

    for (const file of files) {
      const relativePath = file.replace(projectRoot + '/', '');

      // Check if artifact already exists
      const phase = detectPhase(relativePath);
      const stage = detectStage(relativePath);
      const unit = detectUnit(relativePath);
      const title = generateTitle(relativePath);

      const existingArtifacts = writer.getArtifactsByPhase(phase, {
        stage,
        unit,
        limit: 1000
      });

      const exists = existingArtifacts.some(a =>
        a.file_path === relativePath || a.title === title
      );

      if (exists) {
        console.log(`⏭️  Skip: ${title} (already exists)`);
        skipped++;
      } else {
        const type = detectArtifactType(relativePath);

        const artifactId = writer.createArtifact(
          type,
          title,
          '', // Content in file
          relativePath,
          null,
          phase,
          stage,
          unit,
          { backfilled: true, backfill_date: new Date().toISOString() }
        );

        console.log(`✓ Created artifact #${artifactId}: ${title}`);
        created++;

        // Update workflow state for this stage
        if (stage) {
          const stageMap = {
            'requirements': 'Requirements Analysis',
            'user-stories': 'User Stories',
            'plans': 'Workflow Planning',
            'reverse-engineering': 'Reverse Engineering',
            'application-design': 'Application Design',
            'functional-design': 'Functional Design',
            'nfr-design': 'NFR Design',
            'database-design': 'Database Design',
            'infrastructure-design': 'Infrastructure Design',
            'docker-design': 'Docker Design',
            'kubernetes-design': 'Kubernetes Design',
            'mobile-design': 'Mobile Design',
            'web-ux-design': 'Web UI/UX Design',
            'ai-implementation': 'AI Implementation Design',
            'cicd-design': 'CI/CD Design',
            'environment-strategy': 'Environment Strategy',
            'gap-analysis': 'Gap Analysis',
            'code': 'Code Generation',
            'build-and-test': 'Build and Test',
            'deployment': 'Deployment',
            'sprint-tracking': 'Sprint Tracking'
          };

          const mappedStage = stageMap[stage] || stage;

          try {
            const existingStages = kbWriter.getPhaseStages(phase);
            const stageExists = existingStages && existingStages.some(s => s.stage === mappedStage);

            if (!stageExists) {
              kbWriter.initializePhaseStages(phase);
            }

            kbWriter.updateStageStatus(phase, mappedStage, 'completed');
          } catch (err) {
            // Ignore workflow state errors
          }
        }
      }
    }

    writer.close();
    kbWriter.close();

    console.log(`\n✅ Backfill complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${files.length}`);

  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  backfillArtifacts();
}

module.exports = { backfillArtifacts };
