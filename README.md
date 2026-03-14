# 🅿️ ParkPilot

**Parking-Pass Market Intelligence and Arbitrage Operations Platform**

ParkPilot is a production-grade MVP for discovering, monitoring, scoring, and managing high-demand parking-pass opportunities around major events.

## Features

- **Event Discovery**: Monitor upcoming events via SerpApi
- **Market Monitoring**: Track parking availability and pricing from multiple sources
- **Opportunity Scoring**: Transparent, explainable scoring engine (0-1000)
- **Inventory Management**: Track passed held, listed, and sold
- **Sales Analytics**: Monitor realized profit and margins
- **Alert System**: In-app, email, and webhook notifications
- **Dashboard**: Clean, responsive admin UI for all operations

## Tech Stack

- **Backend**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **UI**: React + Tailwind CSS
- **APIs**: SerpApi for discovery
- **Browser Automation**: Selenium (worker node)
- **Deployment**: Railway
- **Validation**: Zod
- **Scheduling**: DB-backed job runner

## Get started (minimal setup)

**You need:** Node.js 18+ and a Postgres database (free at [Neon](https://neon.tech) or [Supabase](https://supabase.com)).

```bash
cd ParkPilot
npm run setup
```

If this is your first run, `setup` creates `.env` from `.env.example` and exits. **Edit `.env` and set `DATABASE_URL`** to your Postgres connection string, then run:

```bash
npm run setup
```

Then start the app and open the dashboard:

```bash
npm run dev
# Open http://localhost:3000/dashboard
```

The dashboard shows a **Quick start** card with four steps: log prices → pick opportunities → record inventory → record sales. Optional: add `SERPAPI_API_KEY` to `.env` for event discovery (free key at [serpapi.com](https://serpapi.com)).

### Database Migrations

```bash
# Create new migration
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy

# Reset database (development only)
npm run db:reset
```

## Project Structure

```
app/                    # Next.js App Router
├── (dashboard)/       # Dashboard routes and pages
├── api/               # API routes (venues, events, opportunities, etc.)
└── layout.tsx         # Root layout

lib/
├── db.ts             # Prisma client setup
├── env.ts            # Environment validation
├── scoring/engine.ts # Opportunity scoring engine
├── serpapi/client.ts # SerpApi discovery client
├── utils.ts          # Utility functions
└── validators.ts     # Zod schemas for validation

prisma/
├── schema.prisma     # Database schema
└── seed.ts          # Seed script with sample data

components/           # Shared React components (future)

types/               # TypeScript type definitions

workers/             # Background job runners (future)
```

## API Routes

### Venues
- `GET /api/venues` - List all venues
- `POST /api/venues` - Create venue

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create event

### Opportunities
- `GET /api/opportunities` - List opportunities with filters
- `GET /api/opportunities?status=OPEN&minScore=600`

### Observations
- `GET /api/observations` - List market observations
- `POST /api/observations` - Ingest new observation

### Inventory
- `GET /api/inventory` - List all inventory

### Sales
- `GET /api/sales` - List completed sales

### Alerts
- `GET /api/alerts` - List alerts

### Health
- `GET /api/health` - Health check endpoint

## Scoring Engine

The opportunity score (0-1000) is calculated transparently:

```
Score Components:
- Margin (35%):          $40 → 100pts, scales to 250 at $100+
- Time to Event (25%):   3-7 days → 100pts (peak), <6hrs/7+ days reduced
- Source Reliability (15%): API (85) vs Manual (60), weighted by accuracy
- Freshness (15%):       <6hrs → 100pts, decays to 20 at 7+ days
- Transferability (10%): YES (+0) / UNKNOWN (-100) / NO (-150)
+ Demand Multiplier:     0.5-2.0x based on venue/category
```

Each opportunity includes a `rationale` object breaking down component contributions.

## Deployment to Railway

### 1. Prepare for Railway

```bash
# Build production image
npm run build

# Test production mode locally (optional)
npm start
```

### 2. Create Railway Project

```bash
# Login to Railway
railway login

# Initialize project
railway init
```

### 3. Add PostgreSQL

```bash
# In Railway dashboard, add PostgreSQL plugin
# Copy DATABASE_URL from plugin settings
```

### 4. Set Environment Variables

In Railway dashboard, add:

```
DATABASE_URL=<from plugin>
SERPAPI_API_KEY=<your key>
APP_BASE_URL=https://<your-railway-domain>.railway.app
ADMIN_PASSWORD=<strong password>
NODE_ENV=production
```

### 5. Deploy

```bash
railway up
```

### 6. Run Migrations

```bash
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `NODE_ENV` | Environment (`development` or `production`) | `production` |
| `APP_BASE_URL` | Base URL of deployed app | `https://app.railway.app` |
| `SERPAPI_API_KEY` | API key for SerpApi | (from serpapi.com) |
| `ADMIN_PASSWORD` | Admin password (MVP auth) | (your strong password) |
| `SMTP_HOST` | Email host for alerts | `smtp.gmail.com` |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email user | (your email) |
| `SMTP_PASS` | Email password or app password | (your password) |
| `ALERT_EMAIL_FROM` | Alert sender email | `alerts@parkpilot.local` |

## Testing

```bash
# Run tests
npm test

# Run type check
npm run type-check

# Run linter
npm run lint
```

## Architecture Notes

### Database Design

- **Denormalized observations** stored separately for audit trail
- **Opportunity uniqueness** enforced per (event, parkingProduct, source) combination
- **Flexible externalRefs** JSON fields for integrations
- **Audit-ready**: createdAt/updatedAt on all entities, raw snapshots saved

### Scoring Philosophy

- **Transparent, not black-box**: Every component is explained
- **Conservative confidence**: Penalties for unknown transferability
- **Time-sensitive**: Peaks 3-7 days before event
- **Explainable rationale**: Includes component breakdown and weights

### Compliance

- **No CAPTCHA bypass**: SerpApi only for search results
- **No anti-detection**: Selenium runs headless but without evasion plugins
- **Manual override**: All purchase/listing decisions remain with user
- **No checkout automation**: Platform tracks observations only

## Future Roadmap (Phase 2+)

- [ ] Selenium worker for passive price extraction
- [ ] Email alert delivery with SMTP
- [ ] User authentication (currently single admin)
- [ ] Custom source adapters framework
- [ ] Historical trend charts
- [ ] Export to CSV
- [ ] Webhook integrations
- [ ] Multi-user RBAC
- [ ] Bulk operations

## Development

### Adding a New Page

1. Create page in `app/(dashboard)/<name>/page.tsx`
2. Create API route in `app/api/<name>/route.ts`
3. Add sidebar link in `app/(dashboard)/layout.tsx`

### Adding a New Model

1. Add to `prisma/schema.prisma`
2. Run `npm run db:migrate` and name the migration
3. Create API route
4. Create page/component

### Debugging

Enable debug logs:
```bash
DEBUG=true npm run dev
```

Check Prisma logs:
```bash
DATABASE_URL=... npx prisma studio
```

## Troubleshooting

**"Prisma client not generated?"**
```bash
npx prisma generate
```

**"Database connection failed?"**
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Test with `psql <DATABASE_URL>`

**"Build fails on Railway?"**
- Check environment variables are set
- Ensure migrations are deployed
- Check logs: `railway logs -f`

## Support & Contributing

This is an MVP. For issues or improvements:

1. Check existing documentation
2. Review Prisma/Next.js docs for framework questions
3. Consult `.env.example` for configuration

## License

Proprietary - ParkPilot Platform

---

**Built with ❤️ for parking arbitrage enthusiasts**
