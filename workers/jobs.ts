/**
 * Legacy polling job runner (JobRun table).
 * For new deployments use BullMQ workers: npx ts-node workers/run-bullmq.ts
 *
 * This stub remains for backwards compatibility when Redis is not available.
 */
import { db } from '@/lib/db';

async function runJobs() {
  console.log('Legacy job runner: Polling JobRun table (use BullMQ workers when Redis is available).');
  while (true) {
    try {
      const job = await db.jobRun.findFirst({ where: { status: 'PENDING' } });
      if (!job) {
        await new Promise((r) => setTimeout(r, 10000));
        continue;
      }
      await db.jobRun.update({
        where: { id: job.id },
        data: { status: 'RUNNING' },
      });
      await db.jobRun.update({
        where: { id: job.id },
        data: { status: 'SUCCESS', completedAt: new Date() },
      });
    } catch (error) {
      console.error('Job failed:', error);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

if (require.main === module) {
  runJobs().catch(console.error);
}

export default runJobs;
