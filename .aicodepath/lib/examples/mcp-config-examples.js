/**
 * MCP Config Generator - Usage Examples
 *
 * Demonstrates how the MCP config generator transforms config.json
 * MCP server definitions into standard .mcp.json format.
 */

const { stripAicodePathFields, extractMcpServersFromPlugins } = require('../mcp-config-generator');

console.log('\n=== MCP Config Generator Examples ===\n');

// Example 1: Basic transformation
console.log('Example 1: Strip AICodePath-specific fields\n');
console.log('Input (config.json):');
const input1 = {
  command: 'npx',
  args: ['@playwright/mcp'],
  optional: true,
  purpose: 'Browser automation for testing'
};
console.log(JSON.stringify(input1, null, 2));

console.log('\nOutput (.mcp.json):');
const output1 = stripAicodePathFields(input1);
console.log(JSON.stringify(output1, null, 2));

// Example 2: Server with environment variables
console.log('\n\nExample 2: MCP server with environment variables\n');
console.log('Input (config.json):');
const input2 = {
  command: 'node',
  args: ['server.js'],
  env: {
    PORT: '3000',
    API_KEY: '${API_KEY}'
  },
  optional: false,
  purpose: 'Custom MCP server'
};
console.log(JSON.stringify(input2, null, 2));

console.log('\nOutput (.mcp.json):');
const output2 = stripAicodePathFields(input2);
console.log(JSON.stringify(output2, null, 2));

// Example 3: Extract from plugins
console.log('\n\nExample 3: Extract MCP servers from plugin definitions\n');
console.log('Input (plugins):');
const plugins = [
  {
    id: 'playwright@claude-plugins-official',
    minVersion: '1.0.0',
    purpose: 'Browser automation',
    mcpServer: {
      command: 'npx',
      args: ['@playwright/mcp'],
      optional: true
    }
  },
  {
    id: 'typescript@claude-plugins-official',
    purpose: 'TypeScript intelligence'
    // No mcpServer - not an MCP plugin
  }
];
console.log(JSON.stringify(plugins, null, 2));

console.log('\nOutput (extracted MCP servers):');
const extracted = extractMcpServersFromPlugins(plugins);
console.log(JSON.stringify(extracted, null, 2));

// Example 4: Full config.json example
console.log('\n\nExample 4: Complete config.json to .mcp.json transformation\n');
console.log('Input (config.json):');
const fullConfig = {
  mcpServers: {
    playwright: {
      command: 'npx',
      args: ['@playwright/mcp'],
      optional: true,
      purpose: 'Browser automation for testing'
    },
    filesystem: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '/workspace'],
      optional: false,
      purpose: 'File system access'
    }
  },
  requiredPlugins: [
    {
      id: 'custom-mcp@company',
      mcpServer: {
        command: 'node',
        args: ['custom-server.js'],
        env: { CONFIG_PATH: '/etc/config' }
      }
    }
  ]
};
console.log(JSON.stringify(fullConfig, null, 2));

console.log('\nOutput (.mcp.json):');
const output4 = { mcpServers: {} };

// Process mcpServers
for (const [id, config] of Object.entries(fullConfig.mcpServers)) {
  output4.mcpServers[id] = stripAicodePathFields(config);
}

// Process plugins
const pluginServers = extractMcpServersFromPlugins(fullConfig.requiredPlugins);
Object.assign(output4.mcpServers, pluginServers);

console.log(JSON.stringify(output4, null, 2));

console.log('\n\nKey Points:');
console.log('  1. AICodePath-specific fields (optional, purpose, condition) are removed');
console.log('  2. Standard MCP fields (command, args, env) are preserved');
console.log('  3. _managed_by_aicodepath flag is added to track auto-generated entries');
console.log('  4. MCP servers can be defined directly or extracted from plugins');
console.log('  5. User-defined .mcp.json entries are never overwritten');
console.log('\n');
