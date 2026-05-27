/**
 * MCP Config Generator - Transform config.json MCP entries to .mcp.json
 *
 * Generates a standard .mcp.json file from AICodePath config.json MCP server
 * definitions, stripping AICodePath-specific fields (optional, purpose, condition)
 * that aren't part of the MCP spec.
 *
 * @module lib/mcp-config-generator
 */

const fs = require('fs');
const path = require('path');
const pathResolver = require('./path-resolver');
const logger = require('./logger');
const { findPython } = require('./platform-utils');

/**
 * Strip AICodePath-specific fields from MCP server entry
 *
 * @param {Object} serverConfig - MCP server configuration object
 * @returns {Object} - Cleaned server config with only MCP-standard fields
 */
function stripAicodePathFields(serverConfig) {
  const cleaned = { ...serverConfig };

  // Remove AICodePath-specific fields
  delete cleaned.optional;
  delete cleaned.purpose;
  delete cleaned.condition;

  // Add managed flag to track auto-generated entries
  cleaned._managed_by_aicodepath = true;

  return cleaned;
}

/**
 * Extract MCP server entries from plugins
 *
 * @param {Array} plugins - Array of plugin definitions
 * @returns {Object} - MCP server entries from plugins (if any define MCP servers)
 */
function extractMcpServersFromPlugins(plugins) {
  if (!Array.isArray(plugins)) return {};

  const mcpServers = {};

  for (const plugin of plugins) {
    // Check if plugin defines an MCP server
    if (plugin.mcpServer) {
      const serverId = plugin.id.split('@')[0]; // Use plugin ID as server name
      mcpServers[serverId] = stripAicodePathFields(plugin.mcpServer);
    }
  }

  return mcpServers;
}

/**
 * Load and parse AICodePath config.json
 *
 * @param {string} targetProjectRoot - Absolute path to target project root
 * @returns {Object|null} - Parsed config or null if not found/invalid
 */
function loadAicodePathConfig(targetProjectRoot) {
  const configPath = path.join(targetProjectRoot, '.aicodepath', 'config.json');

  if (!fs.existsSync(configPath)) {
    logger.warn('AICodePath config.json not found', { configPath });
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logger.error('Failed to parse config.json', {
      configPath,
      error: error.message
    });
    return null;
  }
}

/**
 * Load existing .mcp.json if it exists
 *
 * @param {string} targetProjectRoot - Absolute path to target project root
 * @returns {Object} - Existing MCP config or empty structure
 */
function loadExistingMcpConfig(targetProjectRoot) {
  const mcpPath = path.join(targetProjectRoot, '.mcp.json');

  if (!fs.existsSync(mcpPath)) {
    return { mcpServers: {} };
  }

  try {
    const content = fs.readFileSync(mcpPath, 'utf8');
    const config = JSON.parse(content);

    // Ensure mcpServers key exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    return config;
  } catch (error) {
    logger.warn('Failed to parse existing .mcp.json, creating new', {
      error: error.message
    });
    return { mcpServers: {} };
  }
}

/**
 * Merge AICodePath MCP entries with existing .mcp.json
 *
 * Only overwrites entries that have the _managed_by_aicodepath flag.
 * Preserves user-defined entries.
 *
 * @param {Object} existingConfig - Existing .mcp.json config
 * @param {Object} aicodePathServers - MCP servers from config.json
 * @returns {Object} - Merged configuration
 */
function mergeMcpConfigs(existingConfig, aicodePathServers) {
  const merged = { ...existingConfig };

  // Ensure mcpServers exists
  if (!merged.mcpServers) {
    merged.mcpServers = {};
  }

  // Add/update managed entries
  for (const [serverId, serverConfig] of Object.entries(aicodePathServers)) {
    const existingEntry = merged.mcpServers[serverId];

    // Only overwrite if entry is managed by AICodePath or doesn't exist
    if (!existingEntry || existingEntry._managed_by_aicodepath) {
      merged.mcpServers[serverId] = serverConfig;
    } else {
      logger.debug('Preserving user-defined MCP entry', { serverId });
    }
  }

  // Remove stale managed entries (servers removed from config.json)
  const managedIds = Object.keys(aicodePathServers);
  for (const [serverId, serverConfig] of Object.entries(merged.mcpServers)) {
    if (serverConfig._managed_by_aicodepath && !managedIds.includes(serverId)) {
      logger.debug('Removing stale managed MCP entry', { serverId });
      delete merged.mcpServers[serverId];
    }
  }

  return merged;
}

