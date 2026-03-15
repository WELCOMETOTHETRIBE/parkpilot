#!/usr/bin/env node
/**
 * Start script: uses standalone server when available (output: standalone),
 * otherwise runs build if needed then next start.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.cwd();
const standaloneServer = path.join(root, '.next', 'standalone', 'server.js');
const buildId = path.join(root, '.next', 'BUILD_ID');

function ensureBuild() {
  if (!fs.existsSync(buildId)) {
    console.log('No build found, running prisma generate and next build...');
    execSync('npx prisma generate && npm run build', { stdio: 'inherit' });
  }
}

if (fs.existsSync(standaloneServer)) {
  ensureBuild();
  execSync('node server.js', {
    stdio: 'inherit',
    cwd: path.join(root, '.next', 'standalone'),
    env: { ...process.env, PORT: process.env.PORT || '3000' },
  });
} else {
  ensureBuild();
  execSync('next start', { stdio: 'inherit' });
}
