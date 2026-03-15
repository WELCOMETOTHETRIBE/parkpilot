import Decimal from 'decimal.js';

/**
 * Normalized observation from any ingestion source (API, scraper, CSV).
 */
export interface NormalizedObservation {
  eventId: string;
  parkingProductId?: string;
  sourceId: string;
  observedAt: Date;
  rawPriceText: string;
  normalizedPrice: Decimal;
  currency: string;
  availabilityText?: string;
  inventoryCount?: number;
  pageUrl: string;
  extractionMethod: 'API' | 'SELENIUM' | 'MANUAL';
  transferabilityStatus?: 'UNKNOWN' | 'YES' | 'NO';
  productName?: string;
  lotName?: string;
}

/**
 * Result of fetching prices for an event from one or more sources.
 */
export interface IngestResult {
  eventId: string;
  observations: NormalizedObservation[];
  errors: string[];
}

/**
 * Ingestor interface: fetch prices (and optionally availability) for an event.
 */
export interface Ingestor {
  name: string;
  sourceType: string;
  fetchPricesForEvent(eventId: string): Promise<IngestResult>;
}
