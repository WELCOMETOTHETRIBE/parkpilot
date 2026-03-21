import { discoveryService } from '@/lib/discovery/service';
import { discoveryQueue, hasRedis } from '@/lib/queue/client';
import { NextRequest, NextResponse } from 'next/server';

/** Vercel / platforms that honor this (Railway ignores; still helps elsewhere) */
export const maxDuration = 300;

/**
 * POST /api/discover/venue
 * Discover venues, events, and parking opportunities for a venue.
 * When Redis is available, queues the job and returns immediately.
 * Without Redis, full discovery can take 60s+ (SerpAPI + OpenAI) and proxies return 499 — so we
 * run in-process in the background and return immediately unless body.sync === true (e.g. scripts).
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

    // No Redis (or explicit desire to avoid blocking): don't hold the HTTP request — avoids 499 timeouts
    if (!sync) {
      void discoveryService
        .discoverVenueWithEvents(vName, vCity, vState)
        .catch((err) => console.error('Background discoverVenueWithEvents failed:', err));
      return NextResponse.json({
        success: true,
        queued: true,
        message:
          'Discovery started in the background. Refresh Events and Opportunities in a few minutes.',
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
