# MindFlow Database Governance

**Version:** 1.0.0
**Date:** 2026-01-25
**Status:** Active

---

## 1. Schema Authority

### Single Source of Truth
- **PostgreSQL database** is the authoritative schema definition
- **Alembic migrations** are the ONLY mechanism for schema changes
- **SQLAlchemy models** define the application's view of the database
- **Prisma schema** is read-only API layer mapping (NOT schema-authoritative)

### Ownership Matrix

| Layer | Purpose | Authoritative | Modifies Schema |
|-------|---------|---------------|-----------------|
| PostgreSQL | Data storage | YES | N/A (target) |
| Alembic | Migrations | YES | YES |
| SQLAlchemy | ORM models | NO | NO |
| Prisma | API gateway ORM | NO | NO |

---

## 2. Migration Rules

### MUST DO
1. **All schema changes through Alembic** - No exceptions
2. **Review migrations before running** - Check generated SQL
3. **Test migrations locally first** - Never run untested migrations in production
4. **Backup before production migrations** - Always have a rollback plan
5. **Use descriptive revision messages** - Future maintainers need context

### MUST NOT DO
1. **NO direct SQL in production** - Except emergency hotfixes (document immediately)
2. **NO `prisma migrate`** - Prisma is read-only
3. **NO `prisma db push`** - Will corrupt schema alignment
4. **NO manual table modifications** - All changes tracked in version control
5. **NO schema changes without PR review** - Requires approval

---

## 3. Change Procedure

### Standard Schema Change Process

```
1. Developer identifies schema change need
        ↓
2. Create Alembic migration:
   cd backend
   alembic revision -m "description_of_change"
        ↓
3. Implement upgrade() and downgrade() functions
        ↓
4. Test locally:
   alembic upgrade head
   alembic downgrade -1
   alembic upgrade head
        ↓
5. Update SQLAlchemy models to match
        ↓
6. Update Prisma schema (if API-facing):
   cd api-gateway
   npx prisma generate
        ↓
7. Create PR with:
   - Migration file
   - Model changes
   - Prisma schema changes
        ↓
8. PR Review → Approve → Merge
        ↓
9. Deploy migration in staging
        ↓
10. Deploy migration in production
```

### Emergency Hotfix Process

```
1. Document the emergency
        ↓
2. Apply minimal SQL fix
        ↓
3. IMMEDIATELY create retroactive Alembic migration
        ↓
4. Update all model layers
        ↓
5. Document in incident report
```

---

## 4. Command Reference

### Alembic Commands

```bash
# Navigate to backend directory
cd backend

# Create new migration
alembic revision -m "add_column_to_users"

# Auto-generate migration from model changes (use with caution)
alembic revision --autogenerate -m "auto_add_new_table"

# Apply all pending migrations
alembic upgrade head

# Downgrade one revision
alembic downgrade -1

# View migration history
alembic history

# View current revision
alembic current

# View pending migrations
alembic heads
```

### Prisma Commands (Read-Only Operations Only)

```bash
# Navigate to api-gateway directory
cd api-gateway

# Regenerate Prisma client (SAFE)
npx prisma generate

# Introspect database to update schema (USE WITH CAUTION)
npx prisma db pull

# FORBIDDEN - DO NOT USE
# npx prisma migrate dev     ← NEVER
# npx prisma db push         ← NEVER
```

---

## 5. Database Architecture

### Service Mapping (58 Tables)

| Service | Tables | Prefix |
|---------|--------|--------|
| Auth | 7 | tenants, users, roles, permissions, role_permissions, user_tenant_roles, sessions |
| HR | 9 | departments, positions, employees, leave_types, leave_balances, leave_requests, attendance_records, payroll_references, candidates |
| Task | 6 | tasks, task_statuses, task_assignees, task_comments, task_attachments, task_dependencies |
| Expense | 5 | expense_categories, expense_requests, expense_items, expense_receipts, payment_records |
| Approval | 5 | approval_workflows, approval_steps, approval_instances, approval_decisions, delegation_rules |
| Complaint | 6 | complaint_categories, sla_configurations, escalation_rules, complaints, complaint_actions, complaint_attachments |
| Training | 10 | courses, training_content, training_sessions, enrollments, training_attendance, exams, exam_questions, exam_attempts, exam_responses, certificates |
| Mindmap | 4 | mind_map_templates, mind_maps, mind_map_nodes, node_attachments |
| Notification | 2 | notifications, notification_preferences |
| Report | 3 | reports, report_parameters, report_executions |
| Storage | 1 | file_metadata |

### Multi-Tenancy

- All tenant-scoped tables have `tenant_id UUID NOT NULL`
- Row-Level Security (RLS) enabled on all tenant tables
- RLS policy: `tenant_id = current_tenant_id() OR is_super_admin()`
- Set tenant context: `SET app.current_tenant_id = 'uuid';`

---

## 6. Security Controls

### Row-Level Security (RLS)

RLS is enabled on all 58 application tables. Policies enforce:

1. **Tenant isolation** - Users can only access their tenant's data
2. **Super admin bypass** - System administrators can access all tenants
3. **Global data access** - System tables (permissions) are accessible to all

### Setting Tenant Context

```sql
-- In application code, set before queries:
SET app.current_tenant_id = 'tenant-uuid-here';

-- For super admin operations:
SET app.is_super_admin = 'true';
```

### Audit Trail

All sensitive tables should have:
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`
- `created_by UUID`
- `updated_by UUID`

---

## 7. Verification Checklist

### Pre-Deployment Checklist

- [ ] Migration tested locally (upgrade + downgrade + upgrade)
- [ ] SQLAlchemy models match migration
- [ ] Prisma schema updated (if API-facing)
- [ ] No breaking changes to existing data
- [ ] Indexes added for new columns used in queries
- [ ] Foreign keys have ON DELETE behavior defined
- [ ] RLS policy added for new tables
- [ ] PR reviewed and approved

### Post-Deployment Verification

```bash
# Check current migration version
docker exec -i axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "SELECT * FROM alembic_version;"

# Verify table count
docker exec -i axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"

# Check RLS status
docker exec -i axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;"

# List tables without tenant_id (should only be global tables)
docker exec -i axionpcs-postgres psql -U axionpcs -d axionpcs_db -c "
SELECT table_name FROM information_schema.tables t
WHERE table_schema = 'public'
AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.table_name
    AND c.column_name = 'tenant_id'
);"
```

---

## 8. Troubleshooting

### Common Issues

**Issue:** Prisma client out of sync
```bash
cd api-gateway
npx prisma generate
```

**Issue:** Migration conflict
```bash
# Check current head
alembic heads
# Merge heads if multiple
alembic merge -m "merge_heads" head1 head2
```

**Issue:** Failed migration rollback
```bash
# Downgrade to specific revision
alembic downgrade <revision_id>
# Then fix and re-apply
```

**Issue:** RLS blocking queries
```sql
-- Verify tenant context is set
SHOW app.current_tenant_id;
-- Set if missing
SET app.current_tenant_id = 'your-tenant-uuid';
```

---

## 9. Contact

For database-related questions or emergency support:

- **Primary:** Backend Team Lead
- **Secondary:** DevOps Team
- **Emergency:** On-call Engineer

---

## 10. Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-25 | 1.0.0 | Initial governance document |
