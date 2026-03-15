import Decimal from 'decimal.js';
import { forecastDemand, type DemandForecastOutput } from '@/lib/forecasting/demand';
import { scoreOpportunity, estimateSourceReliability } from '@/lib/scoring/engine';

export interface PricingEngineInput {
  eventId: string;
  eventStartTime: Date;
  category: string;
  venueId?: string;
  currentObservationPrice: Decimal;
  sourceId: string;
  sourceType: string;
  sourceConfig?: { historicalAccuracy?: number };
  historicalPrices?: number[];
  resaleTrend?: 'up' | 'down' | 'stable';
  transferabilityStatus: 'UNKNOWN' | 'YES' | 'NO';
}

export interface PricingEngineOutput {
  recommendedBuyPrice: Decimal;
  recommendedSellPrice: Decimal;
  confidence: number;
  demandLevel: number;
  rationale: string;
}

/**
 * Dynamic pricing engine: combines current observation, demand forecast, and scoring.
 */
export function runPricingEngine(input: PricingEngineInput): PricingEngineOutput {
  const forecast: DemandForecastOutput = forecastDemand({
    eventStartTime: input.eventStartTime,
    category: input.category,
    venueId: input.venueId,
    historicalPrices: input.historicalPrices,
    resaleTrend: input.resaleTrend,
  });

  const demandMultiplier = forecast.demandLevel;
  const buyPrice = input.currentObservationPrice;
  const suggestedSell = forecast.recommendedSellPrice != null
    ? new Decimal(forecast.recommendedSellPrice)
    : buyPrice.times(1.25).times(demandMultiplier);
  const fees = new Decimal(5);
  const sourceReliability = estimateSourceReliability(input.sourceType, input.sourceConfig);

  const { confidenceScore } = scoreOpportunity({
    estimatedBuyPrice: buyPrice,
    estimatedSellPrice: suggestedSell,
    estimatedFees: fees,
    eventStartTime: input.eventStartTime,
    observationTime: new Date(),
    sourceReliability,
    confidenceScore: 50,
    transferabilityStatus: input.transferabilityStatus,
    demandMultiplier,
  });

  const recommendedBuyPrice = forecast.recommendedBuyPrice != null
    ? new Decimal(forecast.recommendedBuyPrice)
    : buyPrice;
  const recommendedSellPrice = suggestedSell;

  return {
    recommendedBuyPrice,
    recommendedSellPrice,
    confidence: confidenceScore,
    demandLevel: forecast.demandLevel,
    rationale: `Demand level ${forecast.demandLevel.toFixed(2)} (days to event, category, resale trend). Suggested sell at ${recommendedSellPrice.toFixed(2)}.`,
  };
}
