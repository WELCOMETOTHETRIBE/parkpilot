/**
 * Generate a short AI rationale for an opportunity (for display on event detail).
 */

import OpenAI from 'openai';
import { env } from '@/lib/env';

export interface OpportunityForRationale {
  eventName: string;
  eventStartTime: string;
  estimatedBuyPrice?: string | number;
  estimatedSellPrice?: string | number;
  projectedProfit?: string | number;
  opportunityScore?: number;
  confidenceScore?: number;
}

export async function generateOpportunityRationale(opp: OpportunityForRationale): Promise<string> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return '';

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You write one short sentence (under 15 words) for a parking pass arbitrage opportunity. Be direct: say whether it looks good or risky and why (margin, time to event, confidence). No preamble.',
      },
      {
        role: 'user',
        content: `Event: ${opp.eventName}. Start: ${opp.eventStartTime}. Buy: $${opp.estimatedBuyPrice ?? '?'}, Sell: $${opp.estimatedSellPrice ?? '?'}, Profit: $${opp.projectedProfit ?? '?'}. Score: ${opp.opportunityScore ?? '?'}/1000, Confidence: ${opp.confidenceScore ?? '?'}%. One sentence summary:`,
      },
    ],
    max_tokens: 60,
  });

  const text = response.choices[0]?.message?.content?.trim();
  return text ?? '';
}
