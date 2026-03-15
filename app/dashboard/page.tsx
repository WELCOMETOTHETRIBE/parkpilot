import Link from 'next/link';
import { db } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import Decimal from 'decimal.js';
import DashboardChart from './DashboardChart';
import { ScanFavoritesButton } from './ScanFavoritesButton';

interface Opportunity {
  id: string;
  projectedProfit: Decimal | null;
  opportunityScore: number;
  confidenceScore: number;
  event?: Event;
}

interface InventoryItem {
  quantity: number;
  acquiredPrice: Decimal;
}

interface Sale {
  netProfit: Decimal;
}

interface Event {
  id: string;
  name: string;
  startTime: Date;
  category: string;
  venue?: { name: string };
}

interface DashboardStats {
  openOpportunitiesCount: number;
  topOpportunity: Opportunity | null;
  projectedProfit: Decimal;
  heldCount: number;
  heldValue: Decimal;
  realizedProfit: Decimal;
  recentEvents: Event[];
}

async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const openOpportunitiesCount = await db.opportunity.count({
      where: { status: 'OPEN' },
    });

    const topOpportunity = await db.opportunity.findFirst({
      where: { status: 'OPEN' },
      orderBy: { opportunityScore: 'desc' },
      include: { event: true, latestObservation: true },
    });

    const opportunities = await db.opportunity.findMany({
      where: { status: 'OPEN' },
    });
    const projectedProfit = opportunities.reduce(
      (sum: Decimal, opp: { projectedProfit?: Decimal | null }) =>
        sum.plus(opp.projectedProfit || 0),
      new Decimal(0)
    );

    const heldInventory = await db.inventoryItem.findMany({
      where: { status: 'HELD' },
    });
    const heldCount = heldInventory.reduce(
      (sum: number, inv: InventoryItem) => sum + inv.quantity,
      0
    );
    const heldValue = heldInventory.reduce(
      (sum: Decimal, inv: InventoryItem) =>
        sum.plus(inv.acquiredPrice.times(inv.quantity)),
      new Decimal(0)
    );

    const sales = await db.sale.findMany();
    const realizedProfit = sales.reduce(
      (sum: Decimal, sale: Sale) => sum.plus(sale.netProfit),
      new Decimal(0)
    );

    const recentEvents = await db.event.findMany({
      take: 5,
      orderBy: { startTime: 'asc' },
      where: { startTime: { gte: new Date() } },
      include: { venue: true },
    });

    return {
      openOpportunitiesCount,
      topOpportunity,
      projectedProfit,
      heldCount,
      heldValue,
      realizedProfit,
      recentEvents,
    };
  } catch {
    return {
      openOpportunitiesCount: 0,
      topOpportunity: null,
      projectedProfit: new Decimal(0),
      heldCount: 0,
      heldValue: new Decimal(0),
      realizedProfit: new Decimal(0),
      recentEvents: [],
    };
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  let stats: DashboardStats;
  try {
    stats = await getDashboardStats();
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    stats = {
      openOpportunitiesCount: 0,
      topOpportunity: null,
      projectedProfit: new Decimal(0),
      heldCount: 0,
      heldValue: new Decimal(0),
      realizedProfit: new Decimal(0),
      recentEvents: [],
    };
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <ScanFavoritesButton className="btn btn-primary btn-sm" />
          <Link
            href="/dashboard/observations"
            className="btn btn-secondary btn-sm"
          >
            Log price
          </Link>
          <Link
            href="/dashboard/events?discover=1"
            className="btn btn-secondary btn-sm"
          >
            Discover events
          </Link>
          <Link
            href="/dashboard/inventory"
            className="btn btn-primary btn-sm"
          >
            Add inventory
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Opportunities"
          value={stats.openOpportunitiesCount}
          subtitle="high-value deals"
        />
        <StatCard
          title="Projected Profit"
          value={formatPrice(stats.projectedProfit)}
          subtitle="from open deals"
        />
        <StatCard
          title="Held Inventory"
          value={`${stats.heldCount} passes`}
          subtitle={`${formatPrice(stats.heldValue, 'USD')} invested`}
        />
        <StatCard
          title="Realized Profit"
          value={formatPrice(stats.realizedProfit)}
          subtitle="from completed sales"
        />
      </div>

      {/* Chart: profit over time */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Realized profit over time</h2>
        </div>
        <div className="card-body">
          <DashboardChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top opportunity */}
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Top opportunity</h2>
            {stats.topOpportunity && (
              <Link
                href="/dashboard/opportunities"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View all →
              </Link>
            )}
          </div>
          <div className="card-body">
            {!stats.topOpportunity ? (
              <p className="text-gray-500">No open opportunities. Log observations to discover deals.</p>
            ) : (
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {stats.topOpportunity.event?.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Score <span className="font-semibold">{stats.topOpportunity.opportunityScore}</span>
                    {' · '}
                    Confidence <span className="font-semibold">{stats.topOpportunity.confidenceScore}%</span>
                  </p>
                  <p className="text-sm text-green-600 font-medium mt-2">
                    {formatPrice(stats.topOpportunity.projectedProfit ?? 0)} projected
                  </p>
                </div>
                <span className="badge badge-green shrink-0">OPEN</span>
                <Link
                  href="/dashboard/opportunities"
                  className="btn btn-primary btn-sm shrink-0"
                >
                  View
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="card">
          <div className="card-header flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming events</h2>
            <Link
              href="/dashboard/events"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
          <div className="card-body">
            {stats.recentEvents.length === 0 ? (
              <p className="text-gray-500">No upcoming events. Add venues and events or use Discover.</p>
            ) : (
              <ul className="space-y-2">
                {stats.recentEvents.map((event) => (
                  <li key={event.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-900 truncate pr-2">{event.name}</span>
                    <span className="text-gray-500 shrink-0">
                      {event.startTime.toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick start (collapsed / secondary) */}
      <details className="card">
        <summary className="card-body cursor-pointer list-none">
          <span className="text-sm font-medium text-gray-700">Quick start — make money in 4 steps</span>
        </summary>
        <div className="card-body pt-0">
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600">
            <li>
              <Link href="/dashboard/observations" className="text-blue-600 hover:underline font-medium">Log prices</Link>
              {' '}(Observations) so opportunities get scored automatically.
            </li>
            <li>
              <Link href="/dashboard/opportunities" className="text-blue-600 hover:underline font-medium">Pick deals</Link>
              {' '}(Opportunities) — buy passes when the score looks good.
            </li>
            <li>
              <Link href="/dashboard/inventory" className="text-blue-600 hover:underline font-medium">Record what you bought</Link>
              {' '}(Inventory → Add inventory).
            </li>
            <li>
              <Link href="/dashboard/sales" className="text-blue-600 hover:underline font-medium">Record sales</Link>
              {' '}when you sell; profit is tracked automatically.
            </li>
          </ol>
          <p className="text-sm text-gray-500 mt-3">
            Add <Link href="/dashboard/venues" className="text-blue-600 hover:underline">venues</Link> and{' '}
            <Link href="/dashboard/events" className="text-blue-600 hover:underline">events</Link> first, or use Discover on the Events page.
          </p>
        </div>
      </details>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="card">
      <div className="card-body">
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}
