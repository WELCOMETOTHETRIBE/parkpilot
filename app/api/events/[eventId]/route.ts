import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[eventId]
 * Event with venue, parking products (with latest observation), and opportunities.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        venue: true,
        parkingProducts: {
          include: {
            source: true,
            observations: { orderBy: { observedAt: 'desc' }, take: 1 },
          },
        },
        opportunities: {
          include: { latestObservation: true, source: true, parkingProduct: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const parkingProductsWithLatest = event.parkingProducts.map((p) => ({
      id: p.id,
      productName: p.productName,
      lotName: p.lotName,
      sourceUrl: p.sourceUrl,
      sourceName: p.source?.name,
      latestObservation: p.observations[0] ?? null,
    }));

    const { parkingProducts: _pp, ...eventRest } = event;
    return NextResponse.json({
      ...eventRest,
      parkingProducts: parkingProductsWithLatest,
      opportunities: event.opportunities,
    });
  } catch (error) {
    console.error('GET /api/events/[eventId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}
