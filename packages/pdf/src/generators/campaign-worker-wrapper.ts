import { Worker } from 'node:worker_threads';
import { resolve as resolvePath } from 'node:path';

import type { GenerateCampaignOptions } from './campaigns.js';

export function generateCampaignPDFInWorker(
  options: GenerateCampaignOptions
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      // Limitation: works only with JavaScript workers
      // so we need to point to the compiled .js file
      resolvePath(import.meta.dirname, 'campaign.worker.js'),
      {
        workerData: options
      }
    );
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
