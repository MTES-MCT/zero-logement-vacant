import { Worker } from 'node:worker_threads';

import type { GenerateCampaignOptions } from './campaigns.js';

function resolveWorkerUrl(): URL {
  // In Vitest (source mode), import.meta.url points to src/generators/*.ts —
  // resolve to the pre-built worker in dist instead.
  if (import.meta.url.endsWith('.ts')) {
    return new URL('../../dist/lib/generators/campaign.worker.js', import.meta.url);
  }
  return new URL('./campaign.worker.js', import.meta.url);
}

export function generateCampaignPDFInWorker(
  options: GenerateCampaignOptions
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolveWorkerUrl(), { workerData: options });
    worker.on('message', (buffer: Buffer) => {
      resolve(new Response(new Uint8Array(buffer)).body!);
    });
    worker.on('error', reject);
  });
}
