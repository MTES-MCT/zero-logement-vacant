# PDF Generation — Worker Thread

**Date:** 2026-03-17
**Context:** `generateCampaignPDF` runs `@react-pdf/renderer` synchronously on the Node.js event loop. Measured 500ms mean / 2000ms max event loop lag with 100 housings. Worker threads fix this without changing the API contract or adding infrastructure.

## Decision

- **Synchronous API** — client waits for the PDF, receives it directly in the response (no polling, no job IDs)
- **Spawn per request** — low traffic, concurrent exports are rare; pool complexity not warranted
- **Worker lives in `packages/pdf`** — generation logic is already owned there; server stays ignorant of rendering internals

## Architecture

Two new files in `packages/pdf`:

```
packages/pdf/src/
  generators/
    campaigns.tsx            ← unchanged
    campaign.worker.ts       ← new: worker entry point
  node.ts                    ← add generateCampaignPDFInWorker export
```

## Data Flow

```
Controller
  │
  └─ generateCampaignPDFInWorker(options)
       │
       ├─ spawn Worker(campaign.worker.js, { workerData: options })
       │
       │   [worker thread]
       │   campaign.worker.ts
       │     ├─ generateCampaignPDF(workerData)
       │     ├─ collect stream → Buffer
       │     └─ parentPort.postMessage(buffer, [buffer.buffer])  ← transferred, zero-copy
       │
       └─ resolves with ReadableStream wrapping the Buffer
            │
            └─ controller pipes to response (unchanged)
```

## Implementation

### `packages/pdf/src/generators/campaign.worker.ts`

```ts
import { workerData, parentPort } from 'node:worker_threads';
import { generateCampaignPDF } from './campaigns.js';

const stream = await generateCampaignPDF(workerData);
const reader = stream.getReader();
const chunks: Uint8Array[] = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
}

const buffer = Buffer.concat(chunks);
parentPort!.postMessage(buffer, [buffer.buffer]);
```

### `packages/pdf/src/node.ts` — new export

```ts
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

export async function generateCampaignPDFInWorker(
  options: GenerateCampaignOptions
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      fileURLToPath(new URL('./generators/campaign.worker.js', import.meta.url)),
      { workerData: options }
    );
    worker.on('message', (buffer: Buffer) => {
      resolve(new Response(buffer).body!);
    });
    worker.on('error', reject);
  });
}
```

### `server/src/controllers/exportController.ts` — one line

```ts
// before
const stream = await generateCampaignPDF({ campaign, draft, housings: housingsWithOwner });
// after
const stream = await generateCampaignPDFInWorker({ campaign, draft, housings: housingsWithOwner });
```

## Build notes

- `campaign.worker.ts` must be included in `packages/pdf` build output as a `.js` file
- `workerData` is deep-cloned by Node.js (structured clone) — acceptable cost for this use case

## Verification

Remove the `perf_hooks` monitor added in `server/src/infra/server.ts` once worker thread is confirmed working.
