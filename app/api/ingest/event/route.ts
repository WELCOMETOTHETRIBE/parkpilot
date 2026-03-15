import { runIngestionForEvent } from '@/lib/ingestion';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventId = body?.eventId;
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }
    const result = await runIngestionForEvent(eventId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/ingest/event error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ingestion failed' },
      { status: 500 }
    );
  }
}
