import axios from 'axios';
import { env } from '@/lib/env';

const SERPAPI_BASE_URL = 'https://serpapi.com/search';

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
 * SerpApi client for event and parking discovery
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
