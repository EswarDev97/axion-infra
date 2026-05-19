# MindFlow Database Audit Report

**Date**: 2026-01-25
**Auditor**: Claude Code Builder
**Audit ID**: DB-AUDIT-001

---

## Executive Summary

| Category | Total Checked | Issues Found | Critical | Warning | Info |
|----------|---------------|--------------|----------|---------|------|
| Databases | 1 | 0 | 0 | 0 | 0 |
| Tables | 59 expected | 37 missing | 37 | 0 | 0 |
| Migrations | 11 services | 9 missing | 9 | 2 | 0 |
| Connections | 11 services | 0 | 0 | 0 | 0 |
| Schemas | 22 tables | 1 | 0 | 1 | 0 |
| RLS Policies | 22 tables | 22 | 0 | 22 | 0 |

**Overall Status**: CRITICAL - 37 missing tables across 9 services will cause 500 errors

---

## Critical Issues (BLOCKING)

### Issue 1: Missing Tables for Expense Module (5 tables)
- **Service**: expense-service
- **Problem**: No tables exist for expense management
- **Missing Tables**:
  - `expense_requests`
  - `expense_items`
  - `expense_categories`
  - `expense_receipts`
  - `payment_records`
- **Evidence**: `grep "__tablename__"` shows models exist, `\dt` shows no tables
- **Impact**: Expense module completely non-functional (500 errors)
- **Recommended Fix**: Create SQL migration for all 5 tables

### Issue 2: Missing Tables for Approval Module (5 tables)
- **Service**: approval-service
- **Problem**: No tables exist for approval workflows
- **Missing Tables**:
  - `approval_workflows`
  - `approval_steps`
  - `approval_instances`
  - `approval_decisions`
  - `delegation_rules`
- **Evidence**: Models in `backend/services/approval/models/` but no DB tables
- **Impact**: Approval module completely non-functional (500 errors)
- **Recommended Fix**: Create SQL migration for all 5 tables

### Issue 3: Missing Tables for Complaint Module (6 tables)
- **Service**: complaint-service
- **Problem**: No tables exist for complaint management
- **Missing Tables**:
  - `complaints`
  - `complaint_categories`
  - `complaint_actions`
  - `complaint_attachments`
  - `escalation_rules`
  - `sla_configurations`
- **Evidence**: Models exist in `backend/services/complaint/models/`
- **Impact**: Complaint module completely non-functional (500 errors)
- **Recommended Fix**: Create SQL migration for all 6 tables

### Issue 4: Missing Tables for Training Module (10 tables)
- **Service**: training-service
- **Problem**: No tables exist for training/LMS functionality
- **Missing Tables**:
  - `courses`
  - `enrollments`
  - `certificates`
  - `exams`
  - `exam_questions`
  - `exam_attempts`
  - `exam_responses`
  - `training_sessions`
  - `training_content`
  - `training_attendance`
- **Evidence**: Models exist in `backend/services/training/models/`
- **Impact**: Training module completely non-functional (500 errors)
- **Recommended Fix**: Create SQL migration for all 10 tables

### Issue 5: Missing Tables for Mindmap Module (4 tables)
- **Service**: mindmap-service
- **Problem**: No tables exist for mind mapping functionality
- **Missing Tables**:
  - `mind_maps`
  - `mind_map_nodes`
  - `mind_map_templates`
  - `node_attachments`
- **Evidence**: Models exist in `backend/services/mindmap/models/`
- **Impact**: Mindmap module completely non-functional (500 errors)
- **Recommended Fix**: Create SQL migration for all 4 tables

### Issue 6: Missing Tables for Notification Module (2 tables)
- **Service**: notification-service
- **Problem**: No tables exist for notifications
- **Missing Tables**:
  - `notifications`
  - `notification_preferences`
- **Evidence**: Models exist in `backend/services/notification/models/`
- **Impact**: Notification module completely non-functional (500 errors)
- **Recommended Fix**: Create SQL migration for all 2 tables

### Issue 7: Missing Tables for Report Module (3 tables)
- **Service**: report-service
- **Problem**: No tables exist for reporting functionality
- **Missing Tables**:
  - `reports`
  - `report_parameters`
  - `report_executions`
- **Evidence**: Models exist in `backend/services/report/models/report.py`
- **Impact**: Report module completely non-functional (500 errors)
- **Recommended Fix**: Create SQL migration for all 3 tables

### Issue 8: Missing Tables for Storage Module (1 table)
- **Service**: storage-service
- **Problem**: No table exists for file metadata
- **Missing Tables**:
  - `file_metadata`
- **Evidence**: Model exists in `backend/services/storage/models/file_metadata.py`
- **Impact**: File upload metadata not persisted (partial functionality)
- **Recommended Fix**: Create SQL migration for 1 table

