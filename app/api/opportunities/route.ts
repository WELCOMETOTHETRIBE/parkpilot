import { db } from '@/lib/db';
import { OpportunityFilterSchema } from '@/lib/validators';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = Object.fromEntries(searchParams);
    const validated = OpportunityFilterSchema.parse(query);

    const where = {
      ...(validated.status && { status: validated.status }),
      ...(validated.eventId && { eventId: validated.eventId }),
      ...(validated.venueId && { event: { venueId: validated.venueId } }),
      ...(validated.minScore && { opportunityScore: { gte: validated.minScore } }),
    };

    const orderKey = validated.sortKey || 'opportunityScore';
    const orderDir = validated.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy = { [orderKey]: orderDir } as { opportunityScore?: 'asc' | 'desc'; projectedProfit?: 'asc' | 'desc'; createdAt?: 'asc' | 'desc' };

    const [opportunities, total] = await Promise.all([
      db.opportunity.findMany({
        where,
        include: { event: true, latestObservation: true },
        orderBy,
        take: validated.limit,
        skip: validated.offset,
      }),
      db.opportunity.count({ where }),
    ]);

    return NextResponse.json({ data: opportunities, total });
  } catch (error) {
    console.error('GET /api/opportunities error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}
