import { env } from '@/lib/env';
import serpApiClient from '@/lib/serpapi/client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/discover?q=SoFi+Stadium+events
 * Uses SerpApi to discover events or parking-related search results.
 * Set SERPAPI_API_KEY in .env to enable (free tier at serpapi.com).
 */
export async function GET(req: NextRequest) {
  try {
    if (!env.SERPAPI_API_KEY || env.SERPAPI_API_KEY.length === 0) {
      return NextResponse.json(
        {
          error: 'Event discovery is not configured.',
          hint: 'Add SERPAPI_API_KEY to your .env file (get a free key at https://serpapi.com). You can still add events and observations manually.',
          results: [],
        },
        { status: 503 }
      );
    }
    const q = req.nextUrl.searchParams.get('q');
    if (!q || q.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required (e.g. ?q=SoFi+Stadium+events)' },
        { status: 400 }
      );
    }
    const results = await serpApiClient.search(q.trim());
    return NextResponse.json({
      query: q.trim(),
      results: results.results,
      totalResults: results.totalResults,
    });
  } catch (error) {
    console.error('GET /api/discover error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    );
  }
}
