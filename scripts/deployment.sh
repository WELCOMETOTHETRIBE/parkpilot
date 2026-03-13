#!/bin/bash
# Deploy ParkPilot to Railway - Quick Start Script

set -e

echo "🚀 ParkPilot Railway Deployment Setup"
echo "======================================"

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"

# Initialize project if not already done
if [ ! -f "railway.json" ]; then
    echo "📋 Initializing Railway project..."
    railway init
else
    echo "✅ Railway project already initialized"
fi

echo ""
echo "📝 Next steps:"
echo "1. In Railway dashboard, add PostgreSQL service"
echo "2. Copy DATABASE_URL from PostgreSQL service plugin settings"
echo ""
echo "3. Set environment variables:"
echo "   railway variables set DATABASE_URL '<your-database-url>'"
echo "   railway variables set SERPAPI_API_KEY '<your-serpapi-key>'"
echo "   railway variables set APP_BASE_URL 'https://<project>.railway.app'"
echo "   railway variables set ADMIN_PASSWORD '<strong-password>'"
echo ""
echo "4. Deploy:"
echo "   railway up"
echo ""
echo "5. Run migrations:"
echo "   railway run npx prisma migrate deploy"
echo "   railway run npx prisma db seed"
echo ""
echo "6. Verify deployment:"
echo "   curl https://<project>.railway.app/api/health"
echo ""
echo "✨ Happy parking! 🅿️"
