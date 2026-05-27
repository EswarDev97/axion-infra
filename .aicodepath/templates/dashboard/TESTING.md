# Dashboard Testing Guide

## Quick Start

### Option 1: Use Startup Script (Recommended)
```bash
cd .aicodepath/dashboard
./start.sh
```

### Option 2: Use CLI Command
```bash
# From project root
node .aicodepath/commands/dashboard.js
```

### Option 3: Manual Start
```bash
# Terminal 1 - API Server
cd .aicodepath/dashboard
npm run api

# Terminal 2 - Dashboard
cd .aicodepath/dashboard
npm run dev
```

## Testing Checklist

### Pre-Launch Checks
- [ ] Database exists at `aicodepath-docs/aicodepath.db`
- [ ] Dependencies installed: `npm install`
- [ ] Ports 3001 and 3899 are available

### API Endpoint Tests

Run the test script:
```bash
cd .aicodepath/dashboard
node test-api.cjs
```

Expected output:
```
✅ Workflow State       - X rows
✅ Agent Status         - X rows
✅ Validations          - X rows
✅ Artifacts            - X rows
✅ Code Entities        - X rows
✅ Code Relations       - X rows
✅ Session History      - X rows
✅ Design Violations    - X rows
```

### Manual API Tests

```bash
# Health check
curl http://localhost:3001/api/health

# Workflow state
curl http://localhost:3001/api/workflow-state

# Agent status
curl http://localhost:3001/api/agent-status

# Validations
curl http://localhost:3001/api/validations

# Overview
curl http://localhost:3001/api/overview
```

### Dashboard UI Tests

1. **Open Dashboard**: http://localhost:3899

2. **Test Navigation**:
   - [ ] Click "Monitor" tab
   - [ ] Click "Kanban Board" tab
   - [ ] Click "Dependencies" tab
   - [ ] All views load without errors

3. **Test Auto-Refresh**:
   - [ ] Watch "Updated" timestamp in header
   - [ ] Should update every 3 seconds
   - [ ] Green dot should pulse

4. **Test Monitor View**:
   - [ ] Overview cards display counts
   - [ ] Agent status section shows agents
   - [ ] Validation section shows results
   - [ ] Artifact section shows stats
   - [ ] Charts render correctly

5. **Test Kanban Board**:
   - [ ] Columns render (Pending, In Progress, Completed, Blocked, Skipped)
   - [ ] Task cards display correctly
   - [ ] Progress bars work
   - [ ] Empty state shows if no tasks

6. **Test Dependencies View**:
   - [ ] Entity list displays
   - [ ] Filter dropdown works
   - [ ] Click entity shows details
   - [ ] Relations display correctly
   - [ ] Relation type summary shows

### Performance Tests

1. **Load Time**:
   - Initial page load should be < 3 seconds
   - API responses should be < 100ms

2. **Memory Usage**:
   - Watch browser DevTools Performance tab
   - Memory should stabilize after initial load
   - No memory leaks with auto-refresh

3. **Network**:
   - Check Network tab in DevTools
   - API calls every 3 seconds for active view
   - No failed requests

### Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

### Error Scenarios

1. **API Server Down**:
   - [ ] Stop API server
   - [ ] Dashboard should show error messages
   - [ ] No console errors

2. **Database Missing**:
   - [ ] Rename database file
   - [ ] API should return empty arrays
   - [ ] Dashboard should show "No data" messages

3. **Port Conflict**:
   - [ ] Try starting on occupied port
   - [ ] Should show clear error message

## Adding Test Data

To test with sample data, run:

```bash
cd .aicodepath/dashboard
node add-sample-data.cjs
```

This will add:
- Sample workflow tasks
- Agent executions
- Validation results
- Artifacts

## Debugging

### Enable Verbose Logging

API Server:
```bash
DEBUG=* node api/server.cjs
```

React DevTools:
- Install React DevTools browser extension
- Open DevTools > Components tab
- Inspect component state and props

### Common Issues

**Port Already in Use**:
```bash
# Find process using port
lsof -i :3001
lsof -i :3899

# Kill process
kill -9 <PID>
```

**Dependencies Missing**:
```bash
cd .aicodepath/dashboard
rm -rf node_modules package-lock.json
npm install
```

**Database Lock**:
```bash
# Close any other connections to the database
# Remove lock files if safe
rm aicodepath-docs/aicodepath.db-shm
rm aicodepath-docs/aicodepath.db-wal
```

**Build Errors**:
```bash
# Clear Vite cache
cd .aicodepath/dashboard
rm -rf node_modules/.vite
npm run dev
```

## Production Build

```bash
cd .aicodepath/dashboard
npm run build
npm run preview
```

Build output will be in `dist/` directory.

## Performance Monitoring

Monitor in production:

1. **Response Times**:
   - API endpoints should respond in < 100ms
   - Database queries should be indexed

2. **Polling Frequency**:
   - Default 3 seconds is good for development
   - Consider 5-10 seconds for production
   - Adjust in `useDatabase.ts` hook

3. **Database Size**:
   - Monitor `aicodepath.db` file size
   - Archive old data periodically
   - Consider cleanup scripts

## Security Considerations

1. **Read-Only Database**:
   - API uses read-only connection
   - No data modification possible

2. **CORS**:
   - Currently allows all origins
   - Restrict in production:
   ```javascript
   app.use(cors({
     origin: 'http://your-domain.com'
   }));
   ```

3. **Authentication**:
   - No auth in current version
   - Add auth middleware for production

## Next Steps

After basic testing:
- [ ] Add more sample data for realistic testing
- [ ] Test with large datasets (1000+ rows)
- [ ] Test concurrent users
- [ ] Load test API endpoints
- [ ] Security audit
- [ ] Accessibility testing
