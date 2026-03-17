import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import type { GenerateCampaignOptions } from './campaigns.js';

function resolveWorkerPath(): string {
  // Avoid new URL('./file', import.meta.url) — Vite inlines it as a data URL.
  // Use fileURLToPath + string ops instead, which Vite leaves untouched.
  const thisFile = fileURLToPath(import.meta.url);
  const dir = thisFile.slice(0, thisFile.lastIndexOf('/') + 1);
  // In Vitest (source mode), this file is src/generators/*.ts — resolve to dist.
  if (thisFile.endsWith('.ts')) {
    return `${dir}../../dist/lib/generators/campaign.worker.js`;
  }
  return `${dir}campaign.worker.js`;
}

export function generateCampaignPDFInWorker(
  options: GenerateCampaignOptions
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolveWorkerPath(), { workerData: options });
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
