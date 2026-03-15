import { Queue } from 'bullmq';
import { env } from '@/lib/env';

const connection = env.REDIS_URL
  ? { connection: { url: env.REDIS_URL } }
  : undefined;

export const discoveryQueue = new Queue('discovery', connection ?? { connection: { host: 'localhost', port: 6379 } });
export const scoringQueue = new Queue('scoring', connection ?? { connection: { host: 'localhost', port: 6379 } });
export const ingestionQueue = new Queue('ingestion', connection ?? { connection: { host: 'localhost', port: 6379 } });
export const alertsQueue = new Queue('alerts', connection ?? { connection: { host: 'localhost', port: 6379 } });

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
