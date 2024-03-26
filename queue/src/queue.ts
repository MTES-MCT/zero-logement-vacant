import { Queue as BullQueue } from 'bullmq';

import { Jobs } from './jobs';

export interface Queue {
  add<K extends keyof Jobs>(job: K, data: Jobs[K]): Promise<void>;
}

export function createQueue(): Queue {
  const jobs: Array<keyof Jobs> = ['campaign:generate'];

  return {
    async add<K extends keyof Jobs>(job: K, data: Jobs[K]): Promise<void> {
      if (!jobs.includes(job)) {
        throw new Error(`Job ${job} not found`);
      }

      const queue = new BullQueue(job);
      await queue.add(job, data);
    },
  };
}
