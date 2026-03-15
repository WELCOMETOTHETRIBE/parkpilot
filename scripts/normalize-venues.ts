/**
 * Normalize us_venues_master.json using OpenAI.
 * Reads lib/serpapi/us_venues_master.json, batches rows, calls OpenAI to normalize
 * venue/city/state/type/capacity, writes lib/serpapi/us_venues_master_normalized.json.
 *
 * Usage: OPENAI_API_KEY=sk-... npx ts-node scripts/normalize-venues.ts
 * Optional: BATCH_SIZE=50 MAX_ROWS=200 (default: process all, batch 50)
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

const BATCH_SIZE = Math.min(50, parseInt(process.env.BATCH_SIZE || '50', 10));
const MAX_ROWS = process.env.MAX_ROWS ? parseInt(process.env.MAX_ROWS, 10) : undefined;
const INPUT_PATH = path.join(process.cwd(), 'lib/serpapi/us_venues_master.json');
const OUTPUT_PATH = path.join(process.cwd(), 'lib/serpapi/us_venues_master_normalized.json');

interface RawRow {
  Venue?: string;
  City?: string;
  State?: string;
  Type?: string;
  Capacity?: string;
}

export interface NormalizedVenue {
  venueName: string;
  city: string;
  state: string;
  type: string;
  capacity: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function normalizeBatch(
  openai: OpenAI,
  rows: RawRow[]
): Promise<(NormalizedVenue | null)[]> {
  const prompt = `You are normalizing US venue records. Each input record has fields Venue, City, State, Type, Capacity (any may be empty or swapped).

Rules:
- If the row represents a physical venue (stadium, arena, amphitheater, etc.), return one object: { "venueName": string, "city": string, "state": string (2-letter US state or territory, e.g. CA, NY), "type": string (e.g. Stadium, Arena, Collegiate Arena), "capacity": string (number or "") }.
- If the row is NOT a physical venue (e.g. conference name like "Atlantic 10", league name, or "State" is a year), return null.
- For 2-letter state: use standard US state abbreviation. If state is a city name, infer state where possible (e.g. Berkeley -> CA, Durham -> NC).
- venueName must be the actual venue name (e.g. "Rupp Arena", "SoFi Stadium"). If Venue is empty but City looks like a venue name and State looks like a city, use City as venueName and State as city.

Return a JSON object with a single key "items" whose value is an array of exactly ${rows.length} elements: each element is either the normalized object or null. No other text.`;

  const inputJson = JSON.stringify(
    rows.map((r) => ({
      Venue: r.Venue ?? '',
      City: r.City ?? '',
      State: r.State ?? '',
      Type: r.Type ?? '',
      Capacity: r.Capacity ?? '',
    }))
  );

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Input array:\n${inputJson}` },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty OpenAI response');

  let arr: unknown[];
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    arr = Array.isArray(parsed.items) ? parsed.items : (parsed.result ?? parsed.data ?? []) as unknown[];
  } catch {
    throw new Error(`Invalid JSON from OpenAI: ${content.slice(0, 200)}`);
  }

  if (!Array.isArray(arr)) {
    throw new Error(`Expected array, got ${typeof arr}`);
  }
  const padded = arr.length >= rows.length ? arr.slice(0, rows.length) : [...arr, ...Array(rows.length - arr.length).fill(null)];

  return padded.map((item) => {
    if (item == null) return null;
    const o = item as Record<string, unknown>;
    const venueName = typeof o.venueName === 'string' ? o.venueName : '';
    const city = typeof o.city === 'string' ? o.city : '';
    const state = typeof o.state === 'string' ? o.state : '';
    const type = typeof o.type === 'string' ? o.type : '';
    const capacity = typeof o.capacity === 'string' ? o.capacity : String(o.capacity ?? '');
    if (!venueName && !city) return null;
    return { venueName: venueName || city, city, state, type, capacity };
  });
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    console.error('Set OPENAI_API_KEY to run this script.');
    process.exit(1);
  }

  if (!fs.existsSync(INPUT_PATH)) {
    console.error('Input file not found:', INPUT_PATH);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8')) as RawRow[];
  const total = MAX_ROWS != null ? Math.min(MAX_ROWS, raw.length) : raw.length;
  const rows = raw.slice(0, total);
  console.log(`Normalizing ${rows.length} rows in batches of ${BATCH_SIZE}...`);

  const openai = new OpenAI({ apiKey });
  const results: (NormalizedVenue | null)[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    try {
      const normalized = await normalizeBatch(openai, batch);
      results.push(...normalized);
      console.log(`Batch ${batchNum}/${totalBatches} done (${results.length} total).`);
    } catch (err) {
      console.error(`Batch ${batchNum} failed:`, err);
      results.push(...batch.map(() => null));
    }
    if (i + BATCH_SIZE < rows.length) await sleep(500);
  }

  const filtered = results.filter((r): r is NormalizedVenue => r != null);
  const deduped = Array.from(
    new Map(filtered.map((r) => [`${r.venueName}|${r.city}|${r.state}`, r])).values()
  );
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2), 'utf-8');
  console.log(`Wrote ${deduped.length} normalized venues to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
