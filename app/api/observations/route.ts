import { db } from '@/lib/db';
import { CreateObservationSchema } from '@/lib/validators';
import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');

    const observations = await db.marketObservation.findMany({
      where: eventId ? { eventId } : undefined,
      orderBy: { observedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(observations);
  } catch (error) {
    console.error('GET /api/observations error:', error);
    return NextResponse.json({ error: 'Failed to fetch observations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateObservationSchema.parse(body);

    const observation = await db.marketObservation.create({
      data: {
        eventId: validated.eventId,
        parkingProductId: validated.parkingProductId,
        sourceId: validated.sourceId,
        observedAt: validated.observedAt,
        rawPriceText: validated.rawPriceText,
        normalizedPrice: new Decimal(validated.normalizedPrice),
        currency: validated.currency,
        availabilityText: validated.availabilityText,
        inventoryCount: validated.inventoryCount,
        pageUrl: validated.pageUrl,
        extractionMethod: validated.extractionMethod,
        transferabilityStatus: validated.transferabilityStatus,
        rawSnapshot: validated.rawSnapshot || ({} as any),
      },
      include: {
        event: true,
        source: true,
      },
    });

    // TODO: Trigger opportunity scoring job
    // For MVP, we'll just return the observation
    // In production, queue a background job to:
    // 1. Check if parking product exists
    // 2. Update opportunity scores
    // 3. Send alerts if thresholds met

    return NextResponse.json(observation, { status: 201 });
  } catch (error) {
    console.error('POST /api/observations error:', error);
    return NextResponse.json(
      { error: 'Failed to create observation' },
      { status: 400 }
    );
  }
}
