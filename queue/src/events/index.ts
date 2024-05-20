import { QueueEvents, QueueEventsOptions } from 'bullmq';
import { parseRedisUrl } from 'parse-redis-url-simple';

import { createLogger } from '../logger';
import { Jobs } from '../jobs';
import config from '../config';

export default function registerEvents() {
  const logger = createLogger('queue');
  const queues: Array<keyof Jobs> = ['campaign:generate'];

  const listeners = queues.map((queue) => {
    const [redis] = parseRedisUrl(config.redis.url);
    const queueEventsConfig: QueueEventsOptions = {
      connection: redis,
    };

    const queueEvents = new QueueEvents(queue, queueEventsConfig);

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      logger.info('Job completed', { job: jobId, value: returnvalue });
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
