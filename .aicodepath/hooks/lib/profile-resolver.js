/**
 * Profile Resolver for AICodePath Hook System
 *
 * Controls which hooks run based on a tiered profile system.
 * Profiles determine the minimum tier a hook must belong to in order to execute.
 *
 * Tier hierarchy: minimal (0) < standard (1) < strict (2)
 *
 * A hook runs if its tier <= the active profile tier.
 * For example, under "standard" profile, hooks with tier "minimal" or "standard" run,
 * but "strict" hooks do not.
 *
 * Resolution priority:
 *   1. AICODEPATH_HOOK_PROFILE env var
 *   2. config.json hookProfile field
 *   3. Fallback to 'standard'
 *
 * @module hooks/lib/profile-resolver
 */

const fs = require('fs');
const path = require('path');

/** @type {Object<string, number>} Tier ordering — lower runs in more profiles */
const TIER_ORDER = { minimal: 0, standard: 1, strict: 2 };

const DEFAULT_PROFILE = 'standard';

/**
 * Resolve the active hook profile.
 *
 * @returns {string} One of 'minimal', 'standard', 'strict'
 */
function resolveProfile() {
  // 1. Environment variable (highest priority)
  const envProfile = process.env.AICODEPATH_HOOK_PROFILE;
  if (envProfile && TIER_ORDER[envProfile] !== undefined) {
    return envProfile;
  }

  // 2. Try to read config.json hookProfile field
  try {
    const pathResolver = require('../../lib/path-resolver');
    const aicodePathRoot = pathResolver.getAicodePathRoot();
    const configPath = path.join(aicodePathRoot, 'config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (configData.hookProfile && TIER_ORDER[configData.hookProfile] !== undefined) {
      return configData.hookProfile;
    }
  } catch (_err) {
    // Config file may not exist or be unreadable — fall through to default
    try {
      const logger = require('../../lib/logger');
      logger.debug('profile-resolver: config.json not available, using default profile', { context: 'profile-resolver' });
    } catch (_logErr) {
      // Logger may not be available in test environments
    }
  }

  // 3. Fallback
  return DEFAULT_PROFILE;
}

/**
 * Check if a hook is explicitly disabled via AICODEPATH_DISABLED_HOOKS.
 *
 * @param {string} hookName - Name of the hook (e.g. 'guideline-validator')
 * @returns {boolean} True if the hook is disabled
 */
function isHookDisabled(hookName) {
  const disabled = process.env.AICODEPATH_DISABLED_HOOKS;
  if (!disabled) return false;
  const list = disabled.split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(hookName);
}

/**
 * Determine whether a hook should run under the current profile.
 *
 * @param {string} hookName - Name of the hook
 * @param {string} hookTier - Tier the hook belongs to ('minimal', 'standard', 'strict')
 * @returns {{ run: boolean, reason: string }}
 */
function shouldRunHook(hookName, hookTier) {
  // 1. Check explicit disable list
  if (isHookDisabled(hookName)) {
    return { run: false, reason: 'Disabled via AICODEPATH_DISABLED_HOOKS' };
  }

  // 2. Resolve active profile
  const profile = resolveProfile();
  const profileLevel = TIER_ORDER[profile] !== undefined ? TIER_ORDER[profile] : TIER_ORDER[DEFAULT_PROFILE];
  const hookLevel = TIER_ORDER[hookTier] !== undefined ? TIER_ORDER[hookTier] : TIER_ORDER[DEFAULT_PROFILE];

  // 3. Hook runs if its tier <= active profile tier
  const shouldRun = hookLevel <= profileLevel;

  return {
    run: shouldRun,
    reason: shouldRun
      ? `Hook tier '${hookTier}' runs under '${profile}' profile`
      : `Hook tier '${hookTier}' excluded by '${profile}' profile`,
  };
}

module.exports = { shouldRunHook, resolveProfile, isHookDisabled, TIER_ORDER };
