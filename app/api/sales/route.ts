import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

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
