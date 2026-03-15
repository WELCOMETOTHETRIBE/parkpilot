import { differenceInDays } from 'date-fns';

export interface DemandForecastInput {
  eventStartTime: Date;
  category: string;
  venueId?: string;
  historicalPrices?: number[];
  resaleTrend?: 'up' | 'down' | 'stable';
}

export interface DemandForecastOutput {
  demandLevel: number;
  recommendedBuyPrice?: number;
  recommendedSellPrice?: number;
}

/**
 * Rule-based demand forecast (v1). No ML.
 * - demandLevel: 0.5 to 2.0 multiplier (1.0 = normal).
 * - Uses days to event, category, and optional resale trend.
 */
export function forecastDemand(input: DemandForecastInput): DemandForecastOutput {
  const { eventStartTime, category, historicalPrices, resaleTrend } = input;
  const now = new Date();
  const daysToEvent = differenceInDays(eventStartTime, now);

  let demandLevel = 1.0;

  if (daysToEvent <= 0) demandLevel = 0.3;
  else if (daysToEvent <= 3) demandLevel = 1.4;
  else if (daysToEvent <= 7) demandLevel = 1.2;
  else if (daysToEvent <= 14) demandLevel = 1.0;
  else if (daysToEvent <= 30) demandLevel = 0.9;
  else demandLevel = 0.8;

  if (category === 'Sports') demandLevel *= 1.1;
  else if (category === 'Music') demandLevel *= 1.15;

  if (resaleTrend === 'up') demandLevel *= 1.1;
  else if (resaleTrend === 'down') demandLevel *= 0.95;

  demandLevel = Math.max(0.5, Math.min(2.0, demandLevel));

  let recommendedBuyPrice: number | undefined;
  let recommendedSellPrice: number | undefined;
  if (historicalPrices && historicalPrices.length > 0) {
    const avg = historicalPrices.reduce((a, b) => a + b, 0) / historicalPrices.length;
    const min = Math.min(...historicalPrices);
    recommendedBuyPrice = min * 0.95;
    recommendedSellPrice = avg * demandLevel * 1.2;
  }

  return { demandLevel, recommendedBuyPrice, recommendedSellPrice };
}
