import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const alerts = await db.alert.findMany({
      include: {
        event: true,
        opportunity: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('GET /api/alerts error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
