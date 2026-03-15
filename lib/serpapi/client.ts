import axios from 'axios';
import { env } from '@/lib/env';

const SERPAPI_BASE_URL = 'https://serpapi.com/search';

/** Max requests per minute to avoid SerpAPI rate limits. */
const RATE_LIMIT_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

const requestTimestamps: number[] = [];

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT_PER_MINUTE) {
    const wait = requestTimestamps[0] + RATE_LIMIT_WINDOW_MS - now;
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
      return waitForRateLimit();
    }
  }
  requestTimestamps.push(now);
}

export interface SerpApiSearchResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
}

export interface SerpApiDiscoveryResponse {
  results: SerpApiSearchResult[];
  totalResults?: number;
  rawResponse: Record<string, unknown>;
}

/**
 * SerpApi client for event and parking discovery (with in-memory rate limiting).
 */
export class SerpApiClient {
  private apiKey: string;

  constructor(apiKey = env.SERPAPI_API_KEY) {
    this.apiKey = apiKey;
  }

  /**
   * Search for parking opportunities for a given venue + keyword
   * Example: "SoFi Stadium parking" -> returns parking-related search results
   */
  async searchParking(query: string): Promise<SerpApiDiscoveryResponse> {
    await waitForRateLimit();
    try {
      const response = await axios.get(SERPAPI_BASE_URL, {
        params: {
          q: query,
          api_key: this.apiKey,
          engine: 'google',
          num: 20,
        },
      });

      const results: SerpApiSearchResult[] = (
        response.data.organic_results || []
      ).map((result: Record<string, unknown>) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        position: result.position,
      }));

      return {
        results,
        totalResults: response.data.search_information?.total_results,
        rawResponse: response.data,
      };
    } catch (error) {
      throw new Error(
        `SerpApi search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Search for upcoming events at a venue
   * Example: "SoFi Stadium events 2024"
   */
  async searchVenueEvents(venueName: string, year?: number): Promise<SerpApiDiscoveryResponse> {
    const yearStr = year ? ` ${year}` : '';
    return this.searchParking(`${venueName} events${yearStr}`);
  }

  /**
   * Generic search interface
   */
  async search(query: string): Promise<SerpApiDiscoveryResponse> {
    return this.searchParking(query);
  }
}

const serpApiClient = new SerpApiClient();

export default serpApiClient;
