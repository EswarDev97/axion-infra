#!/usr/bin/env node

/**
 * Agent-Based Architecture Validator Hook
 *
 * Uses an agent with tool access to validate code against architecture patterns.
 * The agent reads the code, analyzes patterns, and checks consistency with the codebase.
 *
 * Hook Event: PreToolUse
 * Matcher: Write|Edit
 * Type: agent
 *
 * Features:
 * - Agent reads code being written
 * - Searches for similar patterns in codebase
 * - Checks architecture documentation
 * - Validates consistency and best practices
 * - Provides detailed recommendations
 *
 * Configuration:
 *   ARCH_STRICT_MODE=true  - Block on any architecture violations
 *
 * Exit Codes:
 *   0 - Architecture validated, operation allowed
 *   1 - Architecture violations found, operation denied
 */

const { executeAgentHook, createAgentHookConfig } = require('./lib/agent-hook-executor');
const path = require('path');

/**
 * Agent prompt template for architecture validation
 */
const AGENT_PROMPT = `
# Architecture Validation Agent

You are an architecture validation agent ensuring code follows project patterns.

## Your Task

1. **Analyze Target Code**
   - File: $FILE_PATH
   - Use Read to examine the code being written
   - Identify the architectural layer (controller, service, repository, etc.)
   - Extract patterns and structure

2. **Find Similar Patterns**
   - Use Glob to find similar files in the codebase
   - Pattern: same type of file (controller, service, etc.)
   - Use Grep to search for similar class/function patterns
   - Read 2-3 example files for comparison

3. **Check Architecture Guidelines**
   - Use Read to check .aicodepath/guidelines/architecture-rules.json
   - Use Read to check architecture documentation if present
   - Understand required patterns and conventions

4. **Validate Consistency**
   - Compare target code against found patterns
   - Check for:
     * Naming conventions (file names, class names, method names)
     * Dependency injection patterns
     * Error handling approach
     * Layer separation (no business logic in controllers)
     * Import organization
     * Interface usage and abstraction

5. **Provide Analysis**
   - List what follows patterns ✅
   - List what deviates from patterns ⚠️
   - Suggest improvements if needed
   - Assess severity of any violations

## Tools Available

- **Read**: Read files and documentation
- **Grep**: Search for patterns in codebase
- **Glob**: Find files matching patterns

## Decision Criteria

**ALLOW** if:
- Code follows established patterns
- Minor deviations are acceptable
- Architecture is consistent with codebase

**DENY** if:
- Major architecture violations (wrong layer, business logic in controller)
- Breaks established conventions significantly
- Creates architectural debt

**ASK** if:
- Pattern is unclear or ambiguous
- New pattern being introduced
- Moderate deviations that need review

## Context

- File: $FILE_PATH
- Tool: $TOOL
- Project: $PROJECT_PATH
- Strict Mode: ${process.env.ARCH_STRICT_MODE === 'true' ? 'Yes' : 'No'}

## Your Response Format

Provide detailed architectural analysis, then end with:

DECISION: [allow|deny|ask]
REASON: [Brief explanation of your decision]
CONFIDENCE: [high|medium|low]
`;

/**
 * Main hook function
 */
async function hook(hookInput) {
  const { tool_name, tool_input, environment } = hookInput;

  // Only validate Write/Edit operations on code files
  if (!['Write', 'Edit'].includes(tool_name)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow'
      }
    };
  }

  const filePath = tool_input?.file_path;
  if (!filePath) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow'
      }
    };
  }

  // Only validate code files
  const ext = path.extname(filePath);
  const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.cs'];
  if (!codeExtensions.includes(ext)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        additionalContext: 'Skipped architecture validation for non-code file'
      }
    };
  }

  // Skip test files
  if (/\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filePath)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        additionalContext: 'Skipped architecture validation for test file'
      }
    };
  }

  // Create agent hook configuration
  const agentConfig = createAgentHookConfig({
    prompt: AGENT_PROMPT
      .replace(/\$FILE_PATH/g, filePath)
      .replace(/\$TOOL/g, tool_name)
      .replace(/\$PROJECT_PATH/g, environment?.project_path || process.cwd()),
    tools: ['Read', 'Grep', 'Glob'],
    timeout: 120000, // 2 minutes for analysis
    model: 'sonnet'
  });

  // Execute agent hook
  console.log(`\n🏗️  Spawning architecture validation agent for ${filePath}...\n`);

  try {
    const result = await executeAgentHook(agentConfig, hookInput);

    // Add architecture-specific context
    if (result.hookSpecificOutput.agentMetadata?.patternsChecked) {
      const patterns = result.hookSpecificOutput.agentMetadata.patternsChecked;
      console.log('\n🔍 Patterns Checked:');
      patterns.forEach(p => console.log(`   - ${p}`));
    }

    // In strict mode, convert 'ask' to 'deny'
    if (process.env.ARCH_STRICT_MODE === 'true' &&
        result.hookSpecificOutput.permissionDecision === 'ask') {
      result.hookSpecificOutput.permissionDecision = 'deny';
      result.hookSpecificOutput.permissionDecisionReason += '\n\n(Denied due to ARCH_STRICT_MODE=true)';
    }

    return result;

  } catch (error) {
    console.error('❌ Agent execution failed:', error.message);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: [
          'Architecture validation agent failed:',
          error.message,
          '',
          'Proceeding with operation (non-blocking failure).'
        ].join('\n'),
        additionalContext: 'Agent validation failed, defaulting to allow'
      }
    };
  }
}

// CLI interface for testing
if (require.main === module) {
  console.log('Agent-Based Architecture Validator\n');

  const mockInput = {
    tool_name: 'Write',
    tool_input: {
      file_path: 'src/services/user.service.ts',
      content: `
export class UserService {
  constructor(private userRepo: UserRepository) {}

  async findById(id: string): Promise<User> {
    return this.userRepo.findById(id);
  }

  async create(data: CreateUserDto): Promise<User> {
    return this.userRepo.create(data);
  }
}
      `.trim()
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
