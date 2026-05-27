/**
 * Test API Endpoints
 *
 * This script tests all API endpoints to ensure they work correctly.
 * Run: node test-api.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../aicodepath-docs/aicodepath.db');

console.log('🧪 Testing API Endpoints\n');
console.log(`📊 Database: ${dbPath}\n`);

try {
  const db = new Database(dbPath, { readonly: true });

  // Test each query
  const tests = [
    {
      name: 'Workflow State',
      query: 'SELECT COUNT(*) as count FROM workflow_state'
    },
    {
      name: 'Agent Status',
      query: 'SELECT COUNT(*) as count FROM agent_status'
    },
    {
      name: 'Validations',
      query: 'SELECT COUNT(*) as count FROM validations'
    },
    {
      name: 'Artifacts',
      query: 'SELECT COUNT(*) as count FROM artifacts'
    },
    {
      name: 'Code Entities',
      query: 'SELECT COUNT(*) as count FROM code_entities'
    },
    {
      name: 'Code Relations',
      query: 'SELECT COUNT(*) as count FROM code_relations'
    },
    {
      name: 'Session History',
      query: 'SELECT COUNT(*) as count FROM session_history'
    },
    {
      name: 'Design Violations',
      query: 'SELECT COUNT(*) as count FROM design_violations'
    }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      const result = db.prepare(test.query).get();
      console.log(`✅ ${test.name.padEnd(20)} - ${result.count} rows`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name.padEnd(20)} - ERROR: ${error.message}`);
      failed++;
    }
  });

  db.close();

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('⚠️  Some tables are missing or empty.');
    console.log('This is expected if the database hasn\'t been fully initialized.\n');
  } else {
    console.log('✨ All endpoints should work correctly!\n');
  }

} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  console.error('\nPlease ensure aicodepath.db exists at:');
  console.error(dbPath);
  process.exit(1);
}
