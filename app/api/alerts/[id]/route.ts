import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const alert = await db.alert.findUnique({ where: { id } });
    if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    const updated = await db.alert.update({
      where: { id },
      data: { status: 'DISMISSED' },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/alerts/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
