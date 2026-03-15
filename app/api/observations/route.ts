import { db } from '@/lib/db';
import { scoreOpportunity, estimateSourceReliability } from '@/lib/scoring/engine';
import { CreateObservationSchema } from '@/lib/validators';
import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get('eventId') || undefined;
    const sourceId = searchParams.get('sourceId') || undefined;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '100', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const where = {
      ...(eventId && { eventId }),
      ...(sourceId && { sourceId }),
    };

    const [observations, total] = await Promise.all([
      db.marketObservation.findMany({
        where,
        orderBy: { observedAt: 'desc' },
        take: limit,
        skip: offset,
        include: { event: true, source: true },
      }),
      db.marketObservation.count({ where }),
    ]);

    return NextResponse.json({ data: observations, total });
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
        rawSnapshot: (validated.rawSnapshot ?? {}) as object,
      },
    });

    const [event, source, parkingProduct] = await Promise.all([
      db.event.findUnique({ where: { id: observation.eventId } }),
      db.source.findUnique({ where: { id: observation.sourceId } }),
      observation.parkingProductId
        ? db.parkingProduct.findUnique({ where: { id: observation.parkingProductId } })
        : Promise.resolve(null),
    ]);
    if (!event || !source) {
      return NextResponse.json(observation, { status: 201 });
    }
    const transferability =
      (observation.transferabilityStatus as 'UNKNOWN' | 'YES' | 'NO') ??
      parkingProduct?.transferabilityStatus ??
      'UNKNOWN';
    const sourceReliability = estimateSourceReliability(source.type, source.config as { historicalAccuracy?: number });
    const buyPrice = new Decimal(validated.normalizedPrice);
    const estimatedSell = buyPrice.times(1.3);
    const estimatedFees = new Decimal(5);
    const margin = estimatedSell.minus(buyPrice).minus(estimatedFees);
    const { opportunityScore, confidenceScore, rationale } = scoreOpportunity({
      estimatedBuyPrice: buyPrice,
      estimatedSellPrice: estimatedSell,
      estimatedFees,
      eventStartTime: event.startTime,
      observationTime: validated.observedAt,
      sourceReliability,
      confidenceScore: 50,
      transferabilityStatus: transferability,
      demandMultiplier: 1.0,
    });

    const existing = await db.opportunity.findFirst({
      where: {
        eventId: validated.eventId,
        sourceId: validated.sourceId,
        parkingProductId: validated.parkingProductId ?? null,
      },
    });

    const rationaleJson = JSON.parse(JSON.stringify(rationale)) as object;
    if (existing) {
      await db.opportunity.update({
        where: { id: existing.id },
        data: {
          latestObservationId: observation.id,
          estimatedBuyPrice: buyPrice,
          estimatedSellPrice: estimatedSell,
          estimatedFees,
          projectedProfit: margin,
          opportunityScore,
          confidenceScore,
          rationale: rationaleJson,
        },
      });
    } else {
      await db.opportunity.create({
        data: {
          eventId: validated.eventId,
          sourceId: validated.sourceId,
          parkingProductId: validated.parkingProductId ?? null,
          latestObservationId: observation.id,
          estimatedBuyPrice: buyPrice,
          estimatedSellPrice: estimatedSell,
          estimatedFees,
          projectedProfit: margin,
          opportunityScore,
          confidenceScore,
          rationale: rationaleJson,
          status: 'OPEN',
        },
      });
    }

    const observationWithIncludes = await db.marketObservation.findUnique({
      where: { id: observation.id },
      include: { event: true, source: true },
    });
    return NextResponse.json(observationWithIncludes ?? observation, { status: 201 });
  } catch (error) {
    console.error('POST /api/observations error:', error);
    return NextResponse.json(
      { error: 'Failed to create observation' },
      { status: 400 }
    );
  }
}
