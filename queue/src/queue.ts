import { Queue as BullQueue, QueueOptions } from 'bullmq';

import { JOBS, Jobs } from './jobs';

export interface Queue {
  add<K extends keyof Jobs>(job: K, data: Jobs[K]): Promise<void>;
}

export type Options = Pick<QueueOptions, 'connection'>;

export function createQueue(opts?: Options): Queue {
  return {
    async add<K extends keyof Jobs>(job: K, data: Jobs[K]): Promise<void> {
      if (!JOBS.includes(job)) {
        throw new Error(`Job ${job} not found`);
      }

      const queue = new BullQueue(job, opts?.connection ? opts : undefined);
      await queue.add(job, data);
    },
  };
}
