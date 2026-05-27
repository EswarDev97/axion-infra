#!/usr/bin/env node
/**
 * Simple test for session-resumption.js
 * Tests the three main exported functions
 */

const { detectPreviousSession, generateResumeSummary, getResumeActions } = require('./session-resumption');

console.log('Testing session-resumption module...\n');

// Test 1: detectPreviousSession
console.log('1. Testing detectPreviousSession()...');
try {
  const result = detectPreviousSession();
  if (result.found) {
    console.log('✓ Previous session detected');
    console.log(`  - Checkpoint ID: ${result.checkpoint.id}`);
    console.log(`  - Age: ${result.age.relative}`);
    console.log(`  - Is Returning: ${result.isReturning}`);
    console.log(`  - Phase/Stage/Unit: ${result.summary.phase}/${result.summary.stage}/${result.summary.unit}`);
  } else {
    console.log('✓ No previous session found (expected for new project)');
  }
} catch (error) {
  console.error('✗ detectPreviousSession failed:', error.message);
  process.exit(1);
}

console.log('\n2. Testing generateResumeSummary()...');
try {
  // Test with mock checkpoint
  const mockCheckpoint = {
    id: 'cp_20260205_143022_abc12',
    phase: 'CONSTRUCTION',
    stage: 'unit-implementation',
    unit: 'auth-service',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    state: {
      quality_gates: {
        tests_passed: true,
        mock_detection_passed: true,
        duplication_passed: true
      }
    },
    context: {
      last_action: 'Implemented JWT token validation',
      pending_items: ['Write integration tests', 'Update documentation']
    },
    metadata: {
      git_branch: 'feature-auth',
      git_commit: 'a3f4c2d'
    }
  };

  const summary = generateResumeSummary(mockCheckpoint);
  console.log('✓ Summary generated successfully');
  console.log('\n--- Generated Summary ---');
  console.log(summary);
  console.log('--- End Summary ---\n');
} catch (error) {
  console.error('✗ generateResumeSummary failed:', error.message);
  process.exit(1);
}

console.log('3. Testing getResumeActions()...');
try {
  const mockCheckpoint = {
    phase: 'CONSTRUCTION',
    stage: 'unit-implementation',
    unit: 'auth-service',
    state: {
      quality_gates: {
        tests_passed: false,
        mock_detection_passed: true,
        duplication_passed: true
      }
    },
    context: {
      blockers: ['Waiting for API documentation']
    }
  };

  const actions = getResumeActions(mockCheckpoint);
  console.log('✓ Actions generated successfully');
  console.log(`  - Total actions: ${actions.length}`);
  actions.forEach(action => {
    console.log(`  - [${action.priority.toUpperCase()}] ${action.description}`);
  });
} catch (error) {
  console.error('✗ getResumeActions failed:', error.message);
  process.exit(1);
}

console.log('\n✓ All tests passed!');
