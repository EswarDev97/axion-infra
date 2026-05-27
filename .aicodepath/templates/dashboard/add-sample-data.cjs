/**
 * Add Sample Data to Database
 *
 * This script adds sample data for testing the dashboard.
 * Run: node add-sample-data.cjs
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../aicodepath-docs/aicodepath.db');

console.log('📊 Adding sample data to database\n');
console.log(`Database: ${dbPath}\n`);

try {
  const db = new Database(dbPath);

  // Sample workflow tasks
  const workflowTasks = [
    {
      cr_number: 'CR001',
      phase: 'inception',
      stage: 'requirements-analysis',
      unit: 'user-authentication',
      status: 'completed',
      steps_total: 5,
      steps_completed: 5,
      notes: 'Requirements gathering completed'
    },
    {
      cr_number: 'CR001',
      phase: 'construction',
      stage: 'functional-design',
      unit: 'user-authentication',
      status: 'in_progress',
      steps_total: 8,
      steps_completed: 5,
      notes: 'Designing auth flow'
    },
    {
      cr_number: 'CR002',
      phase: 'inception',
      stage: 'user-stories',
      unit: 'payment-processing',
      status: 'pending',
      steps_total: 3,
      steps_completed: 0,
      notes: 'Waiting for stakeholder input'
    },
    {
      cr_number: 'CR003',
      phase: 'construction',
      stage: 'code-generation',
      unit: 'dashboard',
      status: 'blocked',
      steps_total: 10,
      steps_completed: 3,
      notes: null,
      blockers: JSON.stringify(['Missing API specification', 'Database schema not finalized'])
    }
  ];

  console.log('Adding workflow tasks...');
  const insertWorkflow = db.prepare(`
    INSERT INTO workflow_state (cr_number, phase, stage, unit, status, steps_total, steps_completed, notes, blockers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const task of workflowTasks) {
    insertWorkflow.run(
      task.cr_number,
      task.phase,
      task.stage,
      task.unit,
      task.status,
      task.steps_total,
      task.steps_completed,
      task.notes,
      task.blockers
    );
  }
  console.log(`✅ Added ${workflowTasks.length} workflow tasks\n`);

  // Sample artifacts
  const artifacts = [
    {
      artifact_type: 'requirement',
      phase: 'inception',
      stage: 'requirements-analysis',
      unit: 'user-authentication',
      title: 'User Authentication Requirements',
      content: '# User Authentication\n\n## Functional Requirements\n- Support email/password login\n- OAuth integration',
      status: 'active'
    },
    {
      artifact_type: 'design',
      phase: 'construction',
      stage: 'functional-design',
      unit: 'user-authentication',
      title: 'Auth Flow Design',
      content: '# Authentication Flow\n\n## Components\n- Login page\n- JWT token service',
      status: 'active'
    },
    {
      artifact_type: 'code',
      phase: 'construction',
      stage: 'code-generation',
      unit: 'dashboard',
      title: 'Dashboard Component',
      content: 'React dashboard implementation',
      file_path: '/src/components/Dashboard.tsx',
      status: 'active'
    }
  ];

  console.log('Adding artifacts...');
  const insertArtifact = db.prepare(`
    INSERT INTO artifacts (artifact_type, phase, stage, unit, title, content, file_path, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const artifact of artifacts) {
    insertArtifact.run(
      artifact.artifact_type,
      artifact.phase,
      artifact.stage,
      artifact.unit,
      artifact.title,
      artifact.content,
      artifact.file_path || null,
      artifact.status
    );
  }
  console.log(`✅ Added ${artifacts.length} artifacts\n`);

  // Sample validations
  const validations = [
    {
      validation_type: 'guideline',
      score: 95,
      status: 'PASS',
      violations: JSON.stringify([])
    },
    {
      validation_type: 'security',
      score: 78,
      status: 'REVIEW',
      violations: JSON.stringify([
        { rule: 'SEC-001', message: 'Potential SQL injection risk', severity: 'medium' }
      ])
    },
    {
      validation_type: 'duplication',
      score: 45,
      status: 'FAIL',
      violations: JSON.stringify([
        { rule: 'DUP-001', message: 'Duplicate code detected in auth module', severity: 'high' }
      ])
    }
  ];

  console.log('Adding validations...');
  const insertValidation = db.prepare(`
    INSERT INTO validations (validation_type, score, status, violations)
    VALUES (?, ?, ?, ?)
  `);

  for (const validation of validations) {
    insertValidation.run(
      validation.validation_type,
      validation.score,
      validation.status,
      validation.violations
    );
  }
  console.log(`✅ Added ${validations.length} validations\n`);

  // Sample code entities
  const codeEntities = [
    {
      file_path: 'src/auth/auth.service.ts',
      entity_type: 'class',
      name: 'AuthService',
      line_start: 10,
      line_end: 150,
      complexity: 8,
      documentation: 'Handles user authentication and authorization',
      language: 'typescript'
    },
    {
      file_path: 'src/user/user.controller.ts',
      entity_type: 'class',
      name: 'UserController',
      line_start: 5,
      line_end: 200,
      complexity: 12,
      documentation: 'REST API endpoints for user management',
      language: 'typescript'
    },
    {
      file_path: 'src/database/database.service.ts',
      entity_type: 'class',
      name: 'DatabaseService',
      line_start: 1,
      line_end: 80,
      complexity: 6,
      documentation: 'Database connection and query management',
      language: 'typescript'
    }
  ];

  console.log('Skipping code entities (FTS trigger issue)...');
  console.log('ℹ️  Code entities can be added by the actual indexer\n');

  // Skip code entities and relations due to broken FTS triggers
  // The real code indexer will handle this properly

  console.log('Skipping design violations (schema mismatch)...');
  console.log('ℹ️  Design violations will be added by the frontend-designer agent\n');

  db.close();

  console.log('✨ Sample data added successfully!\n');
  console.log('You can now start the dashboard to see the data:\n');
  console.log('  ./start.sh\n');
  console.log('Or run the test script to verify:\n');
  console.log('  node test-api.cjs\n');

} catch (error) {
  console.error('❌ Error adding sample data:', error.message);
  console.error(error.stack);
  process.exit(1);
}
