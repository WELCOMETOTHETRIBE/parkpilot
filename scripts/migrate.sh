#!/bin/bash
# Database migration script for production deployments

set -e

echo "🔄 Deploying Prisma migrations..."
npx prisma migrate deploy

echo "✅ Migrations deployed successfully"
