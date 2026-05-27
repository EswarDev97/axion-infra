#!/usr/bin/env node
'use strict';

const path = require('path');
const { detectProvider } = require(path.join(__dirname, '../lib/provider-detector'));

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const adapter = detectProvider(data, process.env);
    const result = adapter.normalize(data);
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: e.message }) + '\n');
    process.exit(1);
  }
});
