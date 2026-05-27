const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const pathResolver = require('../lib/path-resolver');
const ErrorHandler = require('../lib/error-handler');
const { FileSystemError, DatabaseError } = require('../lib/errors');

/**
 * Wait for a port to be ready by polling with HTTP requests
 * @param {number} port - Port to check
 * @param {number} timeout - Maximum wait time in ms (default: 30000)
 * @returns {Promise<void>}
 */
async function waitForPortReady(port, timeout = 30000) {
  const startTime = Date.now();
  const checkInterval = 500; // Check every 500ms

  while (Date.now() - startTime < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(1000);
      });
      // Port is ready!
      return;
    } catch (error) {
      // Port not ready yet, wait and try again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  throw new Error(`Port ${port} did not become ready within ${timeout}ms`);
}

/**
 * Launch AICodePath Dashboard
 *
 * Starts both the Express API server and Vite dev server,
 * then opens the dashboard in the browser.
 *
 * @param {Object} options - Options
 * @param {number} options.port - Dashboard port (default: 3899)
 * @param {number} options.apiPort - API port (default: 3888)
 * @param {boolean} options.noBrowser - Don't open browser automatically
 */
async function dashboardCommandImpl(options = {}) {
  const dashboardPort = options.port || 3899;
  const apiPort = options.apiPort || 3888;
  const noBrowser = options.noBrowser || false;

  console.log('\n🚀 Starting AICodePath Dashboard...\n');

  // Dashboard is in aicodepath-docs/dashboard/ in the target project
  const projectRoot = pathResolver.findProjectRoot();
  const dashboardPath = path.join(projectRoot, 'aicodepath-docs', 'dashboard');
  const apiPath = path.join(dashboardPath, 'api', 'server.cjs');
  const dbPath = path.join(projectRoot, 'aicodepath-docs', 'aicodepath.db');

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    throw new DatabaseError(
      `Database not found at: ${dbPath}\n\nPlease ensure the AICodePath database is initialized.`,
      dbPath
    );
  }

  // Check if dashboard is built/installed
  if (!fs.existsSync(path.join(dashboardPath, 'package.json'))) {
    throw new FileSystemError(
      `Dashboard not found at: ${dashboardPath}\n\nPlease ensure the dashboard is properly set up.`,
      dashboardPath
    );
  }

  // Check if node_modules exists
  const nodeModulesPath = path.join(dashboardPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 Installing dashboard dependencies...\n');
    const install = spawn('npm', ['install'], {
      cwd: dashboardPath,
      stdio: 'inherit',
      shell: true
    });

    await new Promise((resolve, reject) => {
      install.on('close', (code) => {
        if (code !== 0) {
          reject(new FileSystemError(`npm install failed with code ${code}`, dashboardPath));
        } else {
          resolve();
        }
      });
    });
  }

  let apiProcess;
  let viteProcess;

  // Start Express API server
  console.log(`🔧 Starting API server on port ${apiPort}...`);
  apiProcess = spawn('node', [apiPath], {
    env: { ...process.env, PORT: apiPort },
    stdio: 'inherit',
    shell: true
  });

  // Wait for API to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start Vite dev server
  console.log(`🎨 Starting dashboard on port ${dashboardPort}...`);
  viteProcess = spawn('npm', ['run', 'dev', '--', '--port', dashboardPort, '--host'], {
    cwd: dashboardPath,
    stdio: 'inherit',
    shell: true
  });

  // Wait for Vite to start (dynamic port readiness check)
  try {
    await waitForPortReady(dashboardPort, 30000);
  } catch (error) {
    throw new Error(`Dashboard failed to start: ${error.message}\n\nCheck that port ${dashboardPort} is available and try again.`);
  }

  console.log('\n✅ Dashboard is ready!\n');
  console.log(`📊 Dashboard: http://localhost:${dashboardPort}`);
  console.log(`🔌 API:       http://localhost:${apiPort}`);
  console.log(`💾 Database:  ${dbPath}\n`);
  console.log('Press Ctrl+C to stop\n');

  // Open browser if not disabled
  if (!noBrowser) {
    try {
      const open = require('open');
      await open(`http://localhost:${dashboardPort}`);
      console.log('🌐 Browser opened\n');
    } catch (err) {
      console.log('ℹ️  Could not auto-open browser. Please navigate to http://localhost:' + dashboardPort);
    }
  }

  // Handle cleanup
  const cleanup = () => {
    console.log('\n\n👋 Shutting down dashboard...');
    if (apiProcess) apiProcess.kill();
    if (viteProcess) viteProcess.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process alive
  await new Promise(() => {});
}

// Export wrapped version for CLI use
module.exports = ErrorHandler.wrapCLICommand('dashboard', dashboardCommandImpl);

// Allow direct execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      options.port = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--api-port' && args[i + 1]) {
      options.apiPort = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--no-browser') {
      options.noBrowser = true;
    }
  }

  module.exports(options);
}