### Issue 9: Missing Prisma Tables from Schema (varies)
- **Service**: api-gateway
- **Problem**: Prisma schema defines tables not in database
- **Missing Tables** (from Prisma schema):
  - `refresh_tokens`
  - `otp_codes`
  - `user_roles` (different from `user_tenant_roles`)
  - `attendances` (Prisma) vs `attendance_records` (SQLAlchemy)
  - `leaves` (Prisma) vs `leave_requests` (SQLAlchemy)
  - `salary_structures`
  - `payrolls`
  - `documents`
  - `job_postings`
  - `job_applications`
  - `announcements`
  - `holidays`
  - `contact_inquiries`
  - `audit_logs`
- **Evidence**: Prisma schema.prisma defines these models but no migrations exist
- **Impact**: API Gateway Prisma queries will fail for these entities
- **Recommended Fix**: Reconcile Prisma schema with actual database

---

## Warning Issues (NON-BLOCKING)

### Warning 1: Row-Level Security Not Enabled
- **All 22 Tables**
- **Problem**: RLS policies defined in Alembic migrations but never applied
- **Evidence**: `pg_policies` returns 0 rows; `relrowsecurity = f` for all tables
- **Impact**: Multi-tenant isolation not enforced at database level
- **Note**: Application-level tenant filtering may be in place as workaround
- **Recommended Fix**: Enable RLS and apply policies for production security

### Warning 2: No Migration Tracking
- **Problem**: Neither `alembic_version` nor `_prisma_migrations` table exists
- **Evidence**: Both queries return errors
- **Impact**: Cannot track which migrations have been applied
- **Recommended Fix**: Establish migration tracking system

### Warning 3: Dual ORM Architecture Mismatch
- **Problem**: API Gateway uses Prisma, Python services use SQLAlchemy
- **Evidence**: Table naming differences:
  - Prisma: `attendances` vs SQLAlchemy: `attendance_records`
  - Prisma: `leaves` vs SQLAlchemy: `leave_requests`
  - Prisma: `user_roles` vs SQLAlchemy: `user_tenant_roles`
- **Impact**: Potential confusion and sync issues
- **Recommended Fix**: Standardize table names or maintain strict mapping

---

## Database Inventory

| Database | Services Using It | Tables | Status |
|----------|-------------------|--------|--------|
| axionpcs_db | All 11 Python services + API Gateway | 22 | Shared |

**Connection String**: `postgresql+asyncpg://axionpcs:axionpcs_secret@postgres:5432/axionpcs_db`

---

## Service-by-Service Status

### Auth Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: tenants, users, roles, permissions, role_permissions, user_tenant_roles, sessions
- **Tables Found**: ALL 7 tables exist
- **Migration Status**: Migration file exists (`20260116_000001_initial_auth_schema.py`) but was NOT run via Alembic
- **Issues**: None (tables created manually)

### HR Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: departments, positions, employees, leave_types, leave_balances, leave_requests, attendance_records, payroll_references, candidates
- **Tables Found**: ALL 9 tables exist
- **Migration Status**: Migration file exists (`20260116_000002_initial_hr_schema.py`) but was NOT run via Alembic
- **Issues**: None (tables created manually)

### Task Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: tasks, task_statuses, task_assignees, task_comments, task_attachments, task_dependencies
- **Tables Found**: ALL 6 tables exist (created via SQL in ERR-FIX-009)
- **Migration Status**: Empty migrations/versions directory
- **Issues**: None (tables created manually)

### Expense Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: expense_requests, expense_items, expense_categories, expense_receipts, payment_records
- **Tables Found**: NONE (0 of 5)
- **Migration Status**: No migrations directory
- **Issues**: CRITICAL - All 5 tables missing

### Approval Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: approval_workflows, approval_steps, approval_instances, approval_decisions, delegation_rules
- **Tables Found**: NONE (0 of 5)
- **Migration Status**: No migrations directory
- **Issues**: CRITICAL - All 5 tables missing

### Complaint Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: complaints, complaint_categories, complaint_actions, complaint_attachments, escalation_rules, sla_configurations
- **Tables Found**: NONE (0 of 6)
- **Migration Status**: No migrations directory
- **Issues**: CRITICAL - All 6 tables missing

### Training Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: courses, enrollments, certificates, exams, exam_questions, exam_attempts, exam_responses, training_sessions, training_content, training_attendance
- **Tables Found**: NONE (0 of 10)
- **Migration Status**: No migrations directory
- **Issues**: CRITICAL - All 10 tables missing

### Mindmap Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: mind_maps, mind_map_nodes, mind_map_templates, node_attachments
- **Tables Found**: NONE (0 of 4)
- **Migration Status**: No migrations directory
- **Issues**: CRITICAL - All 4 tables missing

