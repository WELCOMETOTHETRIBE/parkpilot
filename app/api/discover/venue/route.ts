import { discoveryService } from '@/lib/discovery/service';
import { discoveryQueue, hasRedis } from '@/lib/queue/client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/discover/venue
 * Discover venues, events, and parking opportunities for a venue.
 * When Redis is available, queues the job and returns immediately.
 * Body: { venueName: string, city: string, state: string, sync?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { venueName, city, state, sync } = body;

    if (!venueName || !city || !state) {
      return NextResponse.json(
        { error: 'venueName, city, and state are required' },
        { status: 400 }
      );
    }

    const vName = venueName.trim();
    const vCity = city.trim();
    const vState = state.trim();

    if (hasRedis() && discoveryQueue && !sync) {
      await discoveryQueue.add('discover-venue', { venueName: vName, city: vCity, state: vState });
      return NextResponse.json({
        success: true,
        queued: true,
        message: 'Scanning in background; check Events and Opportunities shortly.',
        venue: null,
        eventsCreated: 0,
        events: [],
      });
    }

    const result = await discoveryService.discoverVenueWithEvents(vName, vCity, vState);

    return NextResponse.json({
      success: true,
      queued: false,
      venue: result.venue,
      eventsCreated: result.events.length,
      events: result.events,
    });
  } catch (error) {
    console.error('POST /api/discover/venue error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Discovery failed',
        success: false,
      },
      { status: 500 }
    );
  }
}
