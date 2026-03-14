import { discoveryService } from '@/lib/discovery/service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/discover/venue
 * Discover venues, events, and parking opportunities for a venue
 * Body: { venueName: string, city: string, state: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { venueName, city, state } = body;

    if (!venueName || !city || !state) {
      return NextResponse.json(
        { error: 'venueName, city, and state are required' },
        { status: 400 }
      );
    }

    const result = await discoveryService.discoverVenueWithEvents(
      venueName.trim(),
      city.trim(),
      state.trim()
    );

    return NextResponse.json({
      success: true,
      venue: result.venue,
      eventsCreated: result.events.length,
      events: result.events,
    });
  } catch (error) {
    console.error('POST /api/discover/venue error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Discovery failed',
        success: false 
      },
      { status: 500 }
    );
  }
}
