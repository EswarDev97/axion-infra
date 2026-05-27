# Data Model — RE Template

## Route Gate

**Included in routes**:
- `greenfield`: SKIP — no existing codebase to analyze
- `brownfield-shallow`: SKIP — shallow route covers docs 1–5 only
- `brownfield-deep`: INCLUDE

If `re_route` = `greenfield`: stop here, do not generate this document.
If `re_route` = `brownfield-shallow`: stop here, do not generate this document.

---

## Frontmatter

When generating output, populate this frontmatter:

```yaml
---
repo: <git remote name or directory name>
repo_url: <git remote url>
branch: <current branch>
commit: <HEAD short hash>
generated_at: <ISO timestamp>
data_source: graph|llm-only
route: <re_route value>
---
```

---

## Instructions

Output file: `aicodepath-docs/inception/reverse-engineering/06-data-model.md`

### Graph Data Collection [DATA SOURCE: graph]

If `mcp__aicodepath-code-graph__search_entities` and `mcp__aicodepath-code-graph__callees_of` are available, call:

```
mcp__aicodepath-code-graph__search_entities(query="Model Entity Table Schema BaseModel", limit=20)
mcp__aicodepath-code-graph__search_entities(query="Repository DAO Store Mapper", limit=20)
mcp__aicodepath-code-graph__callees_of(qualified_name="<UserRepository or primary repo>", max_depth=1)
mcp__aicodepath-code-graph__callees_of(qualified_name="<OrderRepository or secondary repo>", max_depth=1)
```

Use entity results to identify ORM models and their fields. Use `callees_of` on repositories to find which query methods they expose.

If MCP server is unavailable, skip to LLM-only analysis below.

---

### Document Sections

#### Section 1: Data Store Identification [DATA SOURCE: llm-only]

Enumerate all data stores this system reads from or writes to:

For each store, record:
| Store Name | Type | Technology | Connection Config Location | Purpose |
|------------|------|-----------|--------------------------|---------|

Derive from: environment variable names (`DATABASE_URL`, `REDIS_URL`, `MONGO_URI`), config files, migration directories, ORM config files (`alembic.ini`, `ormconfig.json`, `prisma/schema.prisma`), connection pooling setup.

---

#### Section 2: Entity/Model Catalog [DATA SOURCE: graph|llm-only]

**Graph path**: From `search_entities` ORM results, extract all model classes. For each, call `file_summary` to get field definitions and relationships.

**LLM-only path**: Locate model definition files (patterns: `models/`, `entities/`, `schema.prisma`, `*.model.ts`, `*_model.py`). For each model, extract fields, types, and relationship decorators.

For each entity, document:

```
**Entity: <ModelName>**
- Table/Collection: <name>
- Fields:
  | Field | Type | Nullable | Default | Notes |
  |-------|------|----------|---------|-------|
- Relationships:
  | Related Entity | Type (1:1/1:N/M:N) | FK Field | Cascade |
  |---------------|-------------------|----------|---------|
- Indexes: <list unique, composite, and partial indexes>
- Constraints: <unique constraints, check constraints>
```

---

#### Section 3: Database Schema Evolution [DATA SOURCE: llm-only]

Examine migration files to understand schema evolution:
- Migration tool: Alembic, Flyway, Liquibase, Prisma migrate, Active Record, knex, golang-migrate
- Total migration count (indicator of schema maturity)
- Most recent migrations (last 5) — what changed?
- Rollback capability: do migrations have down() functions?
- Outstanding migrations: any migrations not yet applied to known environments?

List the last 5 migration descriptions and flag any that represent breaking schema changes (column drops, type changes, NOT NULL additions to existing tables).

---

#### Section 4: Data Access Patterns [DATA SOURCE: graph|llm-only]

**Graph path**: From `callees_of` on repository classes, identify all query methods (find, findAll, findById, findWhere, aggregate, etc.). Note which use raw SQL vs. ORM methods.

**LLM-only path**: Read repository/DAO files. Identify:
- Queries that lack pagination (potential performance issue at scale)
- N+1 query patterns (loop with single-record fetch inside)
- Raw SQL strings (potential injection risk if not parameterized)
- Missing indexes inferred from query patterns (queries on non-indexed columns)
- Soft delete patterns (`deleted_at` field) vs. hard deletes

---

#### Section 5: Data Lifecycle and Retention [DATA SOURCE: llm-only]

Identify data management policies from code and config:
- **Archival**: scheduled jobs that move old records to archive tables or cold storage
- **Deletion**: GDPR/CCPA deletion handlers, cascade delete configurations
- **Auditing**: audit log tables, `created_at`/`updated_at`/`created_by`/`updated_by` fields
- **Versioning**: event sourcing patterns, audit trail tables, row versioning
- **Encryption at rest**: encrypted column types, encryption-at-rest config

If none found, state: "No explicit data lifecycle policies identified. Recommend defining retention and deletion policies."

---

#### Section 6: Data Model Risk Assessment

Flag the following risks:
- Entities with more than 30 fields (potential God Object)
- M:N relationships without explicit join table (implicit ORM through-tables that may surprise)
- Missing `updated_at` on mutable entities (no change tracking)
- Unindexed foreign keys (join performance risk)
- Enum values stored as magic integers or raw strings (maintainability risk)
- No soft-delete on entities that should be auditable

Provide a prioritized risk table with recommended fixes.

Set `data_source` in frontmatter to `graph` if MCP ORM entity search was used, otherwise `llm-only`.
