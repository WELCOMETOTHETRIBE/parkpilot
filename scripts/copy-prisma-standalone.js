#!/usr/bin/env node
/**
 * Next.js standalone output often omits Prisma query-engine binaries.
 * Copy the full .prisma folder into .next/standalone/node_modules so
 * production (Docker / Railway) can load libquery_engine-*.so.node.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', '.prisma');
const standaloneRoot = path.join(root, '.next', 'standalone');
const dest = path.join(standaloneRoot, 'node_modules', '.prisma');

if (!fs.existsSync(src)) {
  console.warn('copy-prisma-standalone: node_modules/.prisma not found, skipping');
  process.exit(0);
}
if (!fs.existsSync(standaloneRoot)) {
  console.warn('copy-prisma-standalone: .next/standalone not found, skipping');
  process.exit(0);
}

function copyRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

copyRecursive(src, dest);
console.log('copy-prisma-standalone: copied .prisma → .next/standalone/node_modules/');
