import { Queue } from 'bullmq';
import { env } from '@/lib/env';

/** Only create Redis connections when REDIS_URL is set (e.g. production with Redis). */
const connection = env.REDIS_URL ? { connection: { url: env.REDIS_URL } } : null;

function createQueues() {
  if (!connection) return null;
  return {
    discovery: new Queue('discovery', connection),
    scoring: new Queue('scoring', connection),
    ingestion: new Queue('ingestion', connection),
    alerts: new Queue('alerts', connection),
  };
}

let _queues: ReturnType<typeof createQueues> = null;
function getQueues() {
  if (_queues === null) _queues = createQueues();
  return _queues;
}

export const discoveryQueue = getQueues()?.discovery ?? null;
export const scoringQueue = getQueues()?.scoring ?? null;
export const ingestionQueue = getQueues()?.ingestion ?? null;
export const alertsQueue = getQueues()?.alerts ?? null;

export function hasRedis(): boolean {
  return !!connection;
}

export interface DiscoveryJobData {
  venueId?: string;
  venueName?: string;
  city?: string;
  state?: string;
  eventId?: string;
}

export interface ScoringJobData {
  opportunityIds?: string[];
}

export interface IngestionJobData {
  eventId: string;
}

export interface AlertsJobData {
  newOpportunityIds?: string[];
}
