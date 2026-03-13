import { db } from '@/lib/db';
import { OpportunityFilterSchema } from '@/lib/validators';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = Object.fromEntries(searchParams);
    const validated = OpportunityFilterSchema.parse(query);

    const opportunities = await db.opportunity.findMany({
      where: {
        ...(validated.status && { status: validated.status }),
        ...(validated.eventId && { eventId: validated.eventId }),
        ...(validated.venueId && { event: { venueId: validated.venueId } }),
        ...(validated.minScore && { opportunityScore: { gte: validated.minScore } }),
      },
      include: {
        event: true,
        latestObservation: true,
      },
      orderBy: { opportunityScore: 'desc' },
      take: validated.limit,
      skip: validated.offset,
    });

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error('GET /api/opportunities error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}
