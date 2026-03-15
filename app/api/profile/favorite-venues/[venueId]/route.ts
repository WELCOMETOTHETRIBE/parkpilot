import { db } from '@/lib/db';
import { getDefaultUser } from '@/lib/profile';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** DELETE /api/profile/favorite-venues/[venueId] — remove venue from favorites */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  try {
    const { venueId } = await params;
    const user = await getDefaultUser();
    await db.userFavoriteVenue.deleteMany({
      where: { userId: user.id, venueId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/profile/favorite-venues/[venueId] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
