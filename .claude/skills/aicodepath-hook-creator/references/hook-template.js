#!/usr/bin/env node
'use strict';

// =============================================================================
// DO NOT violate these rules — they protect users from getting permanently blocked
// =============================================================================
//
// ❌ NEVER use console.log() or console.error() — use logger (it routes to files,
//    not stdout, which would corrupt the JSON output Claude reads)
//
// ❌ NEVER call process.exit() inside execute() — it makes the function
//    untestable. Only main() may call process.exit().
//
// ❌ NEVER use process.exit(1) or process.exit(2) in a catch block — a hook
//    crash must fail open (exit 0), not block the user permanently.
//
// ❌ NEVER use appendToSystemPrompt — that field does not exist in the spec
//    and is silently ignored. Use hookSpecificOutput.additionalContext instead.
//
// ❌ NEVER hardcode paths like 'aicodepath-docs/...' — use pathResolver so the
//    hook works regardless of where the project is installed.
//
// ❌ NEVER require() a potentially missing module at the top level without
//    try/catch — a missing optional dependency crashes the entire hook.
//
// ❌ NEVER use top-level decision: "block" in PreToolUse — that's deprecated.
//    Use hookSpecificOutput.permissionDecision: "deny" instead.
// =============================================================================

// === IMPORTS ===

// Hook utilities — in hooks/lib/ relative to this file (hooks/)
const { exitSuccess, exitBlock, exitWarning } = require('./lib/exit-codes');
// exitSuccess() → { exitCode: 0 }          — Claude continues normally
// exitWarning('msg') → { exitCode: 1 }     — Claude logs warning and continues
// exitBlock('msg') → { exitCode: 2 }       — Claude stops operation (PreToolUse only)

// Core libraries — one level up from hooks/
const logger = require('../lib/logger');
// logger.info/warn/error(message, { context: 'hook-name' })
// ALWAYS include { context: 'hook-name' } — makes logs filterable

// Optional — uncomment only what you need:
// const pathResolver = require('../lib/path-resolver');
// pathResolver.getDbPath()        → absolute path to aicodepath.db
// pathResolver.findProjectRoot()  → project root directory (never use process.cwd())

// const { isEnabled } = require('../lib/feature-flags');
// isEnabled('feature-name')  → boolean; gate experimental behavior behind a flag

// const wsEmitter = require('./lib/ws-emitter');
// wsEmitter.emit('event_name', data)  → broadcasts to dashboard WebSocket
// Always wrap in try/catch — WS errors must not crash the hook

// =============================================================================
// EXECUTE — Main hook logic
// =============================================================================
//
// Called by main() with the parsed hookData from stdin.
// Returns a result object that main() writes to stdout.
//
// IMPORTANT: This function must be pure from an exit-code perspective.
// Do NOT call process.exit() here — return a result object and let main() handle it.
// This makes execute() unit-testable: you can call it directly in tests.
//
// hookData fields (from Claude Code spec):
//   tool_name        — "Write", "Edit", "Bash", etc.
//   tool_input       — tool-specific input object
//   hook_event_name  — "PreToolUse", "PostToolUse", etc.
//   session_id       — current session identifier
//
// =============================================================================

async function execute(hookData) {
  const { tool_name, tool_input } = hookData;

  // Guard: check required fields early. Missing input = pass through.
  const filePath = tool_input?.file_path;
  if (!filePath) {
    return exitSuccess();
    // WHY exitSuccess not exitWarning: we don't know enough to judge — fail open
  }

  // --- YOUR LOGIC HERE ---

  // Example: Block on a specific condition
  // const violations = await checkSomething(filePath, tool_input.content);
  // if (violations.length > 0) {
  //   const msg = violations.map(v => `- ${v}`).join('\n');
  //   // exitBlock: exit code 2 — only effective in PreToolUse hooks
  //   // The message appears in Claude's context explaining what to fix
  //   return exitBlock(`Hook blocked this operation:\n${msg}`);
  // }

  // Example: Inject context (PreToolUse or PostToolUse)
  // return {
  //   exitCode: 0,
  //   hookSpecificOutput: {
  //     // additionalContext is injected into Claude's context window
  //     // Use it to provide schema, constraints, or relevant information
  //     additionalContext: `Relevant context for ${filePath}: ...`
  //   }
  // };

  // Example: Warn without blocking
  // return exitWarning(`Potential issue in ${filePath}: consider X`);
  // exitWarning: exit code 1 — Claude logs it and continues anyway

  // Default: allow the operation to proceed
  return exitSuccess();
}

// =============================================================================
// MAIN — Entry point
// =============================================================================
//
// Reads stdin, calls execute(), writes stdout JSON, sets exit code.
//
// DO NOT modify this structure. Claude Code requires:
//   1. Hook reads a JSON object from stdin
//   2. Hook writes a JSON object to stdout (optional but required for context injection)
//   3. Hook exits with the correct code: 0=pass, 1=warn, 2=block
//
// The separation of main() and execute() is intentional:
//   - execute() contains all testable business logic
//   - main() contains only the protocol boilerplate
//   - Tests can call execute() directly without needing to pipe stdin
//
// =============================================================================

async function main() {
  let hookData;
  try {
    // Read entire stdin synchronously — hooks are short-lived processes.
    // /dev/stdin works on Linux/macOS (Claude Code's supported environments).
    const input = require('fs').readFileSync('/dev/stdin', 'utf8');
    hookData = JSON.parse(input);
  } catch (err) {
    // FAIL OPEN: if we cannot parse the input, we cannot make a decision.
    // Exit 0 allows the operation to proceed — always safer than blocking.
    // WHY: A parse failure means something changed in the protocol or the
    // input was garbled. Blocking on unknown input would lock users out.
    logger.error('Failed to parse hook input', { error: err.message, context: 'my-hook' });
    process.exit(0);
    return; // unreachable — satisfies linters that check all code paths
  }

  // Call the testable execute() function with parsed data.
  const result = await execute(hookData);

  // Write JSON result to stdout so Claude can read context injection fields.
  // Even if we're just passing through, writing {} is harmless.
  // If result is null/undefined (shouldn't happen), skip to avoid JSON.stringify(null)
  if (result) {
    process.stdout.write(JSON.stringify(result) + '\n');
    // WHY '\n': Claude Code expects newline-terminated JSON
  }

  // Exit with the code from the result object.
  // ?? 0: if result has no exitCode field, default to 0 (safe pass-through)
  process.exit(result?.exitCode ?? 0);
}

// =============================================================================
// OUTER SAFETY NET
// =============================================================================
//
// If execute() or any other async operation throws an unhandled error,
// this catch ensures we exit 0 (fail open) rather than crashing with a
// non-zero exit code that would block the user.
//
// This is the last line of defense. It should rarely fire if execute() has
// proper internal error handling. But "rarely" is not "never."
//
// =============================================================================

main().catch(err => {
  // Log the error for debugging (to file, not stdout — stdout is for hook output)
  logger.error('Hook error', { error: err.message, stack: err.stack, context: 'my-hook' });
  // FAIL OPEN: always exit 0 on unexpected errors
  process.exit(0);
});
