/**
 * Settings Generator - Generate .claude/settings.json with absolute paths
 *
 * Converts template hook paths from relative (./) to absolute paths
 * pointing through the target project's .aicodepath symlink.
 *
 * Also generates permission rules for safe operations.
 *
 * @module lib/settings-generator
 */

const fs = require('fs');
const path = require('path');
const pathResolver = require('./path-resolver');

/**
 * Default permission rules for Claude Code
 *
 * - allow: Operations that proceed without prompting
 * - ask: Operations that require user confirmation
 * - deny: Operations that are blocked entirely
 */
const DEFAULT_PERMISSIONS = {
  allow: [
    // Read documentation and configuration
    'Read(aicodepath-docs/**)',
    'Read(.aicodepath/**)',
    'Read(docs/**)',
    'Read(README*)',
    'Read(*.md)',
    // Search and navigation
    'Glob(**)',
    'Grep(**)',
    // Safe commands
    'Bash(npm run test*)',
    'Bash(npm run lint*)',
    'Bash(npm run build*)',
    'Bash(npm run dev*)',
    'Bash(npm run start*)',
    // Git read operations
    'Bash(git status)',
    'Bash(git log*)',
    'Bash(git diff*)',
    'Bash(git branch*)',
    'Bash(git show*)',
    // AICodePath scripts
    'Bash(node .aicodepath/scripts/*)',
    'Bash(node ./.aicodepath/scripts/*)'
  ],
  ask: [
    // File modifications
    'Write(*)',
    'Edit(*)',
    // Git write operations
    'Bash(git commit*)',
    'Bash(git push*)',
    'Bash(git checkout*)',
    'Bash(git merge*)',
    'Bash(git rebase*)',
    // Package operations
    'Bash(npm publish*)',
    'Bash(npm install*)',
    // File operations
    'Bash(rm *)',
    'Bash(mv *)',
    'Bash(cp *)'
  ],
  deny: [
    // Dangerous destructive commands
    'Bash(rm -rf /)',
    'Bash(rm -rf ~)',
    'Bash(rm -rf /*)',
    // Remote code execution risks
    'Bash(curl*|sh)',
    'Bash(wget*|sh)',
    'Bash(eval*)',
    // Credential files
    'Write(.env)',
    'Write(.env.*)',
    'Write(**/credentials*)',
    'Write(**/secret*)',
    'Write(**/*_secret*)',
    'Write(**/*password*)',
    // Parent directory traversal
    'Read(../**)',
    'Write(../**)'
  ]
};

/**
 * Generate .claude/settings.json for a target project
 *
 * @param {string} targetProjectRoot - Absolute path to target project root
 * @param {Object} options - Generation options
 * @param {boolean} options.includePermissions - Whether to include permission rules (default: true)
 * @param {Object} options.customPermissions - Custom permission overrides
 * @returns {Object} Result with success status and metadata
 */
