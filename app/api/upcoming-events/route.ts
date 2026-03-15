import { fetchUpcomingEvents } from '@/lib/upcoming-events';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upcoming-events?city=...&state=...&venueIds=...&limit=...
 * If venueIds (comma-separated): search events at those venues (e.g. favorites).
 * If city and state: search upcoming events in that region.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const city = searchParams.get('city') ?? undefined;
    const state = searchParams.get('state') ?? undefined;
    const venueIdsParam = searchParams.get('venueIds');
    const venueIds = venueIdsParam
      ? venueIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50;

    if (!city && !state && (!venueIds || venueIds.length === 0)) {
      return NextResponse.json(
        { error: 'Provide city and state, or venueIds (comma-separated)', success: false },
        { status: 400 }
      );
    }

    const events = await fetchUpcomingEvents({ city, state, venueIds, limit });

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('GET /api/upcoming-events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming events', success: false },
      { status: 500 }
    );
  }
}
