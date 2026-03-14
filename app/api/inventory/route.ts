import { db } from '@/lib/db';
import { CreateInventorySchema } from '@/lib/validators';
import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';

export async function GET() {
  try {
    const inventory = await db.inventoryItem.findMany({
      include: {
        event: true,
      },
      orderBy: { acquiredAt: 'desc' },
    });
    return NextResponse.json(inventory);
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateInventorySchema.parse(body);

    const event = await db.event.findUnique({
      where: { id: validated.eventId },
      select: { venueId: true },
    });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const inventory = await db.inventoryItem.create({
      data: {
        eventId: validated.eventId,
        parkingProductId: validated.parkingProductId,
        venueId: event.venueId,
        acquiredAt: validated.acquiredAt,
        acquiredPrice: new Decimal(validated.acquiredPrice),
        quantity: validated.quantity,
        source: validated.source,
        externalOrderRef: validated.externalOrderRef,
        notes: validated.notes,
        status: 'HELD',
      },
      include: { event: true },
    });
    return NextResponse.json(inventory, { status: 201 });
  } catch (error) {
    console.error('POST /api/inventory error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create inventory' },
      { status: 400 }
    );
  }
}
