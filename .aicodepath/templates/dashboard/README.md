# AICodePath Dashboard

Real-time monitoring and workflow management dashboard for AICodePath.

## Features

- **Monitor View**: Real-time metrics for agents, validations, and artifacts
- **Kanban Board**: Visual workflow state management with drag-and-drop (future)
- **Dependency Graph**: Code entity relationships and dependencies
- **Visual Memory** 🧠: Interactive Mermaid diagram viewer with filtering and live rendering
- **Auto-refresh**: Polls database every 3 seconds for live updates

## Architecture

### Frontend (React + TypeScript + Vite)
- **Port**: 3899 (default)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Polling**: Custom `useDatabase` hook with 3s interval

### Backend (Express + SQLite)
- **Port**: 3001 (default)
- **Database**: Read-only access to `aicodepath-docs/aicodepath.db`
- **API Endpoints**:
  - `/api/health` - Health check
  - `/api/workflow-state` - Workflow tasks for Kanban
  - `/api/agent-status` - Agent execution status
  - `/api/validations` - Validation results
  - `/api/validation-summary` - Aggregated validation stats
  - `/api/artifacts` - Artifact listing
  - `/api/artifact-stats` - Artifact statistics
  - `/api/code-entities` - Code entities for dependency graph
  - `/api/code-relations` - Code relations/dependencies
  - `/api/session-history` - Session event history
  - `/api/design-violations` - Design pattern violations
  - `/api/overview` - Dashboard overview metrics
  - `/api/visual-memory` - Visual diagrams listing
  - `/api/visual-memory/stats` - Visual Memory statistics
  - `/api/visual-memory/regenerate/:id` - Regenerate diagram

## Installation

```bash
cd .aicodepath/dashboard
npm install
```

## Development

### Start API Server Only
```bash
npm run api
```

### Start Frontend Only
```bash
npm run dev
```

### Start Both (Recommended)
```bash
# From project root
node .aicodepath/commands/dashboard.js

# Or with custom ports
node .aicodepath/commands/dashboard.js --port 4000 --api-port 4001

# Without auto-opening browser
node .aicodepath/commands/dashboard.js --no-browser
```

## Database Schema

The dashboard reads from these tables:

- `workflow_state` - Task workflow management
- `agent_status` - Agent execution status
- `validations` - Validation results
- `artifacts` - Generated artifacts
- `code_entities` - Code structure analysis
- `code_relations` - Dependency relationships
- `session_history` - Event tracking
- `design_violations` - Pattern violations

## Configuration

### Vite Config (`vite.config.ts`)
- Default port: 3899
- API proxy: `/api` → `http://localhost:3001`

### API Server (`api/server.js`)
- Default port: 3001
- Database: `../../aicodepath-docs/aicodepath.db` (relative)
- Read-only mode for safety

## Components

### `MonitorView.tsx`
Shows real-time metrics:
- Overview cards (workflows, artifacts, validations, active agents)
- Agent status with progress bars
- Validation results with charts
- Artifact statistics

### `KanbanBoard.tsx`
Displays workflow tasks organized by status (pending, in_progress, completed, blocked, skipped).

### `DependencyGraph.tsx`
Visualizes code dependencies:
- Code entity listing with filters
- Entity details and relations
- Relation type summary

### `VisualMemoryView.tsx` 🧠
Interactive Mermaid diagram viewer:
- Live diagram rendering with mermaid.js
- Stats overview (total, fresh/stale counts, avg confidence)
- Advanced filtering (type, staleness, search, sort)
- Diagram detail modal with metadata
- Copy to clipboard and regenerate actions
- Glassmorphic dark theme with neural grid background

### `useDatabase.ts` Hook
Custom polling hook that:
- Fetches data from API endpoints
- Auto-refreshes every 3 seconds
- Handles loading and error states
- Returns `{ data, loading, error, refetch }`

## Build for Production

```bash
npm run build
npm run preview
```

## Troubleshooting

### Port Already in Use
```bash
# Change dashboard port
node .aicodepath/commands/dashboard.js --port 3900

# Change API port
node .aicodepath/commands/dashboard.js --api-port 3002
```

### Database Not Found
Ensure `aicodepath-docs/aicodepath.db` exists:
```bash
ls -la ../../aicodepath-docs/aicodepath.db
```

### Dependencies Not Installed
```bash
cd .aicodepath/dashboard
rm -rf node_modules package-lock.json
npm install
```

### API Not Responding
Check if API server is running:
```bash
curl http://localhost:3001/api/health
```

## Technology Stack

- **React** 18.2.0 - UI framework
- **TypeScript** 5.2.2 - Type safety
- **Vite** 5.0.8 - Build tool
- **Tailwind CSS** 3.3.6 - Styling
- **Recharts** 2.10.3 - Charts and visualizations
- **Mermaid** 10.6.1 - Diagram rendering
- **Express** 4.18.2 - API server
- **better-sqlite3** 9.2.2 - Database access
- **CORS** 2.8.5 - Cross-origin support

## Visual Memory Feature

For complete documentation on the Visual Memory view, see:
- **[VISUAL_MEMORY_FEATURE.md](VISUAL_MEMORY_FEATURE.md)** - Complete feature documentation
- **Setup**: Run `./setup-visual-memory.sh` to verify installation

### Quick Start

1. Ensure diagrams exist in database:
   ```bash
   node ../../hooks/visual-memory-generator.js --type all
   ```

2. Start dashboard:
   ```bash
   node ../../.aicodepath/commands/dashboard.js
   ```

3. Navigate to http://localhost:3899 and click 🧠 Visual Memory tab

## Future Enhancements

- [ ] Drag-and-drop for Kanban board
- [ ] WebSocket support for real-time updates
- [ ] Interactive dependency graph visualization
- [ ] Export diagrams as PNG/SVG
- [ ] Diagram zoom/pan controls
- [ ] User authentication
- [ ] Custom dashboard layouts
- [ ] Alert notifications
- [ ] Historical data charts
