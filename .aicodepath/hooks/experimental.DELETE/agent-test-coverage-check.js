#!/usr/bin/env node

/**
 * Agent-Based Test Coverage Check Hook
 *
 * Uses an agent with tool access to verify test coverage before allowing commits.
 * The agent can read test files, run the test suite, and make intelligent decisions.
 *
 * Hook Event: PreToolUse
 * Matcher: Bash(git commit.*)
 * Type: agent
 *
 * Features:
 * - Agent reads and analyzes test files
 * - Runs test suite with Bash tool
 * - Parses coverage reports
 * - Makes decision based on coverage threshold
 * - Provides detailed analysis and recommendations
 *
 * Configuration:
 *   MIN_COVERAGE=80  - Minimum required coverage percentage
 *
 * Exit Codes:
 *   0 - Coverage adequate, commit allowed
 *   1 - Coverage insufficient, commit denied
 */

const { executeAgentHook, createAgentHookConfig } = require('./lib/agent-hook-executor');

/**
 * Agent prompt template for test coverage verification
 */
const AGENT_PROMPT = `
# Test Coverage Verification Agent

You are a verification agent checking test coverage before a git commit.

## Your Task

1. **Find Test Files**
   - Use Grep to find all test files (*.test.ts, *.spec.ts, etc.)
   - Use Read to examine test file structure
   - Count total number of tests

2. **Run Test Suite**
   - Use Bash to run: npm test (or appropriate test command)
   - Capture test output
   - Check if all tests pass

3. **Analyze Coverage**
   - Look for coverage reports (coverage/lcov.info, coverage/coverage-summary.json)
   - Use Read to parse coverage data
   - Calculate overall coverage percentage
   - Check line coverage, branch coverage, function coverage

4. **Make Decision**
   - Required threshold: $MIN_COVERAGE% coverage
   - All tests must pass
   - Coverage must meet or exceed threshold

## Tools Available

- **Read**: Read test files and coverage reports
- **Grep**: Search for test patterns and coverage files
- **Glob**: Find test files by pattern
- **Bash**: Run test suite

## Decision Criteria

**ALLOW** if:
- All tests pass
- Coverage >= $MIN_COVERAGE%
- No critical test failures

**DENY** if:
- Tests fail
- Coverage < $MIN_COVERAGE%
- Test suite errors

**ASK** if:
- Tests pass but coverage close to threshold (within 5%)
- Non-critical warnings present
- Unusual test results

## Context

- Command: $COMMAND
- Project: $PROJECT_PATH
- Minimum Coverage Required: $MIN_COVERAGE%

## Your Response Format

Provide detailed analysis, then end with:

DECISION: [allow|deny|ask]
REASON: [Brief explanation of your decision]
CONFIDENCE: [high|medium|low]
`;

/**
 * Main hook function
 */
async function hook(hookInput) {
  const { arguments: args, environment } = hookInput;

  // Check if this is a git commit command
  const command = args?.command || '';
  if (!command.includes('git commit')) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow'
      }
    };
  }

  // Get minimum coverage threshold from environment
  const minCoverage = parseInt(process.env.MIN_COVERAGE || '80', 10);

  // Create agent hook configuration
  const agentConfig = createAgentHookConfig({
    prompt: AGENT_PROMPT
      .replace(/\$MIN_COVERAGE/g, minCoverage.toString())
      .replace(/\$COMMAND/g, command)
      .replace(/\$PROJECT_PATH/g, environment?.project_path || process.cwd()),
    tools: ['Read', 'Grep', 'Glob', 'Bash'],
    timeout: 300000, // 5 minutes for test execution
    model: 'sonnet'  // Use sonnet for good balance of speed and intelligence
  });

  // Execute agent hook
  console.log('\n🤖 Spawning test coverage verification agent...\n');

  try {
    const result = await executeAgentHook(agentConfig, hookInput);

    // Add coverage-specific context
    if (result.hookSpecificOutput.agentMetadata?.metrics) {
      const metrics = result.hookSpecificOutput.agentMetadata.metrics;
      console.log('\n📊 Coverage Metrics:');
      console.log(`   Overall: ${metrics.coverage}%`);
      console.log(`   Tests: ${metrics.testsPassed}/${metrics.testsRun} passed`);
    }

    return result;

  } catch (error) {
    console.error('❌ Agent execution failed:', error.message);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: [
          'Test coverage verification agent failed:',
          error.message,
          '',
          'Please verify test coverage manually before committing.'
        ].join('\n')
      }
    };
  }
}

// CLI interface for testing
if (require.main === module) {
  console.log('Agent-Based Test Coverage Check\n');

  const mockInput = {
    arguments: {
      command: 'git commit -m "add feature"'
    },
    environment: {
      project_path: process.cwd()
    },
    hookEventName: 'PreToolUse'
  };

  hook(mockInput).then(result => {
    console.log('\n📋 Hook Result:\n');
    console.log(JSON.stringify(result, null, 2));

    const allowed = result.hookSpecificOutput.permissionDecision === 'allow';
    process.exit(allowed ? 0 : 1);
  }).catch(error => {
    console.error('Hook error:', error);
    process.exit(1);
  });
}

module.exports = { hook };
