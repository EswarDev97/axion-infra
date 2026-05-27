#!/usr/bin/env node
// Initializes AICodePath SQLite database using better-sqlite3 (replaces sqlite3 CLI requirement)
const path = require('path');
const fs = require('fs');

const scriptDir = __dirname;
const aicodepathRoot = path.dirname(scriptDir);
const projectRoot = path.dirname(aicodepathRoot);
const dbDir = path.join(projectRoot, 'aicodepath-docs');
const dbPath = path.join(dbDir, 'aicodepath.db');
const schemaPath = path.join(aicodepathRoot, 'db', 'schema.sql');
const migrationsDir = path.join(aicodepathRoot, 'db', 'migrations');

const Database = require('better-sqlite3');

console.log('╔════════════════════════════════════════╗');
console.log('║  AICodePath Knowledge Base Init        ║');
console.log('╚════════════════════════════════════════╝\n');

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

if (fs.existsSync(dbPath)) {
  const backup = `${dbPath}.backup.${Date.now()}`;
  fs.copyFileSync(dbPath, backup);
  console.log(`Backed up existing database to ${backup}`);
}

if (!fs.existsSync(schemaPath)) {
  console.error(`Error: Schema file not found at ${schemaPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const schema = fs.readFileSync(schemaPath, 'utf8');
try {
  db.exec(schema);
  console.log('✓ Schema applied successfully');
} catch (err) {
  console.error('Error applying schema:', err.message);
  process.exit(1);
}

if (fs.existsSync(migrationsDir)) {
  console.log('Applying migrations...');
  const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const mig of migrations) {
    const sql = fs.readFileSync(path.join(migrationsDir, mig), 'utf8');
    try {
      db.exec(sql);
      console.log(`  ✓ ${mig}`);
    } catch (err) {
      console.log(`  ⚠ ${mig} (may already be applied: ${err.message.split('\n')[0]})`);
    }
  }
  console.log('✓ Migrations applied');
}

const fts5 = db.pragma('compile_options').find(r => r.compile_options && r.compile_options.includes('FTS5'));
console.log(fts5 ? '✓ FTS5 full-text search enabled' : '⚠ FTS5 may not be available');
console.log(`✓ Journal mode: ${db.pragma('journal_mode', { simple: true })}`);

const artifactCount = db.prepare('SELECT COUNT(*) as c FROM artifacts').get().c;
const decisionCount = db.prepare('SELECT COUNT(*) as c FROM decisions').get().c;
console.log(`\nDatabase Statistics:\n  Artifacts: ${artifactCount}\n  Decisions: ${decisionCount}`);

db.close();
console.log(`\n✓ Database initialized at: ${dbPath}`);
