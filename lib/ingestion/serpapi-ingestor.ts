import { db } from '@/lib/db';
import { discoveryService } from '@/lib/discovery/service';
import Decimal from 'decimal.js';
import type { Ingestor, IngestResult, NormalizedObservation } from './types';

/**
 * SerpAPI-based ingestor: uses existing DiscoveryService to find parking for an event
 * and normalizes results into observations. Does not require a separate API beyond SerpAPI.
 */
export function createSerpApiIngestor(): Ingestor {
  return {
    name: 'SerpAPI Discovery',
    sourceType: 'search_api',
    async fetchPricesForEvent(eventId: string): Promise<IngestResult> {
      const errors: string[] = [];
      const observations: NormalizedObservation[] = [];

      const event = await db.event.findUnique({
        where: { id: eventId },
        include: { venue: true },
      });
      if (!event) {
        return { eventId, observations: [], errors: ['Event not found'] };
      }

      let source = await db.source.findFirst({
        where: { name: 'SerpAPI Discovery' },
      });
      if (!source) {
        source = await db.source.create({
          data: {
            name: 'SerpAPI Discovery',
            type: 'search_api',
            baseUrl: 'https://serpapi.com',
            isActive: true,
          },
        });
      }

      try {
        const parkingOps = await discoveryService.discoverParking(
          event.name,
          event.venue?.name ?? '',
          eventId
        );

        for (const op of parkingOps) {
          const observedAt = new Date();
          const normalizedPrice = op.price ?? new Decimal(0);
          observations.push({
            eventId,
            sourceId: source.id,
            observedAt,
            rawPriceText: op.price ? `$${op.price.toString()}` : 'Price not available',
            normalizedPrice,
            currency: 'USD',
            availabilityText: op.availability,
            pageUrl: op.sourceUrl,
            extractionMethod: 'API',
            productName: op.productName,
            lotName: op.lotName,
          });
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : 'SerpAPI discovery failed');
      }

      return { eventId, observations, errors };
    },
  };
}