function generateSettings(targetProjectRoot, options = {}) {
  const {
    includePermissions = true,
    customPermissions = {}
  } = options;

  if (!targetProjectRoot || !path.isAbsolute(targetProjectRoot)) {
    throw new Error('Target project root must be an absolute path');
  }

  // Get template path from central .aicodepath installation
  const templatesDir = pathResolver.templates(targetProjectRoot);
  const templatePath = path.join(templatesDir, 'claude-settings.json.template');

  let settings = {};

  // Load existing settings.json to preserve enabledPlugins, env, etc.
  const existingSettingsPath = path.join(targetProjectRoot, '.claude', 'settings.json');
  const existingSettings = {};

  if (fs.existsSync(existingSettingsPath)) {
    try {
      const existingContent = fs.readFileSync(existingSettingsPath, 'utf8');
      const existingParsed = JSON.parse(existingContent);
      // Preserve non-hooks settings
      if (existingParsed.enabledPlugins) existingSettings.enabledPlugins = existingParsed.enabledPlugins;
      if (existingParsed.env) existingSettings.env = existingParsed.env;
    } catch (e) {
      // Existing settings invalid - will be overwritten
    }
  }

  // Load template if it exists
  if (fs.existsSync(templatePath)) {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    settings = JSON.parse(templateContent);
  }

  // Merge existing non-hooks settings
  Object.assign(settings, existingSettings);

  // Conditionally add swarm hooks (require Agent Teams experimental feature)
  let swarmEnabled = false;
  try {
    const { isEnabled } = require('./feature-flags');
    swarmEnabled = isEnabled('swarm');
  } catch (e) {
    // feature-flags unavailable, skip swarm hooks
  }

  // Always enable Agent Teams — unlocks Claude Code's multi-agent feature unconditionally.
  // Swarm hooks below are still gated by the feature flag (they control AICodePath behaviour on top).
  if (!settings.env) settings.env = {};
  settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';

  if (swarmEnabled && settings.hooks) {
    const hooksRoot = path.join(targetProjectRoot, '.aicodepath', 'hooks');
    const fs = require('fs');

    // Only add swarm hooks if the hook files actually exist on disk
    const swarmHooks = [
      { event: 'SubagentStart', file: 'subagent-lifecycle-hook.js', msg: 'Tracking subagent start...' },
      { event: 'SubagentStop', file: 'subagent-lifecycle-hook.js', msg: 'Tracking subagent completion...' },
      { event: 'TeammateIdle', file: 'teammate-idle-hook.js', msg: 'Handling idle teammate...' },
      { event: 'TaskCompleted', file: 'task-completed-hook.js', msg: 'Processing task completion...' },
    ];

    for (const { event, file, msg } of swarmHooks) {
      const hookPath = path.join(hooksRoot, file);
      if (fs.existsSync(hookPath)) {
        settings.hooks[event] = [{
          hooks: [{ type: 'command', command: hookPath, statusMessage: msg }]
        }];
      }
    }
  }

  // Track statistics
  let pathsResolved = 0;

  // Process all hook event types
  if (settings.hooks) {
    for (const [hookType, hookEntries] of Object.entries(settings.hooks)) {
      if (!Array.isArray(hookEntries)) continue;

      for (const entry of hookEntries) {
        if (!entry.hooks || !Array.isArray(entry.hooks)) continue;

        for (const hook of entry.hooks) {
          if (hook.command && typeof hook.command === 'string' && hook.command.startsWith('./')) {
            // Project override: if .aicodepath-overrides/hooks/<filename> exists, use it instead.
            // Override is checked by filename only — subdirectory structure is not preserved.
            const hookFilename = path.basename(hook.command);
            const overridePath = path.join(targetProjectRoot, '.aicodepath-overrides', 'hooks', hookFilename);
            if (fs.existsSync(overridePath)) {
              hook.command = overridePath;
            } else {
              hook.command = path.resolve(targetProjectRoot, hook.command);
            }
            pathsResolved++;
          }

          // Add AICODEPATH_PROJECT_ROOT env var
          if (hook.type === 'command') {
            if (!hook.env) {
              hook.env = {};
            }
            hook.env.AICODEPATH_PROJECT_ROOT = targetProjectRoot;
          }
        }
      }
    }
  }

  // Add permission rules if requested
  if (includePermissions) {
    // Merge default permissions with custom overrides
    settings.permissions = {
      allow: [
        ...(DEFAULT_PERMISSIONS.allow || []),
        ...(customPermissions.allow || [])
      ],
      ask: [
        ...(DEFAULT_PERMISSIONS.ask || []),
        ...(customPermissions.ask || [])
      ],
      deny: [
        ...(DEFAULT_PERMISSIONS.deny || []),
        ...(customPermissions.deny || [])
      ]
    };

    // Remove duplicates
    settings.permissions.allow = [...new Set(settings.permissions.allow)];
    settings.permissions.ask = [...new Set(settings.permissions.ask)];
    settings.permissions.deny = [...new Set(settings.permissions.deny)];
  }

  // Ensure .claude/ directory exists
  const claudeDir = path.join(targetProjectRoot, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });

  // Write settings.json
  const settingsPath = path.join(claudeDir, 'settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  // Ensure all hook files are executable (Claude Code runs them directly as executables)
  const hooksDir = path.join(targetProjectRoot, '.aicodepath', 'hooks');
  let hooksChmodCount = 0;
  if (fs.existsSync(hooksDir)) {
    try {
      const hookFiles = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js'));
      for (const hookFile of hookFiles) {
        const hookPath = path.join(hooksDir, hookFile);
        const stat = fs.statSync(hookPath);
        // Add execute bit if missing (equivalent to chmod +x)
        const newMode = stat.mode | 0o111;
        if (stat.mode !== newMode) {
          fs.chmodSync(hookPath, newMode);
          hooksChmodCount++;
        }
      }
    } catch (_) {
      // Non-fatal — hooks may still work if already executable
    }
  }

  return {
    success: true,
    settingsPath,
    pathsResolved,
    hooksChmodCount,
    permissionsIncluded: includePermissions,
    permissionCounts: includePermissions ? {
      allow: settings.permissions.allow.length,
      ask: settings.permissions.ask.length,
      deny: settings.permissions.deny.length
    } : null
  };
}

module.exports = { generateSettings, DEFAULT_PERMISSIONS };

