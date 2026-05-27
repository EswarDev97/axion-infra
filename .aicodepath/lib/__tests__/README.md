# WebSocket Infrastructure Tests

This directory contains comprehensive tests for the WebSocket infrastructure in the AICodePath project.

## Test Files

### Backend Tests

**File:** `websocket-server.test.js`

Tests for the DashboardWebSocketServer class including:

- ✅ Welcome message on connection
- ✅ Agent update broadcasting
- ✅ Ping/pong mechanism
- ✅ Client disconnection handling
- ✅ Max clients limit enforcement
- ✅ Heartbeat timeout
- ✅ Log message broadcasting
- ✅ Phase change broadcasting
- ✅ Progress update broadcasting
- ✅ Checkpoint event broadcasting
- ✅ Celebration trigger broadcasting
- ✅ Subscription filtering
- ✅ Statistics reporting
- ✅ Event emission for client lifecycle
- ✅ Multiple simultaneous connections
- ✅ Graceful shutdown

### Frontend Tests

**File:** `dashboard/src/hooks/__tests__/useWebSocket.test.ts`

Tests for the React useWebSocket hook including:

- ✅ Connection and welcome message handling
- ✅ Agent update handling
- ✅ Log message handling
- ✅ Log limit enforcement
- ✅ Reconnection behavior
- ✅ Heartbeat timeout handling
- ✅ Progress update handling
- ✅ Phase change handling
- ✅ Celebration trigger handling
- ✅ Orchestrator update handling
- ✅ Agent completion removal from active list
- ✅ clearLogs function
- ✅ dismissCelebration function
- ✅ send function
- ✅ Recent activity limit
- ✅ Agent state updates
- ✅ Multiple agents handling

### Integration Tests

**File:** `../../scripts/test-websocket-integration.js`

Manual integration test script for end-to-end testing:

- ✅ Connection and welcome message
- ✅ Ping/pong mechanism
- ✅ Subscription filtering
- ✅ Heartbeat messages (optional)
- ✅ Connection statistics
- ✅ Multiple sequential messages
- ✅ Reconnection
- ✅ Malformed message handling

## Running Tests

### Backend Tests

```bash
# Run all backend tests with Jest
cd .aicodepath
npm test -- websocket-server.test.js

# Run with verbose output
npm run test:verbose -- websocket-server.test.js

# Run with coverage
npm run test:coverage -- websocket-server.test.js

# Or run directly (if standalone)
node lib/__tests__/websocket-server.test.js
```

### Frontend Tests

```bash
# From the dashboard directory
cd .aicodepath/templates/dashboard

# Install dependencies first (if not already installed)
npm install

# Run all frontend tests
npm test

# Run specific test file
npm test -- useWebSocket.test.ts

# Run with coverage
npm test -- --coverage useWebSocket.test.ts
```

### Integration Tests

First, ensure the WebSocket server is running:

```bash
# Start the dashboard server (includes WebSocket server)
node .aicodepath/scripts/dashboard.js
```

Then in another terminal:

```bash
# Run integration tests
node .aicodepath/scripts/test-websocket-integration.js

# Or specify a different WebSocket URL
WS_URL=ws://localhost:3000/ws/dashboard node .aicodepath/scripts/test-websocket-integration.js
```

## Test Dependencies

### Backend

- `jest` - Testing framework (already installed)
- `ws` - WebSocket client library (install with `npm install ws`)

### Frontend

- `jest` - Testing framework
- `@testing-library/react` - React testing utilities
- `jest-websocket-mock` - WebSocket mocking for Jest (optional, falls back to mock if unavailable)
- `ts-jest` - TypeScript preprocessor for Jest
- `@types/jest` - TypeScript type definitions for Jest

Install frontend test dependencies:

```bash
cd .aicodepath/templates/dashboard
npm install --save-dev jest @testing-library/react ts-jest @types/jest jest-websocket-mock
```

## Test Coverage Goals

- **Statements:** >70%
- **Branches:** >70%
- **Functions:** >70%
- **Lines:** >70%

## Test Structure

Each test file follows this structure:

1. **Setup/Teardown** - `beforeEach`/`afterEach` hooks for server and client initialization
2. **Helper Functions** - Reusable utilities for creating clients and waiting for messages
3. **Test Cases** - Individual tests for each feature
4. **Comments** - Clear documentation of what each test verifies

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find and kill processes using the test port
lsof -ti:9999 | xargs kill -9
```

### WebSocket Server Not Running

For integration tests, ensure the server is running:

```bash
# Check if server is running
curl http://localhost:3899/health

# Start server if needed
node .aicodepath/scripts/dashboard.js
```

### jest-websocket-mock Not Available

The frontend tests will automatically fall back to a mock WebSocket implementation if `jest-websocket-mock` is not available. This allows tests to run without additional dependencies.

## Continuous Integration

These tests are designed to run in CI/CD environments:

- Tests use fixed ports to avoid conflicts
- Tests have timeouts to prevent hanging
- Tests clean up resources in teardown hooks
- Tests can run in parallel (except integration tests)

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [WebSocket RFC 6455](https://tools.ietf.org/html/rfc6455)
- [ws Library Documentation](https://github.com/websockets/ws)
- [Testing Library Documentation](https://testing-library.com/)
