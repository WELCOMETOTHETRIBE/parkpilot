#!/usr/bin/env node
/**
 * One-command setup: create .env from example (if needed), install deps, migrate, seed.
 * Run: npm run setup
 * You must set DATABASE_URL in .env (e.g. from Neon.tech or local Postgres) before migrate/seed.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const envExamplePath = path.join(root, '.env.example');

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  try {
    execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
    return true;
  } catch (e) {
    return false;
  }
}

function main() {
  console.log('🅿️  ParkPilot setup\n');

  if (!fs.existsSync(envPath)) {
    if (!fs.existsSync(envExamplePath)) {
      console.error('Missing .env.example. Cannot create .env.');
      process.exit(1);
    }
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env from .env.example');
    console.log('\n   Next: Set DATABASE_URL in .env (Postgres connection string).');
    console.log('   Free DB: https://neon.tech or https://supabase.com');
    console.log('   Then run:  npm run setup\n');
    process.exit(0);
  }
  console.log('✅ .env found');

  console.log('\n📦 Installing dependencies...');
  if (!run('npm install')) {
    console.error('npm install failed');
    process.exit(1);
  }
  console.log('✅ Dependencies installed');

  console.log('\n🔧 Generating Prisma client...');
  if (!run('npx prisma generate')) {
    console.error('prisma generate failed');
    process.exit(1);
  }
  console.log('✅ Prisma client ready');

  console.log('\n🗄️  Running database migrations...');
  if (!run('npx prisma migrate deploy')) {
    console.error('\n❌ Migrations failed. Set DATABASE_URL in .env to your Postgres URL.');
    console.error('   Example: DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"');
    console.error('   Free tier: https://neon.tech or https://supabase.com');
    process.exit(1);
  }
  console.log('✅ Database migrated');

  console.log('\n🌱 Seeding database...');
  if (!run('npx prisma db seed')) {
    console.error('Seed failed (database may be empty). You can add data from the dashboard.');
  } else {
    console.log('✅ Sample data loaded');
  }

  console.log('\n' + '─'.repeat(50));
  console.log('✅ Setup complete!\n');
  console.log('   Start the app:    npm run dev');
  console.log('   Then open:       http://localhost:3000/dashboard\n');
  console.log('   Optional: Add SERPAPI_API_KEY to .env for event discovery (serpapi.com).');
  console.log('─'.repeat(50) + '\n');
}

main();
