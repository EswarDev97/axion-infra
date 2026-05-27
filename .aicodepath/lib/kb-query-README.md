# Knowledge Base Query Tool

CLI tool for querying the AICodePath knowledge base and documentation.

## Quick Start

```bash
# View database statistics
npm run kb:stats

# Search for content
npm run kb:search -- "authentication"

# View recent decisions
npm run kb:decisions

# View workflow progress
npm run kb:progress

# List all artifacts
npm run kb:artifacts

# Export to markdown
npm run kb:export
```

## Direct Usage

```bash
# Show help
node .aicodepath/lib/kb-query.js --help

# Get statistics
node .aicodepath/lib/kb-query.js get-stats

# Search artifacts
node .aicodepath/lib/kb-query.js search "auth"

# Recent decisions (limit 5)
node .aicodepath/lib/kb-query.js recent-decisions -l 5

# Workflow progress
node .aicodepath/lib/kb-query.js workflow-progress

# List artifacts by phase
node .aicodepath/lib/kb-query.js artifacts inception
node .aicodepath/lib/kb-query.js artifacts construction

# Export to custom directory
node .aicodepath/lib/kb-query.js export-markdown -o ./export
```

## Features

### 1. Database Statistics
Shows overview of knowledge base content:
- Artifact counts by type
- Decision counts
- Link relationships
- Code entities
- Validation results

### 2. Full-Text Search
Uses FTS5 (Full-Text Search) to search across:
- Artifact titles
- Artifact content
- Decision text
- Change request numbers

### 3. Decision Tracking
View architectural and technical decisions:
- Recent decisions
- Decision status
- Decision dates

### 4. Workflow Progress
Track progress across phases:
- Inception phase
- Construction phase
- Operations phase

### 5. Artifact Management
List and filter artifacts:
- By phase
- By type
- By status
- With metadata

### 6. Export Capabilities
Export knowledge base to markdown:
- Organized by phase
- Preserves metadata
- Ready for documentation

## Database Location

```
./aicodepath-docs/aicodepath.db
```

## Database Schema

Key tables:
- `artifacts` - Documentation artifacts
- `decisions` - Technical decisions
- `links` - Traceability links
- `code_entities` - Code index
- `validations` - Validation results
- `workflow_state` - Phase tracking

## Integration

The tool integrates with:
- AICodePath workflow
- Claude Code MCP indexer
- SQLite FTS5 search
- Markdown export

## Examples

### Search for API documentation
```bash
npm run kb:search -- "API"
```

### View inception phase artifacts
```bash
npm run kb:artifacts -- inception
```

### Export for review
```bash
npm run kb:export
cd aicodepath-docs/export
ls -R
```

### Check workflow status
```bash
npm run kb:progress
```

## Notes

- Database must be initialized first: `npm run init-kb`
- FTS5 provides fast full-text search
- Exports preserve all metadata
- Progress views update automatically
