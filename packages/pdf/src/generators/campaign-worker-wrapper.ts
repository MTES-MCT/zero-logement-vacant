import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import type { GenerateCampaignOptions } from './campaigns.js';

function resolveWorkerPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // In built output, this file lives in dist/lib/generators/ alongside the worker.
  // In Vitest (source mode), this file lives in src/generators/ — resolve to dist.
  if (currentFile.endsWith('.ts')) {
    const packageRoot = path.resolve(path.dirname(currentFile), '../..');
    return path.join(packageRoot, 'dist/lib/generators/campaign.worker.js');
  }
  return path.join(path.dirname(currentFile), 'campaign.worker.js');
}

export function generateCampaignPDFInWorker(
  options: GenerateCampaignOptions
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolveWorkerPath(), { workerData: options });
    worker.on('message', (buffer: Buffer) => {
      resolve(new Response(new Uint8Array(buffer)).body!);
    });
    worker.on('error', reject);
  });
}
