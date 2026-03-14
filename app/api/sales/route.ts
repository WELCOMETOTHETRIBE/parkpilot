import { db } from '@/lib/db';
import { CreateSaleSchema } from '@/lib/validators';
import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';

export async function GET() {
  try {
    const sales = await db.sale.findMany({
      include: {
        inventoryItem: {
          include: {
            event: true,
          },
        },
      },
      orderBy: { soldAt: 'desc' },
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error('GET /api/sales error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateSaleSchema.parse(body);

    const item = await db.inventoryItem.findUnique({
      where: { id: validated.inventoryItemId },
      include: { event: true },
    });
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }
    if (item.quantity < 1) {
      return NextResponse.json({ error: 'No quantity left to sell' }, { status: 400 });
    }

    const acquiredPricePerUnit = Decimal(item.acquiredPrice);
    const soldPrice = new Decimal(validated.soldPrice);
    const fees = new Decimal(validated.fees);
    const netProfit = soldPrice.minus(fees).minus(acquiredPricePerUnit);

    const [sale] = await db.$transaction([
      db.sale.create({
        data: {
          inventoryItemId: validated.inventoryItemId,
          soldAt: validated.soldAt,
          soldPrice: soldPrice,
          fees: fees,
          netProfit,
          saleChannel: validated.saleChannel,
          externalSaleRef: validated.externalSaleRef,
        },
        include: {
          inventoryItem: { include: { event: true } },
        },
      }),
      db.inventoryItem.update({
        where: { id: validated.inventoryItemId },
        data: {
          quantity: item.quantity - 1,
          status: item.quantity === 1 ? 'SOLD' : 'HELD',
        },
      }),
    ]);
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('POST /api/sales error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record sale' },
      { status: 400 }
    );
  }
}
