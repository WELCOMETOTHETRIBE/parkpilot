import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sources = await db.source.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(sources);
  } catch (error) {
    console.error('GET /api/sources error:', error);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}
