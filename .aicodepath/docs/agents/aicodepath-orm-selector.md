# Agent: aicodepath-orm-selector

**Model**: Opus  
**Phase**: Design (INCEPTION)  
**Permission Mode**: Plan (approval gate on file writes)

---

## What It Does

Recommends ORM/query builder frameworks and migration tools for new services and data layers. Produces a technology selection report with vendor comparison, monorepo migration schema design, and integration guidance.

---

## When to Invoke

Use this agent when:

- **Choosing ORM/query builder** for a new service or major technology migration (Node.js, Python, Java, Go, Rust, PHP)
- **Selecting migration framework** (Flyway, Liquibase, Knex, Alembic, Migrate, dbmate)
- **Designing monorepo migration strategy** with multiple services sharing databases or separate databases per service
- **Evaluating ORM replacement** (e.g., "Should we migrate from Sequelize to Prisma?")
- **Data access layer architecture** decisions during INCEPTION phase

---

## What Context to Provide

Prepare the following before invoking:

1. **Language and framework**  
   Example: "Node.js + Express", "Python + FastAPI", "Java + Spring Boot"

2. **Database target(s)**  
   Example: "PostgreSQL 15+", "MySQL 8.0", "DynamoDB"

3. **Scale requirements**  
   - Record count (millions, billions?)
   - Queries per second
   - Geographic distribution (single region, global)

4. **Team expertise**  
   - Familiarity with ORM patterns
   - SQL knowledge level
   - Preference for type safety

5. **Monorepo structure** (if applicable)  
   - Number of services
   - Database per service or shared?
   - Migration coordination model

6. **Constraints**  
   - License requirements (open source, commercial?)
   - Vendor preferences or lock-in concerns
   - Performance budgets

---

## What to Expect

The agent delivers:

### 1. ORM/Query Builder Recommendation

**Table comparing top 3 options**:
- Type safety (full, partial, none)
- Performance characteristics
- Query flexibility vs DSL constraints
- Community maturity
- License risk
- Monorepo readiness

**Selected recommendation** with documented rationale and trade-offs.

### 2. Migration Framework Recommendation

**Table comparing top 3 options**:
- Rollback support (full, forward-only, etc.)
- Auto-generation of migrations
- Database compatibility
- Language binding
- CI/CD integration

**Selected recommendation** with integration guide.

### 3. Monorepo Migration Schema

**SQL DDL** showing:
```sql
CREATE TABLE schema_migrations (
  migration_id VARCHAR(255) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  database VARCHAR(50) NOT NULL,
  environment VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  executed_at TIMESTAMPTZ NOT NULL,
  rollback_script TEXT,
  PRIMARY KEY (migration_id, service_name, database, environment)
);
```

**Coordination model**: Sequential, parallel per service, tenant-isolated, or custom

### 4. Integration Checklist

- [ ] ORM model definition format understood by the team
- [ ] Migration framework integrates with deployment pipeline
- [ ] Schema evolution patterns documented
- [ ] Connection pooling configured for production scale
- [ ] Transaction isolation levels match consistency requirements
- [ ] Monorepo migration table deployed before service migrations begin
- [ ] Team trained on ORM + migration workflow
- [ ] Vendor lock-in risks documented and accepted

### 5. Technology Decision Rationale

Paragraph summarizing why this combination was chosen, key trade-offs, and constraints that drove the decision.

---

## Output Example

