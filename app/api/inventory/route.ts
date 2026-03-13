import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

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
