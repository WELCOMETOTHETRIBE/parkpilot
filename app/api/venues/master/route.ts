import { getMasterVenues, filterMasterVenues } from '@/lib/serpapi/venues-master';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/venues/master?q=...&state=...&type=...&limit=...
 * Search/browse normalized US venue master list (from us_venues_master_normalized.json or raw fallback).
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q') ?? undefined;
    const state = searchParams.get('state') ?? undefined;
    const type = searchParams.get('type') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10))) : 100;

    const all = getMasterVenues();
    const venues = filterMasterVenues(all, { q, state, type, limit });

    return NextResponse.json({
      success: true,
      venues,
      count: venues.length,
      totalAvailable: all.length,
    });
  } catch (error) {
    console.error('GET /api/venues/master error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch master venues', success: false },
      { status: 500 }
    );
  }
}
