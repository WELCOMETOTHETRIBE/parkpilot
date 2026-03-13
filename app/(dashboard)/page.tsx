import { db } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import Decimal from 'decimal.js';

async function getDashboardStats() {
  // Get open opportunities count
  const openOpportunitiesCount = await db.opportunity.count({
    where: { status: 'OPEN' },
  });

  // Get top scoring opportunity
  const topOpportunity = await db.opportunity.findFirst({
    where: { status: 'OPEN' },
    orderBy: { opportunityScore: 'desc' },
    include: { event: true, latestObservation: true },
  });

  // Calculate projected profit (sum of all open opportunities)
  const opportunities = await db.opportunity.findMany({
    where: { status: 'OPEN' },
  });
  const projectedProfit = opportunities.reduce(
    (sum, opp) => sum.plus(opp.projectedProfit || 0),
    new Decimal(0)
  );

  // Get held inventory count and value
  const heldInventory = await db.inventoryItem.findMany({
    where: { status: 'HELD' },
  });
  const heldCount = heldInventory.reduce((sum, inv) => sum + inv.quantity, 0);
  const heldValue = heldInventory.reduce(
    (sum, inv) => sum.plus(inv.acquiredPrice.times(inv.quantity)),
    new Decimal(0)
  );

  // Get realized profit (from sales)
  const sales = await db.sale.findMany();
  const realizedProfit = sales.reduce(
    (sum, sale) => sum.plus(sale.netProfit),
    new Decimal(0)
  );

  // Get recent events
  const recentEvents = await db.event.findMany({
    take: 5,
    orderBy: { startTime: 'asc' },
    where: {
      startTime: {
        gte: new Date(),
      },
    },
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
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid-cols-dashboard mb-8">
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
          subtitle={formatPrice(stats.heldValue, 'USD') + ' invested'}
        />
        <StatCard
          title="Realized Profit"
          value={formatPrice(stats.realizedProfit)}
          subtitle="from completed sales"
        />
      </div>

      {/* Top Opportunity */}
      {stats.topOpportunity && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-xl font-semibold">Top Opportunity</h2>
          </div>
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {stats.topOpportunity.event?.name}
                </h3>
                <p className="text-gray-600 mt-1">
                  Score: <span className="font-bold">{stats.topOpportunity.opportunityScore}</span> | 
                  Confidence: <span className="font-bold">{stats.topOpportunity.confidenceScore}%</span>
                </p>
                <p className="text-gray-600 mt-2">
                  Projected Profit: <span className="font-semibold text-green-600">
                    {formatPrice(stats.topOpportunity.projectedProfit || 0)}
                  </span>
                </p>
              </div>
              <span className="badge badge-green">OPEN</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Events */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">Upcoming Events</h2>
        </div>
        <div className="card-body">
          {stats.recentEvents.length === 0 ? (
            <p className="text-gray-600">No upcoming events</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Date</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEvents.map(event => (
                  <tr key={event.id}>
                    <td className="font-semibold">{event.name}</td>
                    <td>{event.startTime.toLocaleDateString()}</td>
                    <td>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {event.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle: string }) {
  return (
    <div className="card">
      <div className="card-body">
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        <p className="text-gray-600 text-sm mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
