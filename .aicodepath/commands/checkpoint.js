/**
 * Checkpoint Command - Create and inspect session recovery points
 *
 * Commands:
 * - create [--message <msg>]: Create a new checkpoint
 * - list [--phase <phase>] [--limit <n>]: List recent checkpoints
 * - show <id>: Show checkpoint details
 * - compare <id1> <id2>: Compare two checkpoints
 *
 * @module commands/checkpoint
 */

'use strict';

const {
  saveCheckpoint,
  loadCheckpoint,
  listCheckpoints,
} = require('../lib/checkpoint-manager');
const pathResolver = require('../lib/path-resolver');
const logger = require('../lib/logger');

/**
 * Execute checkpoint command
 * @param {string} action - create | list | show | compare
 * @param {Object} options - Command options
 */
async function execute(action, options = {}) {
  switch (action) {
    case 'create':
      return createCheckpoint(options);
    case 'list':
      return listCheckpointCmd(options);
    case 'show':
      return showCheckpoint(options.id);
    case 'compare':
      return compareCheckpoints(options.id1, options.id2);
    default:
      console.error(`❌ Unknown action: ${action}. Use create, list, show, or compare.`);
      process.exit(1);
  }
}

/**
 * Create a new checkpoint
 */
function createCheckpoint(options) {
  const message = options.message || 'Manual checkpoint';

  // Derive phase/stage from message for labelling — keep it simple
  const phase = options.phase || 'MANUAL';
  const stage = options.stage || 'checkpoint';

  const checkpoint = saveCheckpoint(phase, stage, '', { message }, { source: 'cli' });

  if (!checkpoint) {
    console.error('❌ Failed to create checkpoint. Is the DB initialised?');
    console.error('   Run: bash .aicodepath/scripts/init-knowledge-base.sh');
    process.exit(1);
  }

  console.log('\n✅ Checkpoint created\n');
  console.log(`   ID:        ${checkpoint.id}`);
  console.log(`   Message:   ${message}`);
  console.log(`   Phase:     ${checkpoint.phase}`);
  console.log(`   Timestamp: ${checkpoint.timestamp}`);
  if (checkpoint.metadata?.git_commit) {
    console.log(`   Git:       ${checkpoint.metadata.git_branch} @ ${checkpoint.metadata.git_commit}`);
  }
  console.log('');
  console.log(`   Restore with: /aicodepath-rewind`);
  console.log(`   Inspect with: node .aicodepath/bin/aicodepath.js checkpoint show ${checkpoint.id}`);
  console.log('');
}

/**
 * List recent checkpoints
 */
function listCheckpointCmd(options) {
  const filterOptions = {};
  if (options.phase) filterOptions.phase = options.phase;
  if (options.limit) filterOptions.limit = parseInt(options.limit, 10);

  const checkpoints = listCheckpoints(filterOptions);

  if (checkpoints.length === 0) {
    console.log('\n  No checkpoints found.');
    console.log('  Create one with: node .aicodepath/bin/aicodepath.js checkpoint create --message "Before X"\n');
    return;
  }

  console.log(`\n📋 Checkpoints (${checkpoints.length})\n`);
  console.log('  ' + ['ID', 'Timestamp', 'Phase', 'Stage', 'Git'].map(h => h.padEnd(28)).join(''));
  console.log('  ' + '-'.repeat(112));

  for (const cp of checkpoints) {
    const ts = new Date(cp.timestamp).toLocaleString();
    const git = cp.git_commit ? `${cp.git_branch}@${cp.git_commit}` : '—';
    console.log(
      '  ' +
      cp.id.padEnd(28) +
      ts.padEnd(28) +
      String(cp.phase || '—').padEnd(28) +
      String(cp.stage || '—').padEnd(28) +
      git
    );
  }
  console.log('');
  console.log('  Inspect: node .aicodepath/bin/aicodepath.js checkpoint show <id>');
  console.log('');
}

/**
 * Show full details of a checkpoint
 */
