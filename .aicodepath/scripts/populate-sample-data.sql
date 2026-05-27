-- aicodepath: allow-duplication
-- SQL data insertion naturally has repetitive INSERT statements

-- ============================================================================
-- AICodePath Sample Data Population Script
-- ============================================================================
-- Purpose: Populate database with meaningful test data for Monitor Page
-- Usage: sqlite3 aicodepath.db < populate-sample-data.sql
-- ============================================================================

-- ============================================================================
-- PART 1: Sample Artifacts (Diverse types across phases)
-- ============================================================================

INSERT OR IGNORE INTO artifacts (artifact_type, phase, stage, title, content, cr_number, status)
VALUES
  -- INCEPTION Phase
  ('requirement', 'inception', 'requirements-analysis', 'User Authentication', 'System SHALL support secure user authentication with JWT tokens', 'CR-001', 'active'),
  ('requirement', 'inception', 'requirements-analysis', 'Data Export', 'Users SHALL be able to export data to CSV format', 'CR-002', 'active'),
  ('story', 'inception', 'user-stories', 'User Login', 'As a user, I want to log in securely so that I can access my data', 'CR-001', 'active'),
  ('story', 'inception', 'user-stories', 'Export Dashboard Data', 'As an admin, I want to export analytics data so that I can analyze trends', 'CR-002', 'active'),
  ('plan', 'inception', 'workflow-planning', 'Sprint 1 Plan', 'Authentication implementation - 2 weeks', 'CR-001', 'active'),

  -- CONSTRUCTION Phase
  ('design', 'construction', 'functional-design', 'Authentication Flow', '# Auth Design\n\n1. Login endpoint\n2. Token generation\n3. Refresh mechanism', 'CR-001', 'active'),
  ('design', 'construction', 'database-design', 'User Schema', 'CREATE TABLE users (id, email, password_hash, created_at)', 'CR-001', 'active'),
  ('design', 'construction', 'api-design', 'REST API Spec', '# Endpoints\n\nPOST /api/auth/login\nPOST /api/auth/refresh', 'CR-001', 'active'),
  ('code', 'construction', 'code-generation', 'AuthService.js', 'class AuthService { async login(email, password) { ... } }', 'CR-001', 'active'),
  ('code', 'construction', 'code-generation', 'UserController.js', 'export const userController = { getProfile, updateProfile }', 'CR-002', 'active'),
  ('test', 'construction', 'build-and-test', 'AuthService.test.js', 'describe("AuthService", () => { it("should authenticate user") })', 'CR-001', 'active'),
  ('test', 'construction', 'build-and-test', 'Integration Tests', 'API integration tests for user endpoints', 'CR-002', 'active'),

  -- OPERATIONS Phase
  ('deployment', 'operations', 'deployment', 'Production Deployment', 'Deployed to production: 2026-02-09', 'CR-001', 'active'),
  ('documentation', 'operations', 'sprint-tracking', 'Sprint 1 Retro', 'Team velocity: 23 points. Authentication feature completed.', 'CR-001', 'active'),

  -- DECISIONS
  ('decision', 'construction', 'functional-design', 'Use JWT for Auth', '# Decision: JWT Tokens\n\nChose JWT over sessions for scalability', 'CR-001', 'active');

-- ============================================================================
-- PART 2: Sample Validations (After fixing persistence)
-- ============================================================================

INSERT OR IGNORE INTO validations (validation_type, status, score, file_path, violations, validated_at)
VALUES
  -- Passing validations
  ('iac', 'PASS', 100, 'infrastructure/main.tf', '[]', datetime('now', '-2 hours')),
  ('iac', 'PASS', 100, 'infrastructure/vpc.tf', '[]', datetime('now', '-1 hour')),
  ('guideline', 'PASS', 95, 'src/auth.js', '[]', datetime('now', '-30 minutes')),
  ('duplication', 'PASS', 90, 'src/utils.js', '[]', datetime('now', '-15 minutes')),

  -- Failing validations
  ('iac', 'FAIL', 0, 'infrastructure/bucket.tf', '[{"message":"Missing tags block for cost allocation"}]', datetime('now', '-3 hours')),
  ('iac', 'FAIL', 25, 'infrastructure/lambda.tf', '[{"message":"Resource name must use snake_case"}]', datetime('now', '-1 hour')),
  ('guideline', 'REVIEW', 70, 'src/user.js', '[{"message":"Consider extracting validation logic"}]', datetime('now', '-45 minutes')),
  ('security', 'FAIL', 30, 'src/api.js', '[{"message":"SQL injection risk - use parameterized queries"}]', datetime('now', '-20 minutes')),

  -- Recent validations
  ('iac', 'PASS', 100, 'infrastructure/api-gateway.tf', '[]', datetime('now', '-5 minutes')),
  ('guideline', 'PASS', 85, 'src/controllers/user.js', '[]', datetime('now', '-2 minutes'));

-- ============================================================================
-- PART 3: Verification
-- ============================================================================

-- Summary queries (run these to verify data)
SELECT '=== Sample Data Summary ===' as info;

SELECT 'Artifacts by Type' as report;
SELECT artifact_type, COUNT(*) as count
FROM artifacts
GROUP BY artifact_type
ORDER BY count DESC;

SELECT 'Artifacts by Phase' as report;
SELECT phase, COUNT(*) as count
FROM artifacts
GROUP BY phase
ORDER BY count DESC;

SELECT 'Validations by Type' as report;
SELECT validation_type, COUNT(*) as count
FROM validations
GROUP BY validation_type
ORDER BY count DESC;

SELECT 'Validations by Status' as report;
SELECT status, COUNT(*) as count
FROM validations
GROUP BY status
ORDER BY count DESC;

SELECT '=== Data population complete ===' as info;
