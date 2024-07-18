import async from 'async';
import {
  Queue as BullQueue,
  QueueEvents as BullQueueEvents,
  QueueOptions
} from 'bullmq';

import { JOBS, Jobs } from './jobs';

// TODO: use EventEmitter<T>
export interface Queue {
  add<K extends keyof Jobs>(
    job: K,
    data: Parameters<Jobs[K]>[0]
  ): Promise<void>;
  on<K extends keyof Jobs>(
    job: K,
    callback: (returned: ReturnType<Jobs[K]>) => void
  ): void;
  close(): Promise<void>;
}

export type Options = QueueOptions;

export function createQueue(opts?: Options): Queue {
  const queues = new Map<keyof Jobs, BullQueue>(
    JOBS.map((job) => [
      job,
      new BullQueue(job, opts?.connection ? opts : undefined)
    ])
  );
  const eventQueues = new Map<keyof Jobs, BullQueueEvents>(
    JOBS.map((job) => [
      job,
      new BullQueueEvents(job, opts?.connection ? opts : undefined)
    ])
  );

  return {
    async add<K extends keyof Jobs>(
      job: K,
      data: Parameters<Jobs[K]>[0]
    ): Promise<void> {
      await queues.get(job)?.add(job, data);
    },
    on<K extends keyof Jobs>(
      event: K,
      callback: (returned: ReturnType<Jobs[K]>) => void
    ) {
      eventQueues.get(event)?.on('completed', async ({ jobId, }) => {
        const job = await queues.get(event)?.getJob(jobId);
        if (!job) {
          throw new Error(`Job not found: ${jobId}`);
        }

        callback(job.returnvalue);
      });
    },
    /**
     * Cleans up the queue and its events listeners.
     */
    async close(): Promise<void> {
      const allQueues = [...queues.values(), ...eventQueues.values()];
      await async.forEach(allQueues, async (queue) => {
        await queue.close();
      });
    },
  };
}
