/**
 * BullMQ worker entrypoint.
 * Run with: npx ts-node workers/run-bullmq.ts
 * Or: node dist/workers/run-bullmq.js (after build)
 *
 * Requires REDIS_URL (or Redis on localhost:6379).
 */
import { startWorkers } from '../lib/queue/worker';

console.log('Starting BullMQ workers...');
startWorkers();
console.log('Workers running. Ctrl+C to stop.');
