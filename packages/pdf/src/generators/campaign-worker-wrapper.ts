import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';

import type { GenerateCampaignOptions } from './campaigns.js';

// Resolve the worker via the package's `./worker` export so the path is
// stable regardless of where Rollup places this wrapper after bundling.
const workerPath = createRequire(import.meta.url).resolve(
  '@zerologementvacant/pdf/worker'
);

export function generateCampaignPDFInWorker(
  options: GenerateCampaignOptions
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: options
    });
    worker.on('message', (buffer: Buffer) => {
      resolve(
        new ReadableStream({
          start(controller) {
            controller.enqueue(buffer);
            controller.close();
          }
        })
      );
    });
    worker.on('error', reject);
  });
}
