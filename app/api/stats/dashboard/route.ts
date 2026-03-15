import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { startOfWeek, subWeeks } from 'date-fns';

/**
 * GET /api/stats/dashboard
 * Returns aggregated stats for dashboard chart: realized profit by week.
 */
export async function GET() {
  try {
    const sales = await db.sale.findMany({
      select: { soldAt: true, netProfit: true },
      orderBy: { soldAt: 'asc' },
    });

    // Group by week (last 12 weeks)
    const now = new Date();
    const weeks: { period: string; totalProfit: number; start: Date }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const end = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 });
      const periodLabel = start.toISOString().slice(0, 10);
      const totalProfit = sales
        .filter((s) => {
          const t = new Date(s.soldAt).getTime();
          return t >= start.getTime() && t < end.getTime();
        })
        .reduce((sum, s) => sum + Number(s.netProfit), 0);
      weeks.push({ period: periodLabel, totalProfit, start });
    }

    return NextResponse.json({
      profitByWeek: weeks.map((w) => ({ period: w.period, totalProfit: w.totalProfit })),
    });
  } catch (error) {
    console.error('GET /api/stats/dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
