/**
 * Venue master list: load normalized JSON or fallback to raw with best-effort normalize.
 * Used by GET /api/venues/master.
 */

import * as fs from 'fs';
import * as path from 'path';

const NORMALIZED_PATH = path.join(process.cwd(), 'lib/serpapi/us_venues_master_normalized.json');
const RAW_PATH = path.join(process.cwd(), 'lib/serpapi/us_venues_master.json');

export interface MasterVenue {
  venueName: string;
  city: string;
  state: string;
  type: string;
  capacity: string;
}

interface RawRow {
  Venue?: string;
  City?: string;
  State?: string;
  Type?: string;
  Capacity?: string;
}

const US_STATE_ABBREVS = new Set(
  'AL,AK,AZ,AR,CA,CO,CT,DE,FL,GA,HI,ID,IL,IN,IA,KS,KY,LA,ME,MD,MA,MI,MN,MS,MO,MT,NE,NV,NH,NJ,NM,NY,NC,ND,OH,OK,OR,PA,RI,SC,SD,TN,TX,UT,VT,VA,WA,WV,WI,WY,DC,PR,GU,VI'.split(',')
);

function looksLikeStateAbbrev(s: string): boolean {
  return s.length === 2 && US_STATE_ABBREVS.has(s.toUpperCase());
}

function looksLikeYear(s: string): boolean {
  return /^\d{4}$/.test(s.trim());
}

/** Best-effort normalize a raw row when normalized file is not available. */
function normalizeRawRow(r: RawRow): MasterVenue | null {
  const venue = (r.Venue ?? '').trim();
  const city = (r.City ?? '').trim();
  const state = (r.State ?? '').trim();
  const type = (r.Type ?? '').trim();
  const capacity = (r.Capacity ?? '').trim();

  if (!venue && !city) return null;
  if (looksLikeYear(state) || state.length > 3) return null;
  if (state.length === 2 && !looksLikeStateAbbrev(state)) return null;

  let venueName: string;
  let cityName: string;
  let stateCode: string;

  if (venue) {
    venueName = venue;
    cityName = city || state;
    stateCode = state && looksLikeStateAbbrev(state) ? state.toUpperCase() : '';
  } else {
    venueName = city;
    cityName = state;
    stateCode = '';
  }

  if (!venueName) return null;
  return { venueName, city: cityName, state: stateCode, type, capacity };
}

function loadNormalized(): MasterVenue[] | null {
  try {
    if (fs.existsSync(NORMALIZED_PATH)) {
      const data = JSON.parse(fs.readFileSync(NORMALIZED_PATH, 'utf-8'));
      return Array.isArray(data) ? data : [];
    }
  } catch {
    // ignore
  }
  return null;
}

function loadRawFallback(): MasterVenue[] {
  try {
    if (fs.existsSync(RAW_PATH)) {
      const raw = JSON.parse(fs.readFileSync(RAW_PATH, 'utf-8')) as RawRow[];
      const out: MasterVenue[] = [];
      const seen = new Set<string>();
      for (const r of raw) {
        const n = normalizeRawRow(r);
        if (n && n.venueName) {
          const key = `${n.venueName}|${n.city}|${n.state}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push(n);
          }
        }
      }
      return out;
    }
  } catch {
    // ignore
  }
  return [];
}

let cached: MasterVenue[] | null = null;

/** Get all master venues (from normalized file or raw fallback). Cached for the process. */
export function getMasterVenues(): MasterVenue[] {
  if (cached) return cached;
  const normalized = loadNormalized();
  cached = normalized ?? loadRawFallback();
  return cached;
}

/** Filter master venues by optional q, state, type. */
export function filterMasterVenues(
  venues: MasterVenue[],
  opts: { q?: string; state?: string; type?: string; limit?: number }
): MasterVenue[] {
  let list = venues;
  const q = (opts.q ?? '').trim().toLowerCase();
  const state = (opts.state ?? '').trim().toUpperCase();
  const type = (opts.type ?? '').trim().toLowerCase();
  const limit = opts.limit ?? 100;

  if (q) {
    list = list.filter(
      (v) =>
        v.venueName.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.state.toUpperCase().includes(q)
    );
  }
  if (state) list = list.filter((v) => v.state.toUpperCase() === state);
  if (type) list = list.filter((v) => v.type.toLowerCase().includes(type));

  return list.slice(0, limit);
}
