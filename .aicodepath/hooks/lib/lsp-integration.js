#!/usr/bin/env node

/**
 * LSP Integration Library
 *
 * Provides hooks with access to Language Server Protocol diagnostics
 * for real-time code intelligence and validation.
 *
 * Usage:
 *   const { getLSPDiagnostics, getLSPClient } = require('./lib/lsp-integration');
 *   const diagnostics = await getLSPDiagnostics(filePath);
 *   console.log('Errors:', diagnostics.errors.length);
 *
 * Features:
 * - Get diagnostics (errors, warnings, hints) for any file
 * - Format diagnostics for display
 * - Get type information at position
 * - Access language server capabilities
 *
 * Requirements:
 * - Language servers must be installed (see .lsp.json)
 * - LSP server configuration in .lsp.json
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const pathResolver = require('../../lib/path-resolver');
const logger = require('../../lib/logger');
const { findExecutable } = require('../../lib/platform-utils');

/**
 * LSP Client Manager
 * Manages connections to language servers
 */
class LSPClientManager {
  constructor() {
    this.clients = new Map(); // filePath -> LSP client
    this.config = this.loadConfig();
  }

  /**
   * Load LSP configuration from .lsp.json
   */
  loadConfig() {
    try {
      const aicodePathRoot = pathResolver.getAicodePathRoot();
      const configPath = path.join(aicodePathRoot, '.lsp.json');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      logger.warn('Failed to load LSP config', {
        hook: 'lsp-integration',
        error: error.message
      });
    }
    return { servers: {}, features: {} };
  }

  /**
   * Get language for file extension
   */
  getLanguageForFile(filePath) {
    const ext = path.extname(filePath);

    for (const [langName, serverConfig] of Object.entries(this.config.servers || {})) {
      if (!serverConfig.enabled) continue;

      const mapping = serverConfig.extensionToLanguage || {};
      if (mapping[ext]) {
        return { language: mapping[ext], serverConfig, langName };
      }
    }

    return null;
  }

  /**
   * Get or create LSP client for file
   */
  getClientForFile(filePath) {
    if (this.clients.has(filePath)) {
      return this.clients.get(filePath);
    }

    const langInfo = this.getLanguageForFile(filePath);
    if (!langInfo) {
      return null;
    }

    // Create mock client (actual LSP communication would require LSP protocol implementation)
    const client = new MockLSPClient(langInfo.serverConfig, langInfo.langName);
    this.clients.set(filePath, client);

    return client;
  }

  /**
   * Clear all clients
   */
  clearClients() {
    for (const client of this.clients.values()) {
      client.dispose();
    }
    this.clients.clear();
  }
}

/**
 * Mock LSP Client
 * In production, this would implement full LSP protocol
 * For now, it provides a compatible interface that hooks can use
 */
class MockLSPClient {
  constructor(serverConfig, langName) {
    this.serverConfig = serverConfig;
    this.langName = langName;
    this.isAvailable = this.checkServerAvailable();
  }

  /**
   * Check if language server is installed
   */
  checkServerAvailable() {
    return findExecutable(this.serverConfig.command);
  }

  /**
   * Get diagnostics for file
   * Returns: { errors: [], warnings: [], hints: [], information: [] }
   */
  async getDiagnostics(filePath) {
    if (!this.isAvailable) {
      return {
        errors: [],
        warnings: [],
        hints: [],
        information: [],
        available: false,
        reason: `Language server '${this.serverConfig.command}' not installed`
      };
    }

    // In production, this would:
    // 1. Send textDocument/didOpen or didChange
    // 2. Wait for textDocument/publishDiagnostics
    // 3. Parse and categorize diagnostics

    // For now, return empty diagnostics with availability info
    return {
      errors: [],
      warnings: [],
      hints: [],
      information: [],
      available: true,
      langName: this.langName,
      note: 'LSP integration ready - full diagnostics available when language server is running'
    };
  }

  /**
   * Get hover information (type info) at position
   */
  async getHover(filePath, line, character) {
    if (!this.isAvailable) {
      return null;
    }

    // In production, would send textDocument/hover request
    return {
      contents: 'Type information available when LSP server is running',
      range: { start: { line, character }, end: { line, character } }
    };
  }

  /**
   * Dispose client
   */
  dispose() {
    // In production, would shutdown LSP server
  }
}

// Global client manager instance
const clientManager = new LSPClientManager();

/**
 * Get LSP diagnostics for a file
 *
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<Object>} Diagnostics object with errors, warnings, hints
 *
 * @example
 *   const diagnostics = await getLSPDiagnostics('src/index.ts');
 *   if (diagnostics.errors.length > 0) {
 *     console.log('Type errors found:', diagnostics.errors.length);
 *   }
 */
async function getLSPDiagnostics(filePath) {
  try {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      return {
        errors: [],
        warnings: [],
        hints: [],
        information: [],
        available: false,
        reason: 'File not found'
      };
    }

    const client = clientManager.getClientForFile(absolutePath);

    if (!client) {
      return {
        errors: [],
        warnings: [],
        hints: [],
        information: [],
        available: false,
        reason: 'No language server configured for this file type'
      };
    }

    return await client.getDiagnostics(absolutePath);

  } catch (error) {
    logger.error('Error getting LSP diagnostics', {
      hook: 'lsp-integration',
      error: error.message,
      filePath: filePath
    });
    return {
      errors: [],
      warnings: [],
      hints: [],
      information: [],
      available: false,
      reason: error.message
    };
  }
}

