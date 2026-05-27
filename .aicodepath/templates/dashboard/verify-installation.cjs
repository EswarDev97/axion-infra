/**
 * Verify Dashboard Installation
 *
 * This script verifies that all components are properly installed and configured.
 * Run: node verify-installation.cjs
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying AICodePath Dashboard Installation\n');

let passed = 0;
let failed = 0;

// Check files exist
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'tailwind.config.js',
  'postcss.config.js',
  'index.html',
  'api/server.cjs',
  'src/App.tsx',
  'src/main.tsx',
  'src/index.css',
  'src/hooks/useDatabase.ts',
  'src/components/KanbanBoard.tsx',
  'src/components/MonitorView.tsx',
  'src/components/DependencyGraph.tsx',
  'start.sh',
  'test-api.cjs',
  'add-sample-data.cjs',
  'README.md',
  'TESTING.md',
  'DEPLOYMENT.md',
  'PHASE5_COMPLETE.md'
];

console.log('📁 Checking Required Files...\n');

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
    passed++;
  } else {
    console.log(`❌ ${file} - MISSING`);
    failed++;
  }
});

// Check node_modules
console.log('\n📦 Checking Dependencies...\n');

const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ node_modules exists');
  passed++;

  // Check key dependencies
  const keyDeps = ['react', 'react-dom', 'recharts', 'express', 'better-sqlite3', 'cors', 'vite'];
  keyDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      console.log(`✅ ${dep} installed`);
      passed++;
    } else {
      console.log(`❌ ${dep} - NOT INSTALLED`);
      failed++;
    }
  });
} else {
  console.log('❌ node_modules not found - run: npm install');
  failed++;
}

// Check database
console.log('\n💾 Checking Database...\n');

const dbPath = path.join(__dirname, '../../aicodepath-docs/aicodepath.db');
if (fs.existsSync(dbPath)) {
  console.log(`✅ Database exists: ${dbPath}`);
  passed++;

  const stats = fs.statSync(dbPath);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
} else {
  console.log(`❌ Database not found at: ${dbPath}`);
  failed++;
}

// Check ports availability
console.log('\n🔌 Port Information...\n');
console.log('ℹ️  Dashboard will use port 3899 (Vite)');
console.log('ℹ️  API will use port 3001 (Express)');
console.log('   If ports are in use, you can specify custom ports:');
console.log('   node ../commands/dashboard.js --port 4000 --api-port 4001\n');

// Summary
console.log('═'.repeat(60));
console.log('\n📊 Verification Summary\n');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total:  ${passed + failed}\n`);

if (failed === 0) {
  console.log('🎉 All checks passed! Dashboard is ready to use.\n');
  console.log('To start the dashboard:\n');
  console.log('  ./start.sh\n');
  console.log('Or:\n');
  console.log('  node ../commands/dashboard.js\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above.\n');

  if (!fs.existsSync(nodeModulesPath)) {
    console.log('💡 To install dependencies:\n');
    console.log('  npm install\n');
  }

  process.exit(1);
}
