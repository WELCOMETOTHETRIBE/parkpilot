import { scoreOpportunity, ScoringInput, describeScore } from '@/lib/scoring/engine';
import Decimal from 'decimal.js';

describe('Scoring Engine', () => {
  it('should score a strong opportunity', () => {
    const now = new Date();
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const input: ScoringInput = {
      estimatedBuyPrice: new Decimal('35'),
      estimatedSellPrice: new Decimal('60'),
      estimatedFees: new Decimal('5'),
      eventStartTime: in5Days,
      observationTime: now,
      sourceReliability: 85,
      confidenceScore: 75,
      transferabilityStatus: 'YES',
      demandMultiplier: 1.0,
    };

    const result = scoreOpportunity(input);

    // Should score >500 for this strong opportunity
    expect(result.opportunityScore).toBeGreaterThan(500);
    expect(result.confidenceScore).toBeGreaterThan(70);
    expect(result.rationale.marginDollars).toBe(20);
    expect(result.rationale.marginPercent).toBeCloseTo(57.14, 1);
  });

  it('should penalize unknown transferability', () => {
    const now = new Date();
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const input: ScoringInput = {
      estimatedBuyPrice: new Decimal('35'),
      estimatedSellPrice: new Decimal('60'),
      estimatedFees: new Decimal('5'),
      eventStartTime: in5Days,
      observationTime: now,
      sourceReliability: 85,
      confidenceScore: 75,
      transferabilityStatus: 'UNKNOWN',
    };

    const result = scoreOpportunity(input);

    // Should score lower due to unknown transferability
    expect(result.rationale.transferabilityPenalty).toBe(-100);
  });

  it('should describe scores correctly', () => {
    expect(describeScore(850)).toBe('Excellent');
    expect(describeScore(650)).toBe('Good');
    expect(describeScore(450)).toBe('Fair');
    expect(describeScore(250)).toBe('Poor');
    expect(describeScore(50)).toBe('Very Low');
  });

  it('should handle demand multiplier', () => {
    const now = new Date();
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const baseInput: ScoringInput = {
      estimatedBuyPrice: new Decimal('35'),
      estimatedSellPrice: new Decimal('60'),
      estimatedFees: new Decimal('5'),
      eventStartTime: in5Days,
      observationTime: now,
      sourceReliability: 85,
      confidenceScore: 75,
      transferabilityStatus: 'YES',
      demandMultiplier: 1.0,
    };

    const base = scoreOpportunity(baseInput);

    const highDemand: ScoringInput = {
      ...baseInput,
      demandMultiplier: 1.5,
    };

    const high = scoreOpportunity(highDemand);

    // High demand should score higher
    expect(high.opportunityScore).toBeGreaterThan(base.opportunityScore);
  });
});
