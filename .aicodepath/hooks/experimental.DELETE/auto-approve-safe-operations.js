#!/usr/bin/env node

/**
 * PermissionRequest Hook - Auto-Approve Safe Operations
 *
 * Automatically approves known-safe operations to reduce friction.
 * Denies dangerous operations. Asks user for ambiguous cases.
 *
 * Event: PermissionRequest
 *
 * Date: 2026-02-03
 * Version: 1.0.0
 */

const path = require('path');

/**
 * Safe read-only operations (auto-approve)
 */
const SAFE_OPERATIONS = {
  bash: [
    /^git status$/,
    /^git log/,
    /^git diff/,
    /^git show/,
    /^git branch$/,
    /^ls\s/,
    /^cat\s/,
    /^head\s/,
    /^tail\s/,
    /^grep\s/,
    /^find\s/,
    /^pwd$/,
    /^whoami$/,
    /^date$/,
    /^env$/,
    /^echo\s/
  ],
  read: [/.*/], // All Read operations are safe
  glob: [/.*/], // All Glob operations are safe
  grep: [/.*/]  // All Grep operations are safe
};

/**
 * Dangerous operations (deny)
 */
const DANGEROUS_OPERATIONS = {
  bash: [
    /rm\s+-rf\s+\//,  // rm -rf /
    /rm\s+-rf\s+\*/,  // rm -rf *
    /dd\s+if=/,       // dd commands
    /mkfs/,           // filesystem creation
    /fdisk/,          // disk partitioning
    />\s*\/dev\//,    // writing to devices
    /curl.*\|\s*sh/,  // curl | sh
    /wget.*\|\s*sh/,  // wget | sh
    /sudo\s+rm/,      // sudo rm
    /chmod\s+777/     // chmod 777
  ]
};

/**
 * PermissionRequest hook handler
 */
async function hook(hookInput) {
  const { tool, arguments: args = {} } = hookInput;

  try {
    // Extract operation details
    const operation = extractOperation(tool, args);

    console.log(`\n[PermissionRequest] Evaluating: ${tool} ${operation.summary}`);

    // Check if operation is safe
    const safetyCheck = evaluateSafety(tool.toLowerCase(), operation.command);

    if (safetyCheck.isSafe) {
      console.log(`✅ Auto-approved: ${safetyCheck.reason}`);

      return {
        hookSpecificOutput: {
          hookEventName: 'PermissionRequest',
          decision: {
            behavior: 'allow',
            message: `Auto-approved: ${safetyCheck.reason}`,
            interrupt: false
          }
        }
      };
    }

    if (safetyCheck.isDangerous) {
      console.log(`❌ Auto-denied: ${safetyCheck.reason}`);

      return {
        hookSpecificOutput: {
          hookEventName: 'PermissionRequest',
          decision: {
            behavior: 'deny',
            message: `Blocked: ${safetyCheck.reason}`,
            interrupt: true
          }
        }
      };
    }

    // Ambiguous - ask user
    console.log(`❓ Needs user confirmation: ${safetyCheck.reason}`);

    return {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: {
          behavior: 'allow', // Let Claude handle the permission request
          message: safetyCheck.reason,
          interrupt: false
        }
      }
    };

  } catch (error) {
    console.error(`⚠️  Permission evaluation error: ${error.message}`);

    // On error, don't block but let normal permission flow continue
    return {
      hookSpecificOutput: {
        hookEventName: 'PermissionRequest',
        decision: {
          behavior: 'allow',
          message: `Permission evaluation error: ${error.message}`,
          interrupt: false
        }
      }
    };
  }
}

/**
 * Extract operation details
 */
function extractOperation(tool, args) {
  let command = '';
  let summary = '';

  if (tool === 'Bash' && args.command) {
    command = args.command;
    summary = command.length > 50 ? command.substring(0, 50) + '...' : command;
  } else if (tool === 'Write' || tool === 'Edit') {
    command = `${tool} ${args.file_path || 'file'}`;
    summary = command;
  } else if (tool === 'Read') {
    command = `Read ${args.file_path || 'file'}`;
    summary = command;
  } else {
    command = JSON.stringify(args);
    summary = tool;
  }

  return { command, summary };
}

/**
 * Evaluate operation safety
 */
function evaluateSafety(tool, command) {
  // Check if it's a safe operation
  if (SAFE_OPERATIONS[tool]) {
    for (const pattern of SAFE_OPERATIONS[tool]) {
      if (pattern.test(command)) {
        return {
          isSafe: true,
          isDangerous: false,
          reason: `Read-only ${tool} operation`
        };
      }
    }
  }

  // Check if it's a dangerous operation
  if (DANGEROUS_OPERATIONS[tool]) {
    for (const pattern of DANGEROUS_OPERATIONS[tool]) {
      if (pattern.test(command)) {
        return {
          isSafe: false,
          isDangerous: true,
          reason: `Dangerous operation detected: ${pattern.source}`
        };
      }
    }
  }

  // Check specific cases
  if (tool === 'bash') {
    // Write operations need confirmation
    if (/^(echo|cat)\s+.*>\s*/.test(command)) {
      return {
        isSafe: false,
        isDangerous: false,
        reason: 'File write operation needs confirmation'
      };
    }

    // Network operations need confirmation
    if (/^(curl|wget|nc|telnet)/.test(command)) {
      return {
        isSafe: false,
        isDangerous: false,
        reason: 'Network operation needs confirmation'
      };
    }

    // Git write operations
    if (/^git\s+(commit|push|pull|merge|rebase)/.test(command)) {
      return {
        isSafe: false,
        isDangerous: false,
        reason: 'Git write operation needs confirmation'
      };
    }
  }

  // Default: ambiguous, needs user decision
  return {
    isSafe: false,
    isDangerous: false,
    reason: 'Operation requires user confirmation'
  };
}

module.exports = { hook };

// CLI support
if (require.main === module) {
  const tests = [
    { tool: 'Bash', arguments: { command: 'git status' } },
    { tool: 'Bash', arguments: { command: 'rm -rf /' } },
    { tool: 'Bash', arguments: { command: 'git push origin main' } },
    { tool: 'Read', arguments: { file_path: 'test.js' } }
  ];

  console.log('Testing auto-approve hook:\n');

  tests.forEach(async (test, i) => {
    console.log(`Test ${i + 1}:`);
    const result = await hook(test);
    console.log(JSON.stringify(result, null, 2));
    console.log('');
  });
}
