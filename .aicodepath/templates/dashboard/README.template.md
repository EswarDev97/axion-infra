# AICodePath Dashboard

This is the AICodePath Control Tower - a real-time monitoring dashboard for your development workflow.

## Installation

This dashboard is automatically initialized in your project's `aicodepath-docs/dashboard/` directory when you run:

```bash
.aicodepath/scripts/init-knowledge-base.sh
```

Or initialize it separately:

```bash
.aicodepath/scripts/init-dashboard.sh
```

## Starting the Dashboard

### Option 1: Using AICodePath CLI (Recommended)

```bash
acp dashboard
```

This command automatically:
- Installs dependencies if needed
- Starts the API server (port 3001)
- Starts the Vite dev server (port 3899)
- Opens your browser

### Option 2: Using the Startup Script

```bash
cd aicodepath-docs/dashboard
./start.sh
```

### Option 3: Manual Start

```bash
cd aicodepath-docs/dashboard

# Install dependencies (first time only)
npm install

# Start the API server
npm run api &

# Start the dashboard UI
npm run dev
```

## Features

### 1. Live Event Feed
Real-time updates from your AICodePath workflow:
- **Agent logs** - What Claude is doing
- **Status updates** - Workflow phase transitions
- **Progress tracking** - Build and test progress
- **Artifact notifications** - Files created/modified

### 2. Visual Memory
AI-generated Mermaid diagrams for architecture understanding:
- **Flowcharts** - Process flows and logic
- **Sequence diagrams** - Component interactions
- **Class diagrams** - Data models and relationships
- **ER diagrams** - Database schemas
- **Smart staleness detection** - Diagrams update when source files change

### 3. Code Graph
Visualize your module dependencies:
- Interactive react-flow diagram
- Identify circular dependencies
- Highlight spaghetti code patterns

### 4. Kanban Board
Task and user story management:
- Drag-and-drop interface
- Sprint planning
- Story point tracking

### 5. Sprint Metrics
Track development progress:
- Burndown charts
- Velocity graphs
- Team performance analytics

## Architecture

### Frontend
- **Vite + React** - Fast, modern dev experience
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **D3.js** - Data visualization
- **Mermaid** - Diagram rendering

### Backend
- **Express.js** - API server
- **SQLite** - Knowledge base (via better-sqlite3)
- **WebSocket** - Real-time updates

### Database
The dashboard connects to your project's knowledge base at:
```
aicodepath-docs/aicodepath.db
```

## Configuration

### Ports
- **Dashboard UI**: 3899 (configurable in `vite.config.ts`)
- **API Server**: 3001 (configurable via PORT env var)

### Environment Variables
Create a `.env` file if you need custom configuration:
```bash
PORT=3001
VITE_API_URL=http://localhost:3001
```

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm run preview
```

### Testing the API

```bash
# Test API endpoints
curl http://localhost:3001/api/workflow-state
curl http://localhost:3001/api/events
curl http://localhost:3001/api/visual-memory
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3899

# Kill the process
kill -9 <PID>

# Or use a different port
npm run dev -- --port 3900
```

### Dashboard Not Loading

1. Ensure the knowledge base is initialized:
   ```bash
   .aicodepath/scripts/init-knowledge-base.sh
   ```

2. Check that the database exists:
   ```bash
   ls -l aicodepath-docs/aicodepath.db
   ```

3. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Visual Memory Diagrams Not Showing

1. Check that the visual memory tables exist:
   ```bash
   sqlite3 aicodepath-docs/aicodepath.db ".tables"
   ```

2. Initialize visual memory folder:
   ```bash
   node .aicodepath/lib/visual-memory-writer.js init
   ```

## More Information

- **Project Documentation**: See the main README.md
- **Visual Memory Guide**: See VISUAL_MEMORY_QUICKSTART.md
- **Deployment Guide**: See DEPLOYMENT.md
- **Testing Guide**: See TESTING.md

---

**Note**: This dashboard template lives in `aicodepath-tool/templates/dashboard/` and gets copied to your project's `aicodepath-docs/dashboard/` during initialization. The template is NOT part of the `.aicodepath/` plugin that gets copied to target projects.
