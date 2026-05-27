# aicodepath-database-architect

**Model**: sonnet | **Phase**: INCEPTION/early CONSTRUCTION | **Type**: Read + Write + Bash (migrations)

Specialist in relational schema design, index strategy, polyglot persistence, and migration versioning.

## When to Invoke

- Designing a database schema for a new domain or major refactor
- Choosing between SQL and NoSQL (or polyglot) persistence
- Planning index strategy for expected query patterns
- Writing or reviewing migration scripts
- Planning sharding, partitioning, or replication topology

## What to Provide

- Functional requirements listing all entities and relationships
- Expected query patterns (read-heavy, write-heavy, analytical)
- Scale targets (rows, QPS, growth rate)

## What to Expect

- ERD with Mermaid diagram
- DDL schema with constraints, indexes, and foreign keys
- Technology selection with rationale
- Migration script outline with rollback strategy

## Standards Enforced

- guidelines/data-modeling-rules.json

## Integration

- **DOMAIN_MAPPING**: `database`, `migration`, `sql`, `schema`, `index`
- **Taxonomy**: `database` component type, `design` phase
