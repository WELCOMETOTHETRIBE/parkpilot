import { db } from '@/lib/db';
import { getDefaultUser } from '@/lib/profile';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** GET /api/profile/favorite-venues — list venues favorited by the current user */
export async function GET() {
  try {
    const user = await getDefaultUser();
    const favorites = await db.userFavoriteVenue.findMany({
      where: { userId: user.id },
      include: { venue: true },
      orderBy: { createdAt: 'desc' },
    });
    const venues = favorites.map((f) => f.venue);
    return NextResponse.json({ venueIds: venues.map((v) => v.id), venues });
  } catch (e) {
    console.error('GET /api/profile/favorite-venues error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load favorites' },
      { status: 500 }
    );
  }
}

/** POST /api/profile/favorite-venues — add a venue to favorites (by venueId or by name/city/state) */
export async function POST(req: NextRequest) {
  try {
    const user = await getDefaultUser();
    const body = await req.json();
    const venueId = body.venueId as string | undefined;
    const venueName = body.venueName as string | undefined;
    const city = body.city as string | undefined;
    const state = body.state as string | undefined;

    let venue;
    if (venueId) {
      venue = await db.venue.findUnique({ where: { id: venueId } });
      if (!venue) {
        return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
      }
    } else if (venueName && city && state) {
      const normalizedState = state.trim().toUpperCase().slice(0, 2);
      venue = await db.venue.findFirst({
        where: {
          name: { equals: venueName.trim(), mode: 'insensitive' },
          city: { equals: city.trim(), mode: 'insensitive' },
          state: normalizedState,
        },
      });
      if (!venue) {
        venue = await db.venue.create({
          data: {
            name: venueName.trim(),
            city: city.trim(),
            state: normalizedState,
            timezone: 'America/Los_Angeles',
          },
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Provide venueId or (venueName, city, state)' },
        { status: 400 }
      );
    }

    await db.userFavoriteVenue.upsert({
      where: { userId_venueId: { userId: user.id, venueId: venue.id } },
      create: { userId: user.id, venueId: venue.id },
      update: {},
    });
    return NextResponse.json({ ok: true, venue });
  } catch (e) {
    console.error('POST /api/profile/favorite-venues error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to add favorite' },
      { status: 500 }
    );
  }
}
