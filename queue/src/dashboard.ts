import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { Queue } from 'bullmq';
import { parseRedisUrl } from 'parse-redis-url-simple';

import { JOBS } from './jobs';
import config from './config';

const expressAdapter = new ExpressAdapter();
expressAdapter.setBasePath('/queues');

const [redis] = parseRedisUrl(config.redis.url);

const queues = JOBS.map(
  (job) =>
    new Queue(job, {
      connection: redis
    })
).map((queue) => new BullMQAdapter(queue));

createBullBoard({
  queues,
  serverAdapter: expressAdapter
});

export const createDashboard = () => expressAdapter.getRouter();
