import { db } from '@/lib/db';
import { CreateEventSchema } from '@/lib/validators';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const events = await db.event.findMany({
      include: { venue: true },
      orderBy: { startTime: 'asc' },
    });
    return NextResponse.json(events);
  } catch (error) {
    console.error('GET /api/events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateEventSchema.parse(body);

    const event = await db.event.create({
      data: {
        ...validated,
        status: validated.status || 'UPCOMING',
      },
      include: { venue: true },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('POST /api/events error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 400 });
  }
}