/**
 * Generate .mcp.json for target project
 *
 * Reads config.json MCP server definitions, strips AICodePath-specific fields,
 * and writes standard .mcp.json file. Handles merging with existing user-defined
 * entries.
 *
 * @param {string} targetProjectRoot - Absolute path to target project root
 * @returns {Object} - Summary { success, mcpPath, serverCount, merged, errors }
 */
function generateMcpConfig(targetProjectRoot) {
  if (!targetProjectRoot || !path.isAbsolute(targetProjectRoot)) {
    throw new Error('Target project root must be an absolute path');
  }

  const endTimer = logger.startTimer('mcp-config-generation');
  const result = {
    success: false,
    mcpPath: path.join(targetProjectRoot, '.mcp.json'),
    serverCount: 0,
    merged: false,
    errors: []
  };

  try {
    // Load AICodePath config
    const config = loadAicodePathConfig(targetProjectRoot);
    if (!config) {
      result.errors.push('Config.json not found or invalid');
      endTimer({ success: false });
      return result;
    }

    // Extract MCP servers from config.json
    const aicodePathServers = {};

    // 1. Direct mcpServers section
    if (config.mcpServers && typeof config.mcpServers === 'object') {
      for (const [serverId, serverConfig] of Object.entries(config.mcpServers)) {
        aicodePathServers[serverId] = stripAicodePathFields(serverConfig);
      }
    }

    // 2. Required plugins that define MCP servers
    if (config.requiredPlugins) {
      const requiredMcpServers = extractMcpServersFromPlugins(config.requiredPlugins);
      Object.assign(aicodePathServers, requiredMcpServers);
    }

    // 3. Optional plugins that define MCP servers
    if (config.optionalPlugins) {
      const optionalMcpServers = extractMcpServersFromPlugins(config.optionalPlugins);
      Object.assign(aicodePathServers, optionalMcpServers);
    }

    // 4. Built-in managed servers (computed from project paths at generation time)
    const generatorsPath = path.join(targetProjectRoot, '.aicodepath', 'generators');
    const dbPath = path.join(targetProjectRoot, 'aicodepath-docs', 'aicodepath.db');

    aicodePathServers['aicodepath-code-graph'] = {
      type: 'stdio',
      command: findPython(),
      args: [path.join(generatorsPath, 'mcp_graph_server.py')],
      env: {
        AICODEPATH_PROJECT_ROOT: targetProjectRoot,
        AICODEPATH_DB_PATH: dbPath
      },
      _managed_by_aicodepath: true
    };

    // If no MCP servers defined, skip generation
    if (Object.keys(aicodePathServers).length === 0) {
      logger.info('No MCP servers defined in config.json, skipping .mcp.json generation');
      result.success = true;
      result.serverCount = 0;
      endTimer({ success: true, serverCount: 0 });
      return result;
    }

    // Load existing .mcp.json
    const existingConfig = loadExistingMcpConfig(targetProjectRoot);
    const hadExistingEntries = Object.keys(existingConfig.mcpServers || {}).length > 0;

    // Merge configurations
    const mergedConfig = mergeMcpConfigs(existingConfig, aicodePathServers);

    // Write .mcp.json
    fs.writeFileSync(
      result.mcpPath,
      JSON.stringify(mergedConfig, null, 2) + '\n',
      'utf8'
    );

    result.success = true;
    result.serverCount = Object.keys(aicodePathServers).length;
    result.merged = hadExistingEntries;

    logger.info('Generated .mcp.json', {
      mcpPath: result.mcpPath,
      serverCount: result.serverCount,
      merged: result.merged
    });

    endTimer({ success: true, serverCount: result.serverCount });

  } catch (error) {
    result.errors.push(error.message);
    logger.error('Failed to generate .mcp.json', {
      error: error.message,
      stack: process.env.DEBUG ? error.stack : undefined
    });
    endTimer({ success: false, error: error.message });
  }

  return result;
}

module.exports = {
  generateMcpConfig,
  stripAicodePathFields,
  extractMcpServersFromPlugins,
  loadAicodePathConfig,
  loadExistingMcpConfig,
  mergeMcpConfigs
};