### Notification Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: notifications, notification_preferences
- **Tables Found**: NONE (0 of 2)
- **Migration Status**: No migrations directory
- **Issues**: CRITICAL - All 2 tables missing

### Report Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: reports, report_parameters, report_executions
- **Tables Found**: NONE (0 of 3)
- **Migration Status**: No migrations directory
- **Issues**: CRITICAL - All 3 tables missing

### Storage Service
- **Database**: axionpcs_db (shared)
- **Tables Expected**: file_metadata
- **Tables Found**: NONE (0 of 1)
- **Migration Status**: Empty migrations/versions directory
- **Issues**: CRITICAL - 1 table missing

---

## Migration Status Matrix

| Service | Migrations Dir | alembic.ini | Migration Files | DB Has Table? | Notes |
|---------|---------------|-------------|-----------------|---------------|-------|
| auth | Yes | Yes | 1 file | Yes | Tables created manually |
| hr | Yes | Yes | 1 file | Yes | Tables created manually |
| task | Yes | No | 0 files | Yes | Tables created via SQL |
| expense | No | No | N/A | No | NEEDS MIGRATION |
| approval | No | No | N/A | No | NEEDS MIGRATION |
| complaint | No | No | N/A | No | NEEDS MIGRATION |
| training | No | No | N/A | No | NEEDS MIGRATION |
| mindmap | No | No | N/A | No | NEEDS MIGRATION |
| notification | No | No | N/A | No | NEEDS MIGRATION |
| report | No | No | N/A | No | NEEDS MIGRATION |
| storage | Yes | No | 0 files | No | NEEDS MIGRATION |

---

## Missing Tables Summary

| Service | Missing Table | Model File | Priority |
|---------|--------------|------------|----------|
| expense | expense_requests | expense_request.py | CRITICAL |
| expense | expense_items | expense_item.py | CRITICAL |
| expense | expense_categories | expense_category.py | CRITICAL |
| expense | expense_receipts | expense_receipt.py | CRITICAL |
| expense | payment_records | payment_record.py | CRITICAL |
| approval | approval_workflows | workflow.py | CRITICAL |
| approval | approval_steps | step.py | CRITICAL |
| approval | approval_instances | instance.py | CRITICAL |
| approval | approval_decisions | decision.py | CRITICAL |
| approval | delegation_rules | delegation.py | CRITICAL |
| complaint | complaints | complaint.py | CRITICAL |
| complaint | complaint_categories | category.py | CRITICAL |
| complaint | complaint_actions | complaint_action.py | CRITICAL |
| complaint | complaint_attachments | complaint_attachment.py | CRITICAL |
| complaint | escalation_rules | escalation_rule.py | CRITICAL |
| complaint | sla_configurations | sla_config.py | CRITICAL |
| training | courses | course.py | CRITICAL |
| training | enrollments | enrollment.py | CRITICAL |
| training | certificates | certificate.py | CRITICAL |
| training | exams | exam.py | CRITICAL |
| training | exam_questions | exam_question.py | CRITICAL |
| training | exam_attempts | exam_attempt.py | CRITICAL |
| training | exam_responses | exam_response.py | CRITICAL |
| training | training_sessions | training_session.py | CRITICAL |
| training | training_content | training_content.py | CRITICAL |
| training | training_attendance | training_attendance.py | CRITICAL |
| mindmap | mind_maps | mind_map.py | CRITICAL |
| mindmap | mind_map_nodes | mind_map_node.py | CRITICAL |
| mindmap | mind_map_templates | mind_map_template.py | CRITICAL |
| mindmap | node_attachments | node_attachment.py | CRITICAL |
| notification | notifications | notification.py | CRITICAL |
| notification | notification_preferences | preference.py | CRITICAL |
| report | reports | report.py | CRITICAL |
| report | report_parameters | report.py | CRITICAL |
| report | report_executions | report.py | CRITICAL |
| storage | file_metadata | file_metadata.py | CRITICAL |

**Total Missing Tables: 37**

---

## Existing Tables (22)

| Table | Service | Has Data | tenant_id | FK Count |
|-------|---------|----------|-----------|----------|
| tenants | auth | 1 row | N/A | 0 |
| users | auth | 1 row | Yes | 1 |
| roles | auth | 1+ rows | Yes | 3 |
| permissions | auth | rows | No | 0 |
| role_permissions | auth | 0 rows | Yes | 4 |
| user_tenant_roles | auth | 1+ rows | Yes | 5 |
| sessions | auth | rows | Yes | 2 |
| departments | hr | 3+ rows | Yes | 5 |
| positions | hr | 4+ rows | Yes | 4 |
| employees | hr | 7 rows | Yes | 7 |
| leave_types | hr | rows | Yes | 3 |
| leave_balances | hr | 0 rows | Yes | 3 |
| leave_requests | hr | rows | Yes | 7 |
| attendance_records | hr | rows | Yes | 2 |
| payroll_references | hr | 0 rows | Yes | 4 |
| candidates | hr | rows | Yes | 4 |
| tasks | task | rows | Yes | 5 |
| task_statuses | task | 6 rows | Yes | 3 |
| task_assignees | task | 0 rows | Yes | 4 |
| task_comments | task | rows | Yes | 5 |
| task_attachments | task | 0 rows | Yes | 3 |
| task_dependencies | task | 0 rows | Yes | 4 |