```
## Data Access Layer Design Report

**Primary Language**: Node.js  
**Recommended ORM**: Prisma  
**Runner-up Options**: Drizzle, TypeORM  
**Recommended Migration Framework**: Prisma Migrate  

### ORM Recommendation

| Aspect | Prisma | Drizzle | TypeORM | Notes |
|--------|--------|---------|---------|-------|
| Type Safety | ✅ Full | ✅ Full | ⚠ Partial | All provide strong types via code generation |
| Performance | ✅ Good | ✅ Excellent | ⚠ Adequate | Prisma has small overhead; Drizzle is lightweight |
| Query Flexibility | ⚠ Limited DSL | ✅ Full SQL | ✅ Full SQL | Prisma constrains complex queries; alternatives support raw SQL |
| Learning Curve | ✅ Gentle | ⚠ Moderate | ⚠ Steep | Prisma schema is intuitive; TypeORM requires decorator knowledge |
| Monorepo Ready | ✅ Yes | ✅ Yes | ✅ Yes | All support workspace separation |

### Why Prisma

Prisma balances type safety, developer experience, and automatic migration generation. Its schema-driven model aligns with your team's preference for visual schema design. Drizzle is runner-up if you need maximum SQL control; TypeORM if you prefer decorator-based configuration.

[Rest of report...]
```

---

## Standards Enforced

- `guidelines/data-modeling-rules.json` — recommended ORM must support 3NF normalization and constraint enforcement
- `guidelines/database-operations-rules.json` — ORM pooling/transaction capabilities validated against operational requirements
- `orm-selection-rules.json` — ORM must support type safety or code generation, migrations must support rollbacks

---

## Collaborates With

- **`aicodepath-database-architect`** (upstream) — Schema design and indexing strategy
- **`aicodepath-backend-architect`** (peer) — Service architecture alignment
- **`aicodepath-security-engineer`** (peer) — Access control patterns compatible with chosen ORM
- **`aicodepath-performance-engineer`** (downstream) — Query optimization and pooling tuning
- **`aicodepath-code-reviewer`** (downstream) — ORM usage patterns and generated code review

---

## Common Scenarios

### Scenario 1: Monorepo with Independent Services

**Setup**: 5 microservices, each with own database, need synchronized migration strategy.

**What to provide**:
- List of services and their database types
- Whether migrations run in parallel or sequence
- Environment differences (dev, staging, prod)

**What agent delivers**:
- Per-service ORM recommendation (may differ if one service has special needs)
- Monorepo migration table design with `service_name` column
- CI/CD pipeline integration strategy

---

### Scenario 2: Evaluating ORM Replacement

**Setup**: Currently on Sequelize, evaluating Prisma migration. Need to understand effort and risk.

**What to provide**:
- Current ORM (Sequelize) and pain points
- Target ORM (Prisma)
- Codebase size (LOC, models count)
- Timeline constraints

**What agent delivers**:
- Migration path comparison (big bang vs gradual)
- Breaking changes analysis
- Coexistence strategy for phased migration

---

### Scenario 3: Greenfield Full-Stack Project

**Setup**: New project, choosing tech stack from scratch, including data access layer.

**What to provide**:
- Language decision (e.g., Node.js)
- Framework (e.g., Express)
- Scale targets
- Team experience level

**What agent delivers**:
- ORM recommendation tailored to team skill level
- Migration framework that integrates with deployment pipeline
- Initial project scaffolding guidance

---

## Tips for Best Results

1. **Be specific about constraints** — "PostgreSQL required for ACID", "No commercial licenses" — these drive the recommendation

2. **Mention vendor preferences** — "Avoid AWS-only services", "Prefer open source" — these matter for monorepo strategy

3. **Share scale realities** — "We expect 100M rows in users table within 2 years" — changes pooling and migration strategy

4. **Describe team culture** — "Team loves SQL, skeptical of ORMs" vs "Team prefers type safety and autogeneration" — influences recommendation weight

5. **Reference existing patterns** — "We use Prisma in frontend services, want to align data layer" — drives consistency

---

## See Also

- [Guideline: Database Operations Rules](../guidelines/database-operations-rules.md)
- [Guideline: Data Modeling Rules](../guidelines/data-modeling-rules.md)
- [Agent: Database Architect](./aicodepath-database-architect.md) — Schema design, indexing
- [Skill: SQL Query Optimization](../skills/sql-query-optimization/SKILL.md) — Query tuning
