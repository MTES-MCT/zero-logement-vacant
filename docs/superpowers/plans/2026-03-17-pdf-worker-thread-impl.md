# PDF Worker Thread Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Offload `@react-pdf/renderer` CPU work to a Node.js worker thread so the event loop stays free during PDF generation.

**Architecture:** A new `campaign.worker.ts` entry is added to `packages/pdf`, built as a separate Vite entry. A thin `generateCampaignPDFInWorker` wrapper in `node.ts` spawns one worker per request, collects the PDF into a `Buffer`, and returns a `ReadableStream`. The controller swaps one import.

**Tech Stack:** Node.js `worker_threads`, Vite lib build (multi-entry), `@react-pdf/renderer`, Express streaming response.

---

### Task 1: Export `GenerateCampaignOptions` from `campaigns.tsx`

The worker file and the wrapper both need this type. It is currently `interface` (unexported).

**Files:**
- Modify: `packages/pdf/src/generators/campaigns.tsx:12`

**Step 1: Export the interface**

Change line 12 from:
```ts
interface GenerateCampaignOptions {
```
to:
```ts
export interface GenerateCampaignOptions {
```

**Step 2: Typecheck**

```bash
yarn nx typecheck pdf
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/pdf/src/generators/campaigns.tsx
git commit -m "feat(pdf): export GenerateCampaignOptions"
```

---

### Task 2: Create the worker entry file

This file runs inside the worker thread. It reads `workerData`, generates the PDF, collects the stream into a `Buffer`, and sends it back to the main thread as a transferable `ArrayBuffer` (zero-copy).

**Files:**
- Create: `packages/pdf/src/generators/campaign.worker.ts`

**Step 1: Create the file**

```ts
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
```

**Step 2: Typecheck**

```bash
yarn nx typecheck pdf
```
Expected: no errors.

**Step 3: Commit**

```bash
git add packages/pdf/src/generators/campaign.worker.ts
git commit -m "feat(pdf): add campaign worker thread entry"
```

---

### Task 3: Add worker entry to the Vite build

The worker must be compiled to its own `.js` file so Node.js can spawn it at runtime. It also needs `node:worker_threads` and `node:url` added to externals (currently missing).

**Files:**
- Modify: `packages/pdf/vite.config.mts`

**Step 1: Add the worker entry and missing externals**

In `vite.config.mts`, update `build.lib.entry` and `rollupOptions.external`:

```ts
build: {
  // ...
  lib: {
    entry: {
      browser: './src/browser.ts',
      node: './src/node.ts',
      'generators/campaign.worker': './src/generators/campaign.worker.ts'
    },
    formats: ['es' as const]
  },
  rollupOptions: {
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@react-pdf/renderer',
      '@zerologementvacant/models',
      'node:stream',
      'node:worker_threads',
      'node:url'
    ]
  },
  // ...rest unchanged
}
```

**Step 2: Build**

```bash
yarn nx build pdf
```
Expected: `dist/lib/generators/campaign.worker.js` is present alongside `dist/lib/node.js`.

```bash
ls packages/pdf/dist/lib/generators/
```
Expected: `campaign.worker.js` (and `.d.ts`).

**Step 3: Commit**

```bash
git add packages/pdf/vite.config.mts
git commit -m "feat(pdf): add campaign.worker to build entries"
```

---

### Task 4: Add `generateCampaignPDFInWorker` to `node.ts` (TDD)

The wrapper spawns a worker, waits for the `Buffer` message, and returns a `ReadableStream`.

> **Note on testing:** `worker_threads` require the compiled `.js` file to exist and a Node.js environment. The unit test below runs after `yarn nx build pdf` (Task 3). The vitest environment is overridden to `node` via a docblock.

**Files:**
- Create: `packages/pdf/src/generators/test/campaign-worker.test.ts`
- Modify: `packages/pdf/src/generators/index.ts`
- Modify: `packages/pdf/src/node.ts`

**Step 1: Write the failing test**

Create `packages/pdf/src/generators/test/campaign-worker.test.ts`:

```ts
// @vitest-environment node
import {
  UserRole,
  type DraftDTO,
  type HousingWithOwnerDTO
} from '@zerologementvacant/models';
import {
  genCampaignDTO,
  genDraftDTO,
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genOwnerDTO,
  genSenderDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { describe, expect, it } from 'vitest';

import { generateCampaignPDFInWorker } from '../../node.js';

describe('generateCampaignPDFInWorker', () => {
  it('should return a ReadableStream containing a valid PDF', async () => {
    const owner = genOwnerDTO();
    const housing = genHousingDTO();
    housing.owner = owner;
    const sender = genSenderDTO();
    const draft: DraftDTO = genDraftDTO(sender);
    const establishment = genEstablishmentDTO();
    const creator = genUserDTO(UserRole.USUAL, establishment);
    const group = genGroupDTO(creator, [housing]);
    const campaign = genCampaignDTO(group);

    const stream = await generateCampaignPDFInWorker({
      campaign,
      housings: [housing as HousingWithOwnerDTO],
      draft
    });

    expect(stream).toBeInstanceOf(ReadableStream);

    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    expect(buffer.toString('utf-8', 0, 4)).toBe('%PDF');
  }, 30_000); // generous timeout — PDF rendering is slow
});
```

