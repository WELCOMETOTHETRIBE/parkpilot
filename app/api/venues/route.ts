import { db } from '@/lib/db';
import { CreateVenueSchema } from '@/lib/validators';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const venues = await db.venue.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(venues);
  } catch (error) {
    console.error('GET /api/venues error:', error);
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateVenueSchema.parse(body);

    const venue = await db.venue.create({
      data: validated,
    });

    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    console.error('POST /api/venues error:', error);
    return NextResponse.json({ error: 'Failed to create venue' }, { status: 400 });
  }
}
