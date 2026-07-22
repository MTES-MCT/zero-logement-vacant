import fs from 'node:fs';
import type { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { parse as parseJSONL } from 'jsonlines';

/**
 * Stream a plan file's rows into `sink`. Shared by `apply` and `stats` so the
 * JSONL parsing lives in one place, and so neither has to hold the whole plan
 * in memory — the `bypassTriggers` path targets very large repairs. Node
 * streams give us backpressure: the parser only reads ahead as fast as the sink
 * drains.
 */
export function readPlan(planFile: string, sink: Writable): Promise<void> {
  return pipeline(fs.createReadStream(planFile), parseJSONL(), sink);
}
