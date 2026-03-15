import { db } from '@/lib/db';
import { scoreOpportunity, estimateSourceReliability } from '@/lib/scoring/engine';
import Decimal from 'decimal.js';
import type { IngestResult } from './types';
import { createSerpApiIngestor } from './serpapi-ingestor';

export * from './types';
export { createSerpApiIngestor } from './serpapi-ingestor';
export { createCsvIngestor } from './csv-ingestor';
export type { CsvIngestorConfig } from './csv-ingestor';

/**
 * Persist ingest result: create MarketObservation records and upsert Opportunity with scoring.
 */
export async function persistIngestResult(result: IngestResult): Promise<{ observationsCreated: number; opportunitiesUpdated: number }> {
  let observationsCreated = 0;
  let opportunitiesUpdated = 0;

  for (const obs of result.observations) {
    const event = await db.event.findUnique({ where: { id: obs.eventId } });
    const source = await db.source.findUnique({ where: { id: obs.sourceId } });
    if (!event || !source) continue;

    let parkingProductId: string | null = obs.parkingProductId ?? null;
    if (obs.productName && !parkingProductId) {
      const product = await db.parkingProduct.findFirst({
        where: { eventId: obs.eventId, sourceId: obs.sourceId, productName: obs.productName },
      });
      if (product) parkingProductId = product.id;
      else {
        const created = await db.parkingProduct.create({
          data: {
            eventId: obs.eventId,
            sourceId: obs.sourceId,
            productName: obs.productName,
            lotName: obs.lotName,
            sourceUrl: obs.pageUrl,
            transferabilityStatus: obs.transferabilityStatus ?? 'UNKNOWN',
          },
        });
        parkingProductId = created.id;
      }
    }

    const observation = await db.marketObservation.create({
      data: {
        eventId: obs.eventId,
        parkingProductId,
        sourceId: obs.sourceId,
        observedAt: obs.observedAt,
        rawPriceText: obs.rawPriceText,
        normalizedPrice: obs.normalizedPrice,
        currency: obs.currency,
        availabilityText: obs.availabilityText,
        inventoryCount: obs.inventoryCount,
        pageUrl: obs.pageUrl,
        extractionMethod: obs.extractionMethod,
        transferabilityStatus: obs.transferabilityStatus,
      },
    });
    observationsCreated++;

    if (obs.normalizedPrice.gt(0)) {
      const estimatedFees = new Decimal(5);
      const estimatedSell = obs.normalizedPrice.times(1.3);
      const margin = estimatedSell.minus(obs.normalizedPrice).minus(estimatedFees);
      const sourceReliability = estimateSourceReliability(source.type, source.config as { historicalAccuracy?: number });
      const product = parkingProductId ? await db.parkingProduct.findUnique({ where: { id: parkingProductId } }) : null;
      const transferability = (obs.transferabilityStatus ?? product?.transferabilityStatus ?? 'UNKNOWN') as 'UNKNOWN' | 'YES' | 'NO';
      const { opportunityScore, confidenceScore, rationale } = scoreOpportunity({
        estimatedBuyPrice: obs.normalizedPrice,
        estimatedSellPrice: estimatedSell,
        estimatedFees,
        eventStartTime: event.startTime,
        observationTime: obs.observedAt,
        sourceReliability,
        confidenceScore: 50,
        transferabilityStatus: transferability,
        demandMultiplier: 1.0,
      });

      const existing = await db.opportunity.findFirst({
        where: {
          eventId: obs.eventId,
          sourceId: obs.sourceId,
          parkingProductId,
        },
      });

      const rationaleJson = JSON.parse(JSON.stringify(rationale)) as object;
      if (existing) {
        await db.opportunity.update({
          where: { id: existing.id },
          data: {
            latestObservationId: observation.id,
            estimatedBuyPrice: obs.normalizedPrice,
            estimatedSellPrice: estimatedSell,
            estimatedFees,
            projectedProfit: margin,
            opportunityScore,
            confidenceScore,
            rationale: rationaleJson,
          },
        });
        opportunitiesUpdated++;
      } else {
        await db.opportunity.create({
          data: {
            eventId: obs.eventId,
            sourceId: obs.sourceId,
            parkingProductId,
            latestObservationId: observation.id,
            estimatedBuyPrice: obs.normalizedPrice,
            estimatedSellPrice: estimatedSell,
            estimatedFees,
            projectedProfit: margin,
            opportunityScore,
            confidenceScore,
            rationale: rationaleJson,
            status: 'OPEN',
          },
        });
        opportunitiesUpdated++;
      }
    }
  }

  return { observationsCreated, opportunitiesUpdated };
}

/**
 * Run ingestion for an event using the SerpAPI ingestor (default).
 */
export async function runIngestionForEvent(eventId: string): Promise<IngestResult & { observationsCreated: number; opportunitiesUpdated: number }> {
  const ingestor = createSerpApiIngestor();
  const result = await ingestor.fetchPricesForEvent(eventId);
  const { observationsCreated, opportunitiesUpdated } = await persistIngestResult(result);
  return { ...result, observationsCreated, opportunitiesUpdated };
}

/**
 * Get registered ingestors (for UI or job routing). SpotHero/ParkWhiz can be added when APIs are available.
 */
export function getRegisteredIngestors(): Array<{ name: string; sourceType: string }> {
  return [
    { name: 'SerpAPI Discovery', sourceType: 'search_api' },
    { name: 'CSV/Manual batch', sourceType: 'manual' },
  ];
}
