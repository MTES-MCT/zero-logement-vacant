import { parentPort, workerData } from 'node:worker_threads';

import type { GenerateCampaignOptions } from './campaigns.js';
import { generate } from './campaigns.js';

const options = workerData as GenerateCampaignOptions;
const stream = await generate(options);
const reader = stream.getReader();
const chunks: Uint8Array[] = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}

const buffer = Buffer.concat(chunks);
parentPort!.postMessage(buffer, [buffer.buffer]);
