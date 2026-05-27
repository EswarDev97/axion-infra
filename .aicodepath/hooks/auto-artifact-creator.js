#!/usr/bin/env node
/**
 * Auto-Artifact Creator Hook
 *
 * Automatically creates artifact entries in the database when files are written
 * to aicodepath-docs/ directories. This ensures the dashboard is populated
 * without requiring manual bash command execution.
 *
 * Triggered: post-tool-use on Write/Edit
 */

const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');
const ArtifactWriter = require('../lib/artifact-writer');
const KBWriter = require('../lib/kb-writer');
const ErrorHandler = require('../lib/error-handler');
const { DatabaseError, FileSystemError } = require('../lib/errors');
const logger = require('../lib/logger');

// Framework-source paths that should emit artifacts even though they live
// outside aicodepath-docs/. Writes to these paths are classified as
// phase='operations' with a subtype stage ('skill'|'agent'|'hook').
const FRAMEWORK_ASSET_PATTERNS = [
  { prefix: '/.aicodepath/skills/', stage: 'skill' },
  { prefix: '/.aicodepath/agents/', stage: 'agent' },
  { prefix: '/.aicodepath/hooks/',  stage: 'hook'  }
];

function matchFrameworkAsset(filePath) {
  if (!filePath) return null;
  return FRAMEWORK_ASSET_PATTERNS.find(p => filePath.includes(p.prefix)) || null;
}

function isTrackable(filePath) {
  if (!filePath) return false;
  if (filePath.includes('aicodepath-docs/')) return true;
  return matchFrameworkAsset(filePath) !== null;
}

/**
 * Detect artifact type from file path
 */
function detectArtifactType(filePath) {
  const normalized = filePath.toLowerCase();

  // Check directory patterns
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

  // Fallback to documentation
  return 'documentation';
}

/**
 * Detect phase from file path
 */
function detectPhase(filePath) {
  const normalized = filePath.toLowerCase();

  if (matchFrameworkAsset(filePath)) return 'operations';

  if (normalized.includes('/inception/')) return 'inception';
  if (normalized.includes('/construction/')) return 'construction';
  if (normalized.includes('/operations/')) return 'operations';

  // Default to inception for root aicodepath-docs files
  return 'inception';
}

/**
 * Extract stage from file path
 */
function detectStage(filePath) {
  const framework = matchFrameworkAsset(filePath);
  if (framework) return framework.stage;

  const match = filePath.match(/aicodepath-docs\/[^/]+\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Extract unit from file path
 */
function detectUnit(filePath) {
  const match = filePath.match(/construction\/([^/]+)\//);
  return match && match[1] !== 'cicd-design' && match[1] !== 'environment-strategy'
    ? match[1]
    : null;
}

/**
 * Generate title from file path
 */
function generateTitle(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));

  // Convert kebab-case or snake_case to Title Case
  return basename
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Update workflow state based on file writes
 */
async function updateWorkflowState(filePath, projectRoot) {
  try {
    const phase = detectPhase(filePath);
    let stage = detectStage(filePath);

    if (!stage) return; // Skip if we can't detect stage

    // Convert directory names to proper stage names
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

    stage = stageMap[stage] || stage;

    const writer = new KBWriter(projectRoot);

    // Get all stages for this phase
    const existingStages = writer.getPhaseStages(phase);
    const stageExists = existingStages && existingStages.some(s => s.stage === stage);

    if (!stageExists) {
      // Initialize phase if needed (this will create all stages for the phase)
      writer.initializePhaseStages(phase);
    }

    // Update the specific stage to completed
    writer.updateStageStatus(phase, stage, 'completed');

    writer.close();
  } catch (err) {
    logger.error('Failed to update workflow state', {
      error: err.message,
      filePath,
      stack: err.stack
    });
  }
}

/**
 * Main hook implementation
 */
async function autoArtifactCreatorImpl(params) {
  // Re-entry guard (a): environment variable set by ArtifactWriter before calling Write/Edit
  // Prevents infinite recursion when T10/T11 ArtifactWriter wiring triggers this hook again.
  if (process.env.ACP_SUPPRESS_AUTO_ARTIFACT === '1') {
    logger.info('skip: re-entry guard triggered', { context: 'auto-artifact-creator', reason: 'env' });
    return { proceed: true };
  }

  // Re-entry guard (b): metadata field stamped by ArtifactWriter on its own Write payloads
  if (params?.metadata?.source === 'artifact-writer') {
    logger.info('skip: re-entry guard triggered', { context: 'auto-artifact-creator', reason: 'metadata' });
    return { proceed: true };
  }

  const { file_path, tool_name } = params;

  // Only process Write and Edit tools
  if (!['Write', 'Edit'].includes(tool_name)) {
    return { proceed: true };
  }

  // Only process files under aicodepath-docs/ OR framework-asset paths
  // (skills/agents/hooks). Framework assets are classified as phase=operations.
  if (!isTrackable(file_path)) {
    return { proceed: true };
  }

  // Skip database files
  if (file_path.endsWith('.db') || file_path.endsWith('.db-journal')) {
    return { proceed: true };
  }

  const projectRoot = findProjectRoot(process.cwd());
  const artifactWriter = new ArtifactWriter(projectRoot);

  // Detect artifact properties
  const type = detectArtifactType(file_path);
  const phase = detectPhase(file_path);
  const stage = detectStage(file_path);
  const unit = detectUnit(file_path);
  const title = generateTitle(file_path);

  // Check if artifact already exists for this file
  const existingArtifacts = artifactWriter.getArtifactsByPhase(phase, {
    stage,
    unit,
    limit: 1000
  });

  const exists = existingArtifacts.some(a =>
    a.file_path === file_path || a.title === title
  );

  if (!exists) {
    // Create artifact entry
    try {
      const artifactId = artifactWriter.createArtifact(
        type,
        title,
        '', // Content stored in file, not DB
        file_path,
        null, // CR number
        phase,
        stage,
        unit,
        { auto_created: true }
      );

      logger.info('Created artifact', {
        artifactId,
        title,
        type,
        phase,
        stage,
        filePath: file_path
      });
    } catch (err) {
      throw new DatabaseError(`Failed to create artifact: ${err.message}`);
    }
  }

  artifactWriter.close();

  // Update workflow state
  await updateWorkflowState(file_path, projectRoot);

  return {
    proceed: true,
    message: exists
      ? null
      : `Auto-created artifact: ${title}`,
    data: { artifactCreated: !exists }
  };
}

module.exports = {
  hook: ErrorHandler.wrapHook('auto-artifact-creator', autoArtifactCreatorImpl)
};

// Claude Code stdin/stdout hook protocol
if (require.main === module) {
  const { wrapHook } = require('./lib/hook-wrapper');
  wrapHook(autoArtifactCreatorImpl, { name: 'auto-artifact-creator' });
}
