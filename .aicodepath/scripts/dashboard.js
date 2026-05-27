#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const { findProjectRoot } = require('../lib/path-resolver');

// Dashboard is in aicodepath-docs/dashboard/ in the target project
const projectRoot = findProjectRoot(process.cwd());
const DASHBOARD_DIR = path.join(projectRoot, 'aicodepath-docs', 'dashboard');

console.log('🚀 Starting AICodePath Control Tower...');
console.log(`   Location: ${DASHBOARD_DIR}`);

// Check if node_modules exists, if not run install
const fs = require('fs');
if (!fs.existsSync(path.join(DASHBOARD_DIR, 'node_modules'))) {
    console.log('📦 Installing dependencies (first run only)...');
    const install = spawn('npm', ['install'], {
        cwd: DASHBOARD_DIR,
        stdio: 'inherit'
    });
    install.on('close', (code) => {
        if (code === 0) startServer();
        else process.exit(code);
    });
} else {
    startServer();
}

function startServer() {
    console.log('🌐 Launching Dashboard at http://localhost:3000');

    const next = spawn('npm', ['run', 'dev'], {
        cwd: DASHBOARD_DIR,
        stdio: 'inherit',
        env: { ...process.env }
    });

    next.on('error', (err) => {
        console.error('Failed to start dashboard:', err);
    });
}
