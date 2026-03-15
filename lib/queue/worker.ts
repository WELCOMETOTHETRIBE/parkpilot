import { Worker, Job } from 'bullmq';
import Decimal from 'decimal.js';
import { db } from '@/lib/db';
import { discoveryService } from '@/lib/discovery/service';
import { runIngestionForEvent } from '@/lib/ingestion';
import { scoreOpportunity, estimateSourceReliability } from '@/lib/scoring/engine';
import { evaluateAlertRules } from '@/lib/alerts/rules';
import { processPendingAlerts } from '@/lib/alerts/send';
import type { DiscoveryJobData, IngestionJobData, AlertsJobData } from './client';
import { env } from '@/lib/env';

const connection = env.REDIS_URL
  ? { connection: { url: env.REDIS_URL } }
  : { connection: { host: 'localhost', port: 6379 } };

async function handleDiscovery(job: Job<DiscoveryJobData>) {
  const { venueName, city, state, eventId } = job.data;
  if (eventId) {
    await runIngestionForEvent(eventId);
    return;
  }
  if (venueName && city && state) {
    await discoveryService.discoverVenueWithEvents(venueName, city, state);
  }
}

async function handleScoring() {
  const opportunities = await db.opportunity.findMany({
    where: { status: 'OPEN' },
    include: { latestObservation: true, event: true, source: true, parkingProduct: true },
  });
  for (const opp of opportunities) {
    const obs = opp.latestObservation;
    if (!obs || !opp.event || !opp.source) continue;
    const product = opp.parkingProduct;
    const rel = estimateSourceReliability(opp.source.type, opp.source.config as { historicalAccuracy?: number });
    const buy = new Decimal(obs.normalizedPrice.toString());
    const sell = opp.estimatedSellPrice ? new Decimal(opp.estimatedSellPrice.toString()) : buy.times(1.3);
    const fees = opp.estimatedFees ? new Decimal(opp.estimatedFees.toString()) : new Decimal(5);
    const { opportunityScore, confidenceScore, rationale } = scoreOpportunity({
      estimatedBuyPrice: buy,
      estimatedSellPrice: sell,
      estimatedFees: fees,
      eventStartTime: opp.event.startTime,
      observationTime: obs.observedAt,
      sourceReliability: rel,
      confidenceScore: 50,
      transferabilityStatus: (product?.transferabilityStatus ?? 'UNKNOWN') as 'UNKNOWN' | 'YES' | 'NO',
    });
    await db.opportunity.update({
      where: { id: opp.id },
      data: { opportunityScore, confidenceScore, rationale: rationale as object },
    });
  }
}

async function handleIngestion(job: Job<IngestionJobData>) {
  await runIngestionForEvent(job.data.eventId);
}

async function handleAlerts(job: Job<AlertsJobData>) {
  await evaluateAlertRules({ newOpportunityIds: job.data.newOpportunityIds });
  await processPendingAlerts();
}

export function startWorkers() {
  const discoveryWorker = new Worker<DiscoveryJobData>('discovery', handleDiscovery, connection);
  const scoringWorker = new Worker('scoring', handleScoring, connection);
  const ingestionWorker = new Worker<IngestionJobData>('ingestion', handleIngestion, connection);
  const alertsWorker = new Worker<AlertsJobData>('alerts', handleAlerts, connection);

  discoveryWorker.on('failed', (j, err) => console.error('discovery job failed', j?.id, err));
  scoringWorker.on('failed', (j, err) => console.error('scoring job failed', j?.id, err));
  ingestionWorker.on('failed', (j, err) => console.error('ingestion job failed', j?.id, err));
  alertsWorker.on('failed', (j, err) => console.error('alerts job failed', j?.id, err));

  return { discoveryWorker, scoringWorker, ingestionWorker, alertsWorker };
}
