import { db } from '@/lib/db';
import Decimal from 'decimal.js';
import type { Ingestor, IngestResult, NormalizedObservation } from './types';

export interface CsvIngestorConfig {
  sourceId: string;
  eventId: string;
  rows: Array<{
    productName?: string;
    lotName?: string;
    rawPriceText: string;
    normalizedPrice: number;
    pageUrl: string;
    availabilityText?: string;
    observedAt?: string;
  }>;
}

/**
 * One-off CSV/manual batch ingestor: accepts pre-parsed rows and creates observations.
 * Used when no API is available (e.g. SpotHero/ParkWhiz partner feed as CSV).
 */
export function createCsvIngestor(config: CsvIngestorConfig): Ingestor {
  return {
    name: 'CSV/Manual batch',
    sourceType: 'manual',
    async fetchPricesForEvent(): Promise<IngestResult> {
      const errors: string[] = [];
      const observations: NormalizedObservation[] = [];

      const source = await db.source.findUnique({
        where: { id: config.sourceId },
      });
      if (!source) {
        return { eventId: config.eventId, observations: [], errors: ['Source not found'] };
      }

      const event = await db.event.findUnique({
        where: { id: config.eventId },
      });
      if (!event) {
        return { eventId: config.eventId, observations: [], errors: ['Event not found'] };
      }

      for (const row of config.rows) {
        const price = new Decimal(row.normalizedPrice);
        if (price.lte(0)) {
          errors.push(`Invalid price for ${row.productName ?? 'unknown'}`);
          continue;
        }
        observations.push({
          eventId: config.eventId,
          sourceId: config.sourceId,
          observedAt: row.observedAt ? new Date(row.observedAt) : new Date(),
          rawPriceText: row.rawPriceText,
          normalizedPrice: price,
          currency: 'USD',
          availabilityText: row.availabilityText,
          pageUrl: row.pageUrl || 'https://manual.local',
          extractionMethod: 'MANUAL',
          productName: row.productName,
          lotName: row.lotName,
        });
      }

      return { eventId: config.eventId, observations, errors };
    },
  };
}