---

## Schema Compatibility Issues

| Issue | Prisma Name | SQLAlchemy Name | Status |
|-------|-------------|-----------------|--------|
| Table naming | `attendances` | `attendance_records` | MISMATCH |
| Table naming | `leaves` | `leave_requests` | MISMATCH |
| Table naming | `user_roles` | `user_tenant_roles` | MISMATCH |
| Missing in DB | `refresh_tokens` | N/A | PRISMA ONLY |
| Missing in DB | `otp_codes` | N/A | PRISMA ONLY |
| Missing in DB | `salary_structures` | N/A | PRISMA ONLY |
| Missing in DB | `payrolls` | N/A | PRISMA ONLY |
| Missing in DB | `documents` | N/A | PRISMA ONLY |
| Missing in DB | `job_postings` | N/A | PRISMA ONLY |
| Missing in DB | `job_applications` | N/A | PRISMA ONLY |
| Missing in DB | `announcements` | N/A | PRISMA ONLY |
| Missing in DB | `holidays` | N/A | PRISMA ONLY |
| Missing in DB | `contact_inquiries` | N/A | PRISMA ONLY |
| Missing in DB | `audit_logs` | N/A | PRISMA ONLY |

---

## Recommendations

### Immediate (CRITICAL)

1. **Create Missing Tables for All 9 Services**
   - Priority Order: expense, approval, notification, complaint, report, training, mindmap, storage
   - Method: Direct SQL execution in postgres container (fastest)
   - Alternative: Create proper Alembic migrations for each service

2. **Seed Required Reference Data**
   - Each module may need default statuses, categories, types
   - Follow pattern used for task_statuses

### Short-term (WARNING)

3. **Enable Row-Level Security**
   - Apply RLS policies defined in migration files
   - Critical for multi-tenant production deployment

4. **Establish Migration Tracking**
   - Choose one system: Prisma OR Alembic (not both)
   - Create baseline migration with current schema state

5. **Reconcile Prisma/SQLAlchemy Schema**
   - Decide on canonical table names
   - Update either Prisma schema or SQLAlchemy models

### Long-term (INFO)

6. **Consolidate Database Management**
   - Consider single ORM approach across all services
   - Or formalize the hybrid approach with clear boundaries

7. **Add Database Schema Validation to CI/CD**
   - Automated checks for missing tables
   - Schema drift detection

---

## Raw Diagnostic Output

### Tables in Database
```
attendance_records, candidates, departments, employees, leave_balances,
leave_requests, leave_types, payroll_references, permissions, positions,
role_permissions, roles, sessions, task_assignees, task_attachments,
task_comments, task_dependencies, task_statuses, tasks, tenants,
user_tenant_roles, users
```

### Services Running
```
All 11 Python services: healthy
API Gateway: healthy
Frontend: healthy
PostgreSQL: healthy
Redis: healthy
MinIO: healthy
```

### Tenant Data
```
ID: f47ac10b-58cc-4372-a567-0e02b2c3d479
Name: AxionPCS
Slug: axionpcs
Status: ACTIVE
```

---

## Sign-off

- [x] Database infrastructure mapped
- [x] Migration status audited
- [x] Table existence verified
- [x] Schema compatibility checked
- [x] Docker connectivity verified
- [x] Initialization scripts reviewed
- [x] Comprehensive report generated

**DB-AUDIT-001 COMPLETED**

---

## Appendix: Expected Table Count by Service

| Service | Expected | Existing | Missing |
|---------|----------|----------|---------|
| auth | 7 | 7 | 0 |
| hr | 9 | 9 | 0 |
| task | 6 | 6 | 0 |
| expense | 5 | 0 | 5 |
| approval | 5 | 0 | 5 |
| complaint | 6 | 0 | 6 |
| training | 10 | 0 | 10 |
| mindmap | 4 | 0 | 4 |
| notification | 2 | 0 | 2 |
| report | 3 | 0 | 3 |
| storage | 1 | 0 | 1 |
| **TOTAL** | **58** | **22** | **36** |

*Note: Task tables were created manually via SQL during ERR-FIX-009*
