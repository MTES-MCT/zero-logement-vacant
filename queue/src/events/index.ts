import { QueueEvents } from 'bullmq';
import { createLogger } from '../logger';
import { Jobs } from '../jobs';

export default function registerEvents() {
  const logger = createLogger('queue');
  const queues: Array<keyof Jobs> = ['campaign:generate'];

  const listeners = queues.map((queue) => {
    const queueEvents = new QueueEvents(queue);

    queueEvents.on('completed', ({ jobId }) => {
      logger.info('Job completed', { job: jobId });
    });

    queueEvents.on('error', (error) => {
      logger.error(error);
    });

    queueEvents.on('failed', ({ failedReason, jobId }) => {
      logger.error('Job failed', {
        job: jobId,
        reason: failedReason,
      });
    });
  });

  logger.info('Events registered');
  return listeners;
}