**Step 2: Run to verify it fails**

```bash
yarn nx build pdf && yarn nx test pdf -- campaign-worker
```
Expected: FAIL — `generateCampaignPDFInWorker` is not exported yet.

**Step 3: Implement the wrapper**

Add to `packages/pdf/src/generators/index.ts`:

```ts
export { generateCampaignPDFInWorker } from './campaign-worker-wrapper.js';
```

Create `packages/pdf/src/generators/campaign-worker-wrapper.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import type { GenerateCampaignOptions } from './campaigns.js';

export function generateCampaignPDFInWorker(
  options: GenerateCampaignOptions
): Promise<ReadableStream<Uint8Array>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      fileURLToPath(
        new URL('./campaign.worker.js', import.meta.url)
      ),
      { workerData: options }
    );
    worker.on('message', (buffer: Buffer) => {
      resolve(new Response(buffer).body!);
    });
    worker.on('error', reject);
  });
}
```

> **Why a separate file?** Keeping the wrapper out of `node.ts` keeps the entry file clean and avoids circular type issues. `node.ts` re-exports everything from `generators/index.ts`.

**Step 4: Build and run test**

```bash
yarn nx build pdf && yarn nx test pdf -- campaign-worker
```
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/pdf/src/generators/campaign-worker-wrapper.ts \
        packages/pdf/src/generators/index.ts \
        packages/pdf/src/generators/test/campaign-worker.test.ts
git commit -m "feat(pdf): add generateCampaignPDFInWorker"
```

---

### Task 5: Update the export controller

Swap `generateCampaignPDF` for `generateCampaignPDFInWorker` in the controller.

**Files:**
- Modify: `server/src/controllers/exportController.ts:2,69`

**Step 1: Update the import**

Line 2, change:
```ts
import { generateCampaignPDF } from '@zerologementvacant/pdf/node';
```
to:
```ts
import { generateCampaignPDFInWorker } from '@zerologementvacant/pdf/node';
```

**Step 2: Update the call site**

Line 69, change:
```ts
const stream = await generateCampaignPDF({
```
to:
```ts
const stream = await generateCampaignPDFInWorker({
```

**Step 3: Typecheck**

```bash
yarn nx typecheck server
```
Expected: no errors.

**Step 4: Commit**

```bash
git add server/src/controllers/exportController.ts
git commit -m "feat(server): use worker thread for PDF generation"
```

---

### Task 6: Remove the `perf_hooks` monitor

The temporary event loop monitor added during diagnosis is no longer needed.

**Files:**
- Modify: `server/src/infra/server.ts`

**Step 1: Remove the import and monitor block**

Remove line:
```ts
import { monitorEventLoopDelay } from 'node:perf_hooks';
```

Remove the block:
```ts
// TEMP: event loop lag monitor — remove after testing
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();
setInterval(() => {
  const lag = histogram.mean / 1e6;
  if (lag > 10) {
    console.warn(`[EL LAG] mean=${lag.toFixed(1)}ms max=${(histogram.max / 1e6).toFixed(1)}ms`);
  }
  histogram.reset();
}, 500).unref();
```

**Step 2: Typecheck**

```bash
yarn nx typecheck server
```
Expected: no errors.

**Step 3: Commit**

```bash
git add server/src/infra/server.ts
git commit -m "chore(server): remove event loop lag monitor"
```

---

### Task 7: Verify end-to-end

**Step 1: Build pdf package**

```bash
yarn nx build pdf
```

**Step 2: Start the server**

```bash
yarn nx dev server
```

**Step 3: Trigger export and test concurrency**

In two terminals simultaneously:

```bash
# Terminal 1 — trigger PDF export
curl -X POST http://localhost:3001/api/campaigns/<id>/exports \
  -H "Authorization: Bearer <token>" -o /tmp/test.pdf

# Terminal 2 — fire immediately after Terminal 1
time curl http://localhost:3001/ -H "Authorization: Bearer <token>"
```

Expected:
- Terminal 2 returns in <100ms even while PDF is generating
- `/tmp/test.pdf` is a valid PDF (open it)

**Step 4: Verify PDF**

```bash
head -c 4 /tmp/test.pdf
```
Expected: `%PDF`