function showCheckpoint(id) {
  if (!id) {
    console.error('❌ Checkpoint ID required. Use: checkpoint show <id>');
    process.exit(1);
  }

  const checkpoint = loadCheckpoint(id);

  if (!checkpoint) {
    console.error(`❌ Checkpoint not found: ${id}`);
    console.error('   List available checkpoints: node .aicodepath/bin/aicodepath.js checkpoint list');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`Checkpoint: ${checkpoint.id}`);
  console.log('='.repeat(70));
  console.log(`Timestamp : ${checkpoint.timestamp}`);
  console.log(`Phase     : ${checkpoint.phase || '—'}`);
  console.log(`Stage     : ${checkpoint.stage || '—'}`);
  console.log(`Unit      : ${checkpoint.unit || '—'}`);
  if (checkpoint.metadata) {
    console.log(`Version   : ${checkpoint.metadata.aicodepath_version}`);
    console.log(`Project   : ${checkpoint.metadata.project_name}`);
    if (checkpoint.metadata.git_commit) {
      console.log(`Git       : ${checkpoint.metadata.git_branch} @ ${checkpoint.metadata.git_commit}`);
    }
  }
  if (checkpoint.state?.message) {
    console.log(`Message   : ${checkpoint.state.message}`);
  }
  if (checkpoint.context && Object.keys(checkpoint.context).length > 0) {
    console.log('\nContext:');
    console.log(JSON.stringify(checkpoint.context, null, 2));
  }
  if (checkpoint.state && Object.keys(checkpoint.state).length > 1) {
    console.log('\nState:');
    const { message: _msg, ...rest } = checkpoint.state;
    if (Object.keys(rest).length > 0) {
      console.log(JSON.stringify(rest, null, 2));
    }
  }
  console.log('');
}

/**
 * Compare two checkpoints side-by-side
 */
function compareCheckpoints(id1, id2) {
  if (!id1 || !id2) {
    console.error('❌ Two checkpoint IDs required. Use: checkpoint compare <id1> <id2>');
    process.exit(1);
  }

  const cp1 = loadCheckpoint(id1);
  const cp2 = loadCheckpoint(id2);

  if (!cp1) { console.error(`❌ Checkpoint not found: ${id1}`); process.exit(1); }
  if (!cp2) { console.error(`❌ Checkpoint not found: ${id2}`); process.exit(1); }

  console.log('\n' + '='.repeat(70));
  console.log('Checkpoint Comparison');
  console.log('='.repeat(70));

  const fields = ['id', 'timestamp', 'phase', 'stage', 'unit'];
  const colW = 32;

  console.log('\n  ' + 'Field'.padEnd(16) + id1.slice(0, colW).padEnd(colW) + id2.slice(0, colW));
  console.log('  ' + '-'.repeat(16 + colW * 2));

  for (const field of fields) {
    const v1 = String(cp1[field] || '—');
    const v2 = String(cp2[field] || '—');
    const changed = v1 !== v2 ? ' ← changed' : '';
    console.log('  ' + field.padEnd(16) + v1.slice(0, colW).padEnd(colW) + v2.slice(0, colW) + changed);
  }

  // Git comparison
  const git1 = cp1.metadata?.git_commit || '—';
  const git2 = cp2.metadata?.git_commit || '—';
  const gitChanged = git1 !== git2 ? ' ← changed' : '';
  console.log('  ' + 'git_commit'.padEnd(16) + git1.padEnd(colW) + git2 + gitChanged);

  // Message comparison
  const msg1 = cp1.state?.message || '—';
  const msg2 = cp2.state?.message || '—';
  console.log('  ' + 'message'.padEnd(16) + msg1.slice(0, colW).padEnd(colW) + msg2.slice(0, colW));

  const ms1 = new Date(cp1.timestamp).getTime();
  const ms2 = new Date(cp2.timestamp).getTime();
  const diffMin = Math.round(Math.abs(ms2 - ms1) / 60000);
  console.log(`\n  Time between checkpoints: ${diffMin} minute(s)`);
  console.log('');
}

module.exports = execute;
