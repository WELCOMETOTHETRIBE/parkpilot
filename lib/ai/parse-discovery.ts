/**
 * Optional OpenAI parsing of SerpAPI discovery results (events and parking).
 * Used by DiscoveryService when OPENAI_API_KEY is set.
 */

import OpenAI from 'openai';
import { env } from '@/lib/env';
import Decimal from 'decimal.js';

export interface ParsedEventFromAI {
  name: string;
  category: string;
  startTime: Date;
  sourceUrl: string;
}

export interface ParsedParkingFromAI {
  productName: string;
  lotName?: string;
  sourceUrl: string;
  price?: Decimal;
  availability?: string;
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  return apiKey ? new OpenAI({ apiKey }) : null;
}

/**
 * Parse SerpAPI event-search results into structured events using OpenAI.
 */
export async function parseEventsFromSerpResults(
  results: Array<{ title: string; snippet: string; link: string }>,
  venueName: string
): Promise<ParsedEventFromAI[]> {
  const openai = getOpenAIClient();
  if (!openai || results.length === 0) return [];

  const year = new Date().getFullYear();
  const text = results
    .slice(0, 40)
    .map((r, i) => `[${i}] ${r.title}\n${r.snippet || ''}\n${r.link}`)
    .join('\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract upcoming events at or near "${venueName}" from search results. Return JSON object with key "events": array of { "name": string, "category": "Sports"|"Music"|"Theater"|"Conference"|"Other", "date": "YYYY-MM-DD", "sourceUrl": string }. Use the link from the snippet for sourceUrl. Only include real events with a date in ${year} or ${year + 1}. Skip list/schedule pages.`,
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return [];

    const parsed = JSON.parse(content) as { events?: Array<{ name: string; category: string; date: string; sourceUrl: string }> };
    const events = Array.isArray(parsed.events) ? parsed.events : [];

    return events.map((e) => {
      const startTime = new Date(e.date);
      if (Number.isNaN(startTime.getTime())) startTime.setFullYear(year);
      return {
        name: e.name,
        category: e.category || 'Other',
        startTime,
        sourceUrl: e.sourceUrl || '',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Parse SerpAPI parking-search results into structured parking opportunities using OpenAI.
 */
export async function parseParkingFromSerpResults(
  results: Array<{ title: string; snippet: string; link: string }>
): Promise<ParsedParkingFromAI[]> {
  const openai = getOpenAIClient();
  if (!openai || results.length === 0) return [];

  const text = results
    .slice(0, 30)
    .map((r, i) => `[${i}] ${r.title}\n${r.snippet || ''}\n${r.link}`)
    .join('\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Extract parking offers from search results. Return JSON object with key "parking": array of { "productName": string, "lotName": string or null, "sourceUrl": string, "price": number or null (USD), "availability": string or null }. Only include real parking products/lots. Use the link from the snippet for sourceUrl.',
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return [];

    const parsed = JSON.parse(content) as {
      parking?: Array<{ productName: string; lotName?: string | null; sourceUrl: string; price?: number | null; availability?: string | null }>;
    };
    const parking = Array.isArray(parsed.parking) ? parsed.parking : [];

    return parking.map((p) => ({
      productName: p.productName || 'Parking',
      lotName: p.lotName ?? undefined,
      sourceUrl: p.sourceUrl || '',
      price: p.price != null && p.price > 0 ? new Decimal(p.price) : undefined,
      availability: p.availability ?? undefined,
    }));
  } catch {
    return [];
  }
}
