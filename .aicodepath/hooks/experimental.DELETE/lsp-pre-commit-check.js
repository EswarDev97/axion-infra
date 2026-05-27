#!/usr/bin/env node

/**
 * LSP Pre-Commit Check Hook
 *
 * Blocks git commits if LSP diagnostics show errors in modified files.
 * Provides instant feedback on type errors, syntax issues, and linting problems
 * before code is committed.
 *
 * Hook Event: PreToolUse
 * Matcher: Bash(git commit.*)
 *
 * Features:
 * - Checks all modified files for LSP errors
 * - Blocks commit if errors found
 * - Allows commit with warnings (configurable)
 * - Shows detailed error messages
 * - Works with TypeScript, Python, Rust, Go, etc.
 *
 * Configuration:
 *   LSP_BLOCK_ON_WARNINGS=true  - Block on warnings too
 *   LSP_SKIP_CHECK=true          - Skip LSP check (emergency bypass)
 *
 * Exit Codes:
 *   0 - No errors, commit allowed
 *   1 - Errors found, commit denied
 */

const { getLSPDiagnostics, formatDiagnostics, isLSPAvailable } = require('./lib/lsp-integration');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Get list of modified files from git
 */
function getModifiedFiles() {
  try {
    // Get staged files
    const staged = execSync('git diff --cached --name-only', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim().split('\n').filter(Boolean);

    // Get unstaged modified files
    const unstaged = execSync('git diff --name-only', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim().split('\n').filter(Boolean);

    // Combine and deduplicate
    const allFiles = [...new Set([...staged, ...unstaged])];

    // Filter to only existing files
    return allFiles.filter(file => fs.existsSync(file));

  } catch (error) {
    console.error('Failed to get modified files:', error.message);
    return [];
  }
}

/**
 * Check if file should be checked by LSP
 */
function shouldCheckFile(filePath) {
  // Only check files that have LSP support
  const ext = path.extname(filePath);
  const supportedExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',  // TypeScript/JavaScript
    '.py', '.pyi',                                   // Python
    '.rs',                                           // Rust
    '.go',                                           // Go
    '.json', '.jsonc',                               // JSON
    '.yaml', '.yml'                                  // YAML
  ];

  return supportedExtensions.includes(ext) && isLSPAvailable(filePath);
}

/**
 * Check LSP diagnostics for all modified files
 */
async function checkLSPErrors() {
  const modifiedFiles = getModifiedFiles();

  if (modifiedFiles.length === 0) {
    return {
      hasErrors: false,
      hasWarnings: false,
      filesChecked: 0,
      message: 'No modified files to check'
    };
  }

  console.log(`\n🔍 Checking LSP diagnostics for ${modifiedFiles.length} modified file(s)...\n`);

  const results = {
    hasErrors: false,
    hasWarnings: false,
    filesChecked: 0,
    filesWithErrors: [],
    filesWithWarnings: [],
    allErrors: [],
    allWarnings: []
  };

  for (const file of modifiedFiles) {
    if (!shouldCheckFile(file)) {
      continue;
    }

    results.filesChecked++;

    try {
      const diagnostics = await getLSPDiagnostics(file);

      if (!diagnostics.available) {
        console.log(`⚠️  ${file}: LSP not available (${diagnostics.reason})`);
        continue;
      }

      if (diagnostics.errors.length > 0) {
        results.hasErrors = true;
        results.filesWithErrors.push(file);
        results.allErrors.push(...diagnostics.errors.map(e => ({ ...e, file })));

        console.log(`❌ ${file}: ${diagnostics.errors.length} error(s)`);
        diagnostics.errors.slice(0, 3).forEach(err => {
          console.log(`   Line ${err.line}: ${err.message}`);
        });
        if (diagnostics.errors.length > 3) {
          console.log(`   ... and ${diagnostics.errors.length - 3} more`);
        }
      } else if (diagnostics.warnings.length > 0) {
        results.hasWarnings = true;
        results.filesWithWarnings.push(file);
        results.allWarnings.push(...diagnostics.warnings.map(w => ({ ...w, file })));

        console.log(`⚠️  ${file}: ${diagnostics.warnings.length} warning(s)`);
      } else {
        console.log(`✅ ${file}: No issues`);
      }

    } catch (error) {
      console.error(`Error checking ${file}:`, error.message);
    }
  }

  return results;
}

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

  // Emergency bypass
  if (process.env.LSP_SKIP_CHECK === 'true') {
    console.log('⚠️  LSP check skipped (LSP_SKIP_CHECK=true)');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        additionalContext: 'LSP check bypassed via environment variable'
      }
    };
  }

  // Check LSP diagnostics
  const results = await checkLSPErrors();

  if (results.filesChecked === 0) {
    console.log('\nℹ️  No files with LSP support modified');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow'
      }
    };
  }

  // Block on errors
  if (results.hasErrors) {
    console.log('\n❌ Commit blocked: LSP errors found');
    console.log(`\nFiles with errors (${results.filesWithErrors.length}):`);
    results.filesWithErrors.forEach(f => console.log(`  - ${f}`));
    console.log('\nFix the errors and try again.');
    console.log('To bypass (not recommended): LSP_SKIP_CHECK=true git commit ...');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: [
          'LSP errors detected in modified files:',
          '',
          ...results.filesWithErrors.map(f => `  • ${f}`),
          '',
          'Please fix these errors before committing.',
          'Use LSP_SKIP_CHECK=true to bypass (not recommended).'
        ].join('\n')
      }
    };
  }

  // Optionally block on warnings
  const blockOnWarnings = process.env.LSP_BLOCK_ON_WARNINGS === 'true';

  if (results.hasWarnings && blockOnWarnings) {
    console.log('\n⚠️  Commit blocked: LSP warnings found (LSP_BLOCK_ON_WARNINGS=true)');
    console.log(`\nFiles with warnings (${results.filesWithWarnings.length}):`);
    results.filesWithWarnings.forEach(f => console.log(`  - ${f}`));

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: [
          'LSP warnings detected (LSP_BLOCK_ON_WARNINGS=true):',
          '',
          ...results.filesWithWarnings.map(f => `  • ${f}`),
          '',
          'Fix warnings or set LSP_BLOCK_ON_WARNINGS=false'
        ].join('\n')
      }
    };
  }

  // Allow commit
  if (results.hasWarnings) {
    console.log(`\n✅ Commit allowed (${results.filesWithWarnings.length} file(s) with warnings)`);
    console.log('Consider fixing warnings. Set LSP_BLOCK_ON_WARNINGS=true to block.');
  } else {
    console.log('\n✅ All LSP checks passed');
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      additionalContext: results.hasWarnings
        ? `LSP check passed with ${results.allWarnings.length} warning(s)`
        : 'All LSP checks passed'
    }
  };
}

// CLI interface for testing
if (require.main === module) {
  console.log('LSP Pre-Commit Check Hook\n');

  // Test with mock input
  const mockInput = {
    arguments: {
      command: 'git commit -m "test commit"'
    },
    environment: {},
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
