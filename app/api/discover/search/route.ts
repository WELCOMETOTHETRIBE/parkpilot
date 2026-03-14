import { discoveryService } from '@/lib/discovery/service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/discover/search?city=Los Angeles&state=CA
 * Search for venues in a city
 */
export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get('city');
    const state = req.nextUrl.searchParams.get('state');

    if (!city || !state) {
      return NextResponse.json(
        { error: 'city and state query parameters are required' },
        { status: 400 }
      );
    }

    const venues = await discoveryService.discoverVenues(city.trim(), state.trim());

    return NextResponse.json({
      success: true,
      venues,
      count: venues.length,
    });
  } catch (error) {
    console.error('GET /api/discover/search error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Search failed',
        success: false 
      },
      { status: 500 }
    );
  }
}
