import { QueueEvents, QueueEventsOptions } from 'bullmq';
import { parseRedisUrl } from 'parse-redis-url-simple';

import { createLogger } from '../logger';
import { Jobs } from '../jobs';
import config from '../config';

import sentry from '../sentry';

export default function registerEvents() {
  const logger = createLogger('queue');
  const queues: Array<keyof Jobs> = ['campaign-generate'];

  sentry.init();

  const listeners = queues.map((queue) => {
    const [redis] = parseRedisUrl(config.redis.url);
    const queueEventsConfig: QueueEventsOptions = {
      connection: redis
    };

    const queueEvents = new QueueEvents(queue, queueEventsConfig);

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      logger.info('Job completed', { job: jobId, value: returnvalue });
    });

    queueEvents.on('error', (error) => {
      sentry.captureException(new Error(error.message), {
        extra: { queue: error.name },
      });

      logger.error(error);
    });

    queueEvents.on('failed', ({ failedReason, jobId }) => {
      sentry.captureException(new Error(failedReason), {
        extra: { jobId: jobId, queue: queue },
      });

      logger.error('Job failed', {
        job: jobId,
        reason: failedReason
      });
    });

    queueEvents.on('delayed', ({ delay, jobId }) => {
      sentry.captureException(new Error(`Job delayed by ${delay}ms`), {
        extra: { jobId: jobId, queue: queue },
      });

      logger.error('Job delayed', {
        job: jobId,
        delay: delay
      });
    });
  });

  logger.info('Events registered');
  return listeners;
}