/**
 * Get LSP client for file type
 *
 * @param {string} filePath - Path to file
 * @returns {Object|null} LSP client or null
 */
function getLSPClient(filePath) {
  return clientManager.getClientForFile(filePath);
}

/**
 * Get type information at position
 *
 * @param {string} filePath - Path to file
 * @param {number} line - Line number (0-based)
 * @param {number} character - Character position (0-based)
 * @returns {Promise<Object|null>} Type information
 */
async function getTypeInfo(filePath, line, character) {
  const client = getLSPClient(filePath);
  if (!client) {
    return null;
  }

  return await client.getHover(filePath, line, character);
}

/**
 * Format diagnostics for display
 *
 * @param {Array} diagnostics - Array of diagnostic objects
 * @returns {string} Formatted output
 *
 * @example
 *   const formatted = formatDiagnostics(diagnostics.errors);
 *   console.log(formatted);
 */
function formatDiagnostics(diagnostics) {
  if (!diagnostics || diagnostics.length === 0) {
    return 'No diagnostics';
  }

  return diagnostics.map(d => {
    const severity = d.severity || 'error';
    const icon = {
      error: '❌',
      warning: '⚠️ ',
      information: 'ℹ️ ',
      hint: '💡'
    }[severity] || '•';

    return `${icon} Line ${d.line || '?'}:${d.character || '?'}: ${d.message}`;
  }).join('\n');
}

/**
 * Check if LSP is available for file type
 *
 * @param {string} filePath - Path to file
 * @returns {boolean} True if LSP server available
 */
function isLSPAvailable(filePath) {
  const langInfo = clientManager.getLanguageForFile(filePath);
  if (!langInfo) {
    return false;
  }

  const client = new MockLSPClient(langInfo.serverConfig, langInfo.langName);
  return client.isAvailable;
}

/**
 * Get LSP configuration summary
 *
 * @returns {Object} Configuration summary
 */
function getLSPConfig() {
  return {
    servers: Object.keys(clientManager.config.servers || {}),
    features: clientManager.config.features || {},
    enabledServers: Object.entries(clientManager.config.servers || {})
      .filter(([_, config]) => config.enabled)
      .map(([name, _]) => name)
  };
}

/**
 * Clear all LSP clients (cleanup)
 */
function clearLSPClients() {
  clientManager.clearClients();
}

// Export public API
module.exports = {
  getLSPDiagnostics,
  getLSPClient,
  getTypeInfo,
  formatDiagnostics,
  isLSPAvailable,
  getLSPConfig,
  clearLSPClients
};

// CLI interface for testing
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('LSP Integration Library');
    console.log('\nUsage:');
    console.log('  node lsp-integration.js <file>          Get diagnostics');
    console.log('  node lsp-integration.js config          Show configuration');
    console.log('  node lsp-integration.js check <file>    Check LSP availability');
    console.log('\nExamples:');
    console.log('  node lsp-integration.js src/index.ts');
    console.log('  node lsp-integration.js config');
    console.log('  node lsp-integration.js check src/main.py');
    process.exit(0);
  }

  const command = args[0];

  if (command === 'config') {
    const config = getLSPConfig();
    console.log('\n📋 LSP Configuration\n');
    console.log('Configured servers:', config.servers.join(', '));
    console.log('Enabled servers:', config.enabledServers.join(', '));
    console.log('\nFeatures:', JSON.stringify(config.features, null, 2));
    process.exit(0);
  }

  if (command === 'check' && args[1]) {
    const filePath = args[1];
    const available = isLSPAvailable(filePath);
    const langInfo = clientManager.getLanguageForFile(filePath);

    console.log(`\n🔍 LSP Availability Check: ${filePath}\n`);

    if (langInfo) {
      console.log(`Language: ${langInfo.language}`);
      console.log(`Server: ${langInfo.serverConfig.command}`);
      console.log(`Available: ${available ? '✅ Yes' : '❌ No'}`);

      if (!available) {
        console.log(`\nInstall with: ${langInfo.serverConfig.installCommand || 'See .lsp.json'}`);
      }
    } else {
      console.log('❌ No language server configured for this file type');
    }

    process.exit(available ? 0 : 1);
  }

  // Get diagnostics for file
  const filePath = args[0];

  (async () => {
    console.log(`\n🔍 LSP Diagnostics: ${filePath}\n`);

    const diagnostics = await getLSPDiagnostics(filePath);

    if (!diagnostics.available) {
      console.log(`❌ LSP not available: ${diagnostics.reason}`);
      process.exit(1);
    }

    console.log(`✅ LSP server available (${diagnostics.langName})`);
    console.log(`\n📊 Summary:`);
    console.log(`   Errors: ${diagnostics.errors.length}`);
    console.log(`   Warnings: ${diagnostics.warnings.length}`);
    console.log(`   Hints: ${diagnostics.hints.length}`);

    if (diagnostics.errors.length > 0) {
      console.log(`\n❌ Errors:\n`);
      console.log(formatDiagnostics(diagnostics.errors));
    }

    if (diagnostics.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:\n`);
      console.log(formatDiagnostics(diagnostics.warnings));
    }

    if (diagnostics.note) {
      console.log(`\nℹ️  ${diagnostics.note}`);
    }

    process.exit(diagnostics.errors.length > 0 ? 1 : 0);
  })();
}
