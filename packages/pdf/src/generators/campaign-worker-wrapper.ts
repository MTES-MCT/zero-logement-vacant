import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';

import type { GenerateCampaignOptions } from './campaigns.js';

// Resolve via the package exports map — works regardless of where this
// wrapper ends up (server bundle, monorepo dist, etc.).
const require = createRequire(import.meta.url);
const workerPath = require.resolve('@zerologementvacant/pdf/worker');

export function generateCampaignPDFInWorker(
  options: GenerateCampaignOptions
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, { workerData: options });
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
