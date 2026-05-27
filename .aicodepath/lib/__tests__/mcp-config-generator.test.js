/**
 * Test: MCP Config Generator
 *
 * Tests the MCP configuration generation functionality including:
 * - Stripping AICodePath-specific fields
 * - Loading config.json
 * - Merging with existing .mcp.json
 * - Full generation workflow
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  stripAicodePathFields,
  extractMcpServersFromPlugins,
  mergeMcpConfigs,
  generateMcpConfig
} = require('../mcp-config-generator');

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
  } catch (error) {
    failed++;
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    console.log(`  ${colors.yellow}${error.message}${colors.reset}`);
    if (error.stack) {
      console.log(`  ${colors.yellow}${error.stack.split('\n').slice(1, 3).join('\n')}${colors.reset}`);
    }
  }
}

function assertEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected, null, 2)}\n  Got: ${JSON.stringify(actual, null, 2)}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(`${message}\n  Expected truthy value, got ${condition}`);
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(`${message}\n  Expected falsy value, got ${condition}`);
  }
}

console.log('\n=== MCP Config Generator Tests ===\n');

// Test: stripAicodePathFields
test('stripAicodePathFields removes AICodePath-specific fields', () => {
  const input = {
    command: 'npx',
    args: ['@playwright/mcp'],
    optional: true,
    purpose: 'Browser automation',
    condition: 'project.hasPlaywright'
  };

  const result = stripAicodePathFields(input);

  assertFalse(result.hasOwnProperty('optional'), 'Should remove optional field');
  assertFalse(result.hasOwnProperty('purpose'), 'Should remove purpose field');
  assertFalse(result.hasOwnProperty('condition'), 'Should remove condition field');
  assertTrue(result._managed_by_aicodepath, 'Should add managed flag');
  assertEqual(result.command, 'npx', 'Should preserve command');
  assertEqual(result.args[0], '@playwright/mcp', 'Should preserve args');
});

// Test: stripAicodePathFields preserves MCP standard fields
test('stripAicodePathFields preserves MCP standard fields', () => {
  const input = {
    command: 'node',
    args: ['server.js'],
    env: { PORT: '3000' },
    optional: true
  };

  const result = stripAicodePathFields(input);

  assertTrue(result.hasOwnProperty('command'), 'Should preserve command');
  assertTrue(result.hasOwnProperty('args'), 'Should preserve args');
  assertTrue(result.hasOwnProperty('env'), 'Should preserve env');
  assertEqual(result.env.PORT, '3000', 'Should preserve env values');
});

// Test: extractMcpServersFromPlugins
test('extractMcpServersFromPlugins extracts from plugin definitions', () => {
  const plugins = [
    {
      id: 'playwright@official',
      mcpServer: {
        command: 'npx',
        args: ['@playwright/mcp'],
        optional: true
      }
    },
    {
      id: 'typescript@official',
      // No mcpServer defined
    }
  ];

  const result = extractMcpServersFromPlugins(plugins);

  assertTrue(result.hasOwnProperty('playwright'), 'Should extract playwright server');
  assertFalse(result.hasOwnProperty('typescript'), 'Should not extract non-MCP plugins');
  assertEqual(result.playwright.command, 'npx', 'Should preserve command');
});

// Test: extractMcpServersFromPlugins handles empty array
test('extractMcpServersFromPlugins handles empty array', () => {
  const result = extractMcpServersFromPlugins([]);
  assertEqual(result, {}, 'Should return empty object for empty array');
});

// Test: mergeMcpConfigs adds new entries
test('mergeMcpConfigs adds new managed entries', () => {
  const existing = {
    mcpServers: {
      'user-server': {
        command: 'node',
        args: ['user.js']
      }
    }
  };

  const aicodepathServers = {
    'playwright': {
      command: 'npx',
      args: ['@playwright/mcp'],
      _managed_by_aicodepath: true
    }
  };

  const result = mergeMcpConfigs(existing, aicodepathServers);

  assertTrue(result.mcpServers['user-server'], 'Should preserve user entry');
  assertTrue(result.mcpServers['playwright'], 'Should add managed entry');
  assertEqual(result.mcpServers['user-server'].command, 'node', 'User entry unchanged');
});

// Test: mergeMcpConfigs overwrites managed entries
test('mergeMcpConfigs overwrites managed entries only', () => {
  const existing = {
    mcpServers: {
      'playwright': {
        command: 'npx',
        args: ['@playwright/mcp@old'],
        _managed_by_aicodepath: true
      },
      'user-server': {
        command: 'node',
        args: ['user.js']
      }
    }
  };

  const aicodepathServers = {
    'playwright': {
      command: 'npx',
      args: ['@playwright/mcp@new'],
      _managed_by_aicodepath: true
    }
  };

  const result = mergeMcpConfigs(existing, aicodepathServers);

  assertEqual(result.mcpServers.playwright.args[0], '@playwright/mcp@new', 'Should update managed entry');
  assertEqual(result.mcpServers['user-server'].command, 'node', 'Should not touch user entry');
});

// Test: mergeMcpConfigs removes stale managed entries
test('mergeMcpConfigs removes stale managed entries', () => {
  const existing = {
    mcpServers: {
      'old-managed': {
        command: 'npx',
        args: ['old'],
        _managed_by_aicodepath: true
      },
      'playwright': {
        command: 'npx',
        args: ['@playwright/mcp'],
        _managed_by_aicodepath: true
      }
    }
  };

  const aicodepathServers = {
    'playwright': {
      command: 'npx',
      args: ['@playwright/mcp'],
      _managed_by_aicodepath: true
    }
  };

  const result = mergeMcpConfigs(existing, aicodepathServers);

  assertFalse(result.mcpServers['old-managed'], 'Should remove stale managed entry');
  assertTrue(result.mcpServers['playwright'], 'Should keep current managed entry');
});

// Test: Full integration with mock project
test('generateMcpConfig full integration', () => {
  // Create temporary test directory
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));

  try {
    // Create .aicodepath directory
    const aicodePathDir = path.join(testDir, '.aicodepath');
    fs.mkdirSync(aicodePathDir, { recursive: true });

    // Create mock config.json
    const config = {
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['@playwright/mcp'],
          optional: true,
          purpose: 'Testing'
        }
      }
    };
    fs.writeFileSync(
      path.join(aicodePathDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // Run generator
    const result = generateMcpConfig(testDir);

    // Verify result
    assertTrue(result.success, 'Should succeed');
    assertEqual(result.serverCount, 1, 'Should have 1 server');
    assertTrue(fs.existsSync(result.mcpPath), '.mcp.json should be created');

    // Verify file content
    const mcpContent = JSON.parse(fs.readFileSync(result.mcpPath, 'utf8'));
    assertTrue(mcpContent.mcpServers.playwright, 'Should contain playwright server');
    assertFalse(mcpContent.mcpServers.playwright.hasOwnProperty('optional'), 'Should strip optional field');
    assertFalse(mcpContent.mcpServers.playwright.hasOwnProperty('purpose'), 'Should strip purpose field');
    assertTrue(mcpContent.mcpServers.playwright._managed_by_aicodepath, 'Should have managed flag');

  } finally {
    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});

// Summary
console.log(`\n=== Test Summary ===`);
console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
if (failed > 0) {
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  process.exit(1);
} else {
  console.log(`${colors.green}All tests passed!${colors.reset}`);
  process.exit(0);
}
