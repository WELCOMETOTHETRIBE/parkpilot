/**
 * Upcoming events: SerpAPI search + OpenAI parsing.
 * Used by GET /api/upcoming-events.
 */

import { db } from '@/lib/db';
import { getDefaultUser } from '@/lib/profile';
import serpApiClient from '@/lib/serpapi/client';
import OpenAI from 'openai';
import { env } from '@/lib/env';

export interface UpcomingEventParsed {
  name: string;
  date: string;
  venueName: string;
  city: string;
  state: string;
  category: string;
  sourceUrl: string;
}

export interface UpcomingEventsOptions {
  city?: string;
  state?: string;
  venueIds?: string[];
  limit?: number;
}

async function parseWithOpenAI(
  results: Array<{ title: string; snippet: string; link: string }>
): Promise<UpcomingEventParsed[]> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey || results.length === 0) {
    return [];
  }

  const openai = new OpenAI({ apiKey });
  const text = results
    .slice(0, 50)
    .map((r, i) => `[${i}] title: ${r.title}\nsnippet: ${r.snippet || ''}\nlink: ${r.link}`)
    .join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You extract upcoming events from search result snippets. Return a JSON object with key "events" containing an array of objects. Each object must have: name (string), date (YYYY-MM-DD or best guess), venueName (string), city (string), state (2-letter if USA), category (Sports, Music, Theater, Conference, Other), sourceUrl (string, use the link from the snippet). Only include real events with a date. Skip list pages and generic guides.',
      },
      { role: 'user', content: `Extract events from these search results:\n\n${text}` },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as { events?: unknown[] };
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    return events
      .filter((e) => e && typeof e === 'object' && (e as Record<string, unknown>).name)
      .map((e) => {
        const o = e as Record<string, unknown>;
        return {
          name: String(o.name ?? ''),
          date: String(o.date ?? ''),
          venueName: String(o.venueName ?? ''),
          city: String(o.city ?? ''),
          state: String(o.state ?? ''),
          category: String(o.category ?? 'Other'),
          sourceUrl: String(o.sourceUrl ?? ''),
        };
      });
  } catch {
    return [];
  }
}

export async function fetchUpcomingEvents(opts: UpcomingEventsOptions): Promise<UpcomingEventParsed[]> {
  const { city, state, venueIds, limit = 50 } = opts;
  const year = new Date().getFullYear();
  const allResults: Array<{ title: string; snippet: string; link: string }> = [];

  if (venueIds?.length) {
    const venues = await db.venue.findMany({
      where: { id: { in: venueIds } },
      select: { id: true, name: true, city: true, state: true },
    });
    for (const venue of venues) {
      try {
        const res = await serpApiClient.search(`${venue.name} events ${year}`);
        for (const r of res.results) {
          allResults.push({
            title: r.title,
            snippet: r.snippet ?? '',
            link: r.link,
          });
        }
      } catch {
        // skip venue on error
      }
    }
  } else if (city?.trim() && state?.trim()) {
    const queries = [
      `upcoming concerts ${city} ${state} ${year}`,
      `sports events ${city} ${state} ${year}`,
      `events ${city} ${state} ${year}`,
    ];
    for (const q of queries) {
      try {
        const res = await serpApiClient.search(q);
        for (const r of res.results) {
          allResults.push({ title: r.title, snippet: r.snippet ?? '', link: r.link });
        }
      } catch {
        // skip query
      }
    }
  } else {
    return [];
  }

  if (allResults.length === 0) return [];

  const parsed = await parseWithOpenAI(allResults);

  const deduped = Array.from(
    new Map(parsed.map((e) => [`${e.name}|${e.venueName}|${e.date}`, e])).values()
  );

  const sorted = deduped
    .filter((e) => e.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);

  return sorted;
}

/** Get favorite venue IDs for the default user (for "At my favorite venues" filter). */
export async function getFavoriteVenueIds(): Promise<string[]> {
  const user = await getDefaultUser();
  const favs = await db.userFavoriteVenue.findMany({
    where: { userId: user.id },
    select: { venueId: true },
  });
  return favs.map((f) => f.venueId);
}
