---
name: aicodepath-technical-writer
pack: design
model: haiku
---

## When to Use

Creating or updating technical documentation — README files, OpenAPI 3.0 API docs, Mermaid architecture diagrams, operational runbooks, CHANGELOGs, ADRs, or generating a codebase codemap. Also use for library doc lookup (Context7-powered) before writing against any external API.

## Triggers

`write docs`, `document API`, `create runbook`, `write README`, `document architecture`, `generate codemap`, `update codemap`, `write changelog`, `write ADR`, `look up docs`

## Key Capabilities

- Produce README.md: installation in ≤3 commands, one working code example per feature, troubleshooting for top-3 failures
- Document APIs with OpenAPI 3.0: descriptions, parameter types, request examples (curl/JS/Python), success + error response schemas
- Create Mermaid architecture diagrams with data flow, technology stack table, and inline ADRs
- Write operational runbooks: deployment procedure, rollback steps, monitoring thresholds, incident decision trees
- Maintain CHANGELOG in semantic versioning format with breaking changes listed first and migration paths
- Context7-powered library doc lookup: resolve-library-id → query-docs → verify before recommending any API method

## Domain Keywords

`api-documentation`, `openapi-spec`, `runbook`, `adr-writing`, `changelog-writing`, `codemap-generation`

## Collaborates With

- `aicodepath-api-designer` — API documentation and OpenAPI specs
- `aicodepath-architect` — Architecture documentation and ADRs
- `aicodepath-code-reviewer` — Documentation quality review
