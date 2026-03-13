import Decimal from 'decimal.js';
import { differenceInHours } from 'date-fns';

/**
 * Scoring Engine
 *
 * Transparent, explainable opportunity scoring based on:
 * - Margin (estimated sell price - buy price - fees)
 * - Time to event (urgency)
 * - Source reliability
 * - Observation freshness
 * - Confidence and transferability
 */

export interface ScoringInput {
  estimatedBuyPrice: Decimal;
  estimatedSellPrice: Decimal;
  estimatedFees: Decimal;
  eventStartTime: Date;
  observationTime: Date;
  sourceReliability: number; // 0-100
  confidenceScore: number; // 0-100
  transferabilityStatus: 'UNKNOWN' | 'YES' | 'NO';
  demandMultiplier?: number; // 0.5 - 2.0, default 1.0
}

export interface ScoringOutput {
  opportunityScore: number; // 0-1000
  confidenceScore: number; // 0-100
  rationale: ScoringRationale;
}

export interface ScoringRationale {
  marginDollars: number;
  marginPercent: number;
  marginScore: number;

  hoursToEvent: number;
  timeScore: number;

  sourceReliability: number;
  sourceScore: number;

  freshnessDays: number;
  freshnessScore: number;

  transferabilityPenalty: number;
  demandMultiplier: number;

  confidenceScore: number;
  finalScore: number;
  components: Array<{ name: string; value: number; weight: number }>;
}

/**
 * Compute opportunity score (0-1000)
 */
export function scoreOpportunity(input: ScoringInput): ScoringOutput {
  const {
    estimatedBuyPrice,
    estimatedSellPrice,
    estimatedFees,
    eventStartTime,
    observationTime,
    sourceReliability,
    confidenceScore,
    transferabilityStatus,
    demandMultiplier = 1.0,
  } = input;

  // 1. Margin calculation
  const margin = estimatedSellPrice.minus(estimatedBuyPrice).minus(estimatedFees);
  const marginDollars = margin.toNumber();
  const marginPercent = estimatedBuyPrice.gt(0)
    ? margin.div(estimatedBuyPrice).times(100).toNumber()
    : 0;

  // Margin score: 0-250 points
  // $40 margin = 100 pts, scales linearly up to 250 at $100+
  let marginScore = Math.min(250, Math.max(0, marginDollars * 2.5));

  // 2. Time to event
  const hoursToEvent = differenceInHours(eventStartTime, observationTime);
  let timeScore = 0;

  // Urgency: peak scores are 3-7 days before event
  // 7+ days: score 50, 3-7 days: 100, <3 days but >6hrs: 80, <6hrs: 40
  if (hoursToEvent >= 168) {
    // 7+ days
    timeScore = 50;
  } else if (hoursToEvent >= 72 && hoursToEvent < 168) {
    // 3-7 days (peak)
    timeScore = 100;
  } else if (hoursToEvent >= 6) {
    // 6hrs to 3 days
    timeScore = 80;
  } else if (hoursToEvent > 0) {
    // < 6 hours before
    timeScore = 40;
  } else {
    // Event already started or in past
    timeScore = 0;
  }

  // 3. Source reliability (0-150)
  let sourceScore = (sourceReliability / 100) * 150;

  // 4. Freshness (observation age)
  const freshnessHours = differenceInHours(new Date(), observationTime);
  let freshnessScore = 0;

  // Fresh is <6 hrs: 100, <24hrs: 80, <7 days: 50, older: 20
  if (freshnessHours < 6) {
    freshnessScore = 100;
  } else if (freshnessHours < 24) {
    freshnessScore = 80;
  } else if (freshnessHours < 168) {
    freshnessScore = 50;
  } else {
    freshnessScore = 20;
  }

  // 5. Transferability penalty (0 to -150)
  let transferabilityPenalty = 0;
  if (transferabilityStatus === 'UNKNOWN') {
    transferabilityPenalty = -100; // Major penalty for unknown
  } else if (transferabilityStatus === 'NO') {
    transferabilityPenalty = -150; // Severe penalty
  }
  // YES: no penalty

  // 6. Components and final calculation
  const components = [
    { name: 'Margin', value: marginScore, weight: 0.35 },
    { name: 'Time to Event', value: timeScore, weight: 0.25 },
    { name: 'Source Reliability', value: sourceScore, weight: 0.15 },
    { name: 'Freshness', value: freshnessScore, weight: 0.15 },
    { name: 'Transferability', value: transferabilityPenalty, weight: 0.1 },
  ];

  const baseScore =
    marginScore * 0.35 +
    timeScore * 0.25 +
    sourceScore * 0.15 +
    freshnessScore * 0.15 +
    transferabilityPenalty * 0.1;

  const adjustedScore = baseScore * demandMultiplier;
  const finalScore = Math.max(0, Math.min(1000, adjustedScore));

  // Confidence is based on provided confidence + source reliability
  const finalConfidence = Math.round((confidenceScore + sourceReliability) / 2);

  return {
    opportunityScore: Math.round(finalScore),
    confidenceScore: finalConfidence,
    rationale: {
      marginDollars,
      marginPercent,
      marginScore,
      hoursToEvent,
      timeScore,
      sourceReliability,
      sourceScore,
      freshnessDays: Math.round(freshnessHours / 24),
      freshnessScore,
      transferabilityPenalty,
      demandMultiplier,
      confidenceScore: finalConfidence,
      finalScore: Math.round(finalScore),
      components,
    },
  };
}

/**
 * Estimate source reliability (0-100) based on source type and historical accuracy
 * For MVP, use heuristics. In production, track hit rates.
 */
export function estimateSourceReliability(
  sourceType: string,
  sourceData?: { historicalAccuracy?: number }
): number {
  // If we have historical data, use it
  if (sourceData?.historicalAccuracy !== undefined) {
    return Math.min(100, sourceData.historicalAccuracy);
  }

  // Default heuristics by source type
  const reliabilityMap: Record<string, number> = {
    search_api: 85, // Official APIs are reliable
    official_website: 90,
    scraper: 70, // May have parsing errors
    manual: 60, // User input, might be outdated
    other: 50,
  };

  return reliabilityMap[sourceType] || 50;
}

/**
 * Batch score multiple opportunities
 */
export function scoreOpportunities(inputs: ScoringInput[]): ScoringOutput[] {
  return inputs.map(scoreOpportunity);
}

/**
 * Helper to describe a score in English
 */
export function describeScore(score: number): string {
  if (score >= 800) return 'Excellent';
  if (score >= 600) return 'Good';
  if (score >= 400) return 'Fair';
  if (score >= 200) return 'Poor';
  return 'Very Low';
}
