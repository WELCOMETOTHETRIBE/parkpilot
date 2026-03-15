import { ingestionQueue, hasRedis } from '@/lib/queue/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  if (!hasRedis() || !ingestionQueue) {
    return NextResponse.json(
      { error: 'Job queue not available (REDIS_URL not set)' },
      { status: 503 }
    );
  }
  try {
    const body = await req.json();
    const eventId = body?.eventId;
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }
    await ingestionQueue.add('ingest-event', { eventId });
    return NextResponse.json({ ok: true, message: 'Job queued' });
  } catch (error) {
    console.error('POST /api/jobs/ingest error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to queue job' },
      { status: 500 }
    );
  }
}
