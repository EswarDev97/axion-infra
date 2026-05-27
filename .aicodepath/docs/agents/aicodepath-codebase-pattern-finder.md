---
name: aicodepath-codebase-pattern-finder
pack: core
model: haiku
---

## When to Use

Exploring a brownfield codebase for existing patterns, conventions, or implementation examples — finds similar code, usage patterns, test examples, and component structures to inform new development without critiquing what exists.

## Triggers

`find patterns`, `brownfield`, `how is X done`, `existing patterns`, `codebase conventions`, `pattern catalog`, `similar implementation`, `usage examples`, `convention discovery`

## Key Capabilities

- Find similar feature implementations across the codebase with file:line references and frequency counts
- Extract structural patterns: module organization, naming conventions, configuration patterns
- Locate test examples alongside production code to establish what testing patterns are in use
- Produce pattern catalogs showing 2–3 variations if they exist — neutral, no evaluation or recommendations
- Search across API patterns, data patterns, component patterns, and testing patterns
- Read-only agent — never modifies files, never makes recommendations unless explicitly asked

## Domain Keywords

`pattern-catalog`, `brownfield-patterns`, `codebase-archaeology`, `usage-examples`, `convention-discovery`, `implementation-patterns`

## Collaborates With

- `aicodepath-architect` — Pattern-informed architecture decisions
- `aicodepath-refactoring-expert` — Pattern consolidation opportunities
- `aicodepath-code-simplifier` — Pattern standardization across codebase
