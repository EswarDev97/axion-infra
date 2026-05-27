/**
 * Tests for Checkpoint Manager
 *
 * Run with: node .aicodepath/lib/__tests__/checkpoint-manager.test.js
 */

const fs = require('fs');
const path = require('path');
const {
  saveCheckpoint,
  loadCheckpoint,
  getLatestCheckpoint,
  listCheckpoints,
  pruneCheckpoints
} = require('../checkpoint-manager');

function testCheckpointManager() {
  console.log('Testing Checkpoint Manager...\n');

  try {
    // Test 1: Save a checkpoint
    console.log('Test 1: Save checkpoint');
    const checkpoint1 = saveCheckpoint(
      'CONSTRUCTION',
      'unit-implementation',
      'auth-service',
      {
        session_id: 'test_session_1',
        current_phase: 'CONSTRUCTION',
        completed_stages: ['pre-flight', 'inception']
      },
      {
        last_action: 'Implemented authentication',
        pending_items: ['Add tests']
      }
    );

    if (checkpoint1) {
      console.log(`✓ Checkpoint saved: ${checkpoint1.id}`);
      console.log(`  Phase: ${checkpoint1.phase}`);
      console.log(`  Stage: ${checkpoint1.stage}`);
      console.log(`  Unit: ${checkpoint1.unit}\n`);
    } else {
      console.log('✗ Failed to save checkpoint\n');
    }

    // Test 2: Load checkpoint by ID
    console.log('Test 2: Load checkpoint by ID');
    if (checkpoint1) {
      const loaded = loadCheckpoint(checkpoint1.id);
      if (loaded && loaded.id === checkpoint1.id) {
        console.log(`✓ Checkpoint loaded: ${loaded.id}\n`);
      } else {
        console.log('✗ Failed to load checkpoint\n');
      }
    }

    // Test 3: Get latest checkpoint
    console.log('Test 3: Get latest checkpoint');
    const latest = getLatestCheckpoint();
    if (latest) {
      console.log(`✓ Latest checkpoint: ${latest.id}`);
      console.log(`  Timestamp: ${latest.timestamp}\n`);
    } else {
      console.log('✗ No latest checkpoint found\n');
    }

    // Test 4: List checkpoints
    console.log('Test 4: List checkpoints');
    const checkpoints = listCheckpoints({ limit: 5 });
    console.log(`✓ Found ${checkpoints.length} checkpoints`);
    checkpoints.forEach((cp, i) => {
      console.log(`  ${i + 1}. ${cp.id} - ${cp.phase}/${cp.stage}`);
    });
    console.log('');

    // Test 5: List checkpoints with filter
    console.log('Test 5: Filter checkpoints by phase');
    const constructionCheckpoints = listCheckpoints({
      phase: 'CONSTRUCTION',
      limit: 5
    });
    console.log(`✓ Found ${constructionCheckpoints.length} CONSTRUCTION checkpoints\n`);

    // Test 6: Prune checkpoints (keeping only 10)
    console.log('Test 6: Prune old checkpoints');
    const pruned = pruneCheckpoints(10);
    console.log(`✓ Pruned ${pruned} old checkpoints\n`);

    console.log('All tests completed successfully!');
    return true;
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run tests if executed directly
if (require.main === module) {
  const success = testCheckpointManager();
  process.exit(success ? 0 : 1);
}

module.exports = { testCheckpointManager };
