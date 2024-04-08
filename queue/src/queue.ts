import { Queue as BullQueue } from 'bullmq';

import { JOBS, Jobs } from './jobs';

export interface Queue {
  add<K extends keyof Jobs>(job: K, data: Jobs[K]): Promise<void>;
}

export function createQueue(): Queue {
  return {
    async add<K extends keyof Jobs>(job: K, data: Jobs[K]): Promise<void> {
      if (!JOBS.includes(job)) {
        throw new Error(`Job ${job} not found`);
      }

      const queue = new BullQueue(job);
      await queue.add(job, data);
    },
  };
}
