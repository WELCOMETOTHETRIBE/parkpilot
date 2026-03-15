import { db } from '@/lib/db';
import { getDefaultUser } from '@/lib/profile';
import { discoveryService } from '@/lib/discovery/service';
import { discoveryQueue, hasRedis } from '@/lib/queue/client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/discover/scan-favorites
 * Run discovery (events + parking) for all of the current user's favorite venues.
 * When Redis is available, queues one job per venue. Otherwise runs synchronously with delay between venues.
 */
export async function POST() {
  try {
    const user = await getDefaultUser();
    const favorites = await db.userFavoriteVenue.findMany({
      where: { userId: user.id },
      include: { venue: true },
      orderBy: { createdAt: 'desc' },
    });

    const venues = favorites.map((f) => f.venue).filter(Boolean);
    if (venues.length === 0) {
      return NextResponse.json({
        success: true,
        queued: 0,
        message: 'No favorite venues. Add venues to favorites on the Venues page.',
      });
    }

    if (hasRedis() && discoveryQueue) {
      for (const v of venues) {
        await discoveryQueue.add('discover-venue', {
          venueName: v.name,
          city: v.city,
          state: v.state,
        });
      }
      return NextResponse.json({
        success: true,
        queued: venues.length,
        message: `Scanning ${venues.length} venue(s) in background. New opportunities will appear in Opportunities.`,
      });
    }

    for (let i = 0; i < venues.length; i++) {
      const v = venues[i];
      await discoveryService.discoverVenueWithEvents(v.name, v.city, v.state);
      if (i < venues.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return NextResponse.json({
      success: true,
      queued: 0,
      message: `Scanned ${venues.length} venue(s). Check Events and Opportunities.`,
    });
  } catch (error) {
    console.error('POST /api/discover/scan-favorites error:', error);
    return NextResponse.json(
      { error: 'Failed to scan favorites', success: false },
      { status: 500 }
    );
  }
}
