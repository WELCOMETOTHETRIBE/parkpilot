import { db } from '@/lib/db';

export type AlertRuleType = 'HIGH_SCORE_OPPORTUNITY' | 'PRICE_DROP' | 'LOW_INVENTORY';

interface ThresholdConfig {
  minScore?: number;
  priceDropPercent?: number;
  maxInventory?: number;
}

/**
 * Evaluate alert rules and create Alert records (PENDING) for delivery.
 * Call after discovery/scoring runs.
 */
export async function evaluateAlertRules(opts: {
  newOpportunityIds?: string[];
  eventIdsChecked?: string[];
}): Promise<number> {
  const rules = await db.alertRule.findMany({
    where: { isActive: true },
  });
  let created = 0;

  for (const rule of rules) {
    const threshold = (rule.threshold as ThresholdConfig) || {};

    if (rule.type === 'HIGH_SCORE_OPPORTUNITY' && opts.newOpportunityIds?.length) {
      const minScore = threshold.minScore ?? 600;
      for (const oppId of opts.newOpportunityIds) {
        const opp = await db.opportunity.findUnique({
          where: { id: oppId },
          include: { event: true },
        });
        if (opp && opp.opportunityScore >= minScore) {
          if (rule.eventId && opp.eventId !== rule.eventId) continue;
          await db.alert.create({
            data: {
              eventId: opp.eventId,
              opportunityId: oppId,
              channel: rule.channel,
              message: `High-score opportunity: ${opp.event?.name ?? 'Event'} (score ${opp.opportunityScore})`,
              status: 'PENDING',
            },
          });
          created++;
        }
      }
    }

    if (rule.type === 'LOW_INVENTORY' && rule.eventId) {
      const maxInv = threshold.maxInventory ?? 2;
      const count = await db.inventoryItem.count({
        where: { eventId: rule.eventId, status: 'HELD' },
      });
      const totalQty = await db.inventoryItem.aggregate({
        where: { eventId: rule.eventId, status: 'HELD' },
        _sum: { quantity: true },
      });
      const qty = totalQty._sum.quantity ?? 0;
      if (qty <= maxInv && count > 0) {
        const event = await db.event.findUnique({ where: { id: rule.eventId } });
        await db.alert.create({
          data: {
            eventId: rule.eventId,
            channel: rule.channel,
            message: `Low inventory for ${event?.name ?? 'event'}: ${qty} passes left.`,
            status: 'PENDING',
          },
        });
        created++;
      }
    }
  }

  return created;
}

/**
 * Create a one-off alert (e.g. from job or API).
 */
export async function createAlert(data: {
  eventId?: string;
  opportunityId?: string;
  channel: string;
  message: string;
}): Promise<void> {
  await db.alert.create({
    data: { ...data, status: 'PENDING' },
  });
}
