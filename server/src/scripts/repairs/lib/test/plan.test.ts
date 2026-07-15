import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import { HousingStatus } from '@zerologementvacant/models';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { HousingApi } from '~/models/HousingApi';
import { factories } from '~/test/factories';

import { plan } from '../plan';
import { rows } from '../row-stream';
import type { Repair } from '../types';

let outDir: string;

beforeEach(() => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zlv-repair-'));
});

afterEach(() => {
  fs.rmSync(outDir, { recursive: true });
});

describe('plan()', () => {
  it('writes RepairActions to plan.jsonl', async () => {
    const housing = factories.housing.build();
    const repair: Repair = {
      name: 'test',
      query: () => rows([housing]),
      decide: () => ({
        update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
      })
    };

    const summary = await plan(repair, { outDir });

    expect(summary.planned).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.errors).toBe(0);

    const lines = fs
      .readFileSync(path.join(outDir, 'plan.jsonl'), 'utf-8')
      .trim()
      .split('\n');
    expect(lines).toHaveLength(1);
    const row = JSON.parse(lines[0]);
    expect(row).toMatchObject({
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
    });
  });

  it('writes RepairSkips to skipped.jsonl', async () => {
    const housing = factories.housing.build();
    const repair: Repair = {
      name: 'test',
      query: () => rows([housing]),
      decide: () => ({ action: 'skip' })
    };

    const summary = await plan(repair, { outDir });

    expect(summary.skipped).toBe(1);
    expect(summary.planned).toBe(0);

    const lines = fs
      .readFileSync(path.join(outDir, 'skipped.jsonl'), 'utf-8')
      .trim()
      .split('\n');
    expect(JSON.parse(lines[0])).toMatchObject({
      housingId: housing.id,
      housingGeoCode: housing.geoCode
    });
  });

  it('writes RepairErrors to errors.jsonl', async () => {
    const housing = factories.housing.build();
    const repair: Repair = {
      name: 'test',
      query: () => rows([housing]),
      decide: () => ({ action: 'error', reason: 'no restorable event' })
    };

    const summary = await plan(repair, { outDir });

    expect(summary.errors).toBe(1);

    const lines = fs
      .readFileSync(path.join(outDir, 'errors.jsonl'), 'utf-8')
      .trim()
      .split('\n');
    expect(JSON.parse(lines[0])).toMatchObject({
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
      reason: 'no restorable event'
    });
  });

  it('counts events to delete and create in summary', async () => {
    const housing = factories.housing.build();
    const repair: Repair = {
      name: 'test',
      query: () => rows([housing]),
      decide: () => ({
        update: { status: HousingStatus.NEVER_CONTACTED },
        deleteEventIds: ['evt-1', 'evt-2'],
        createEvents: []
      })
    };

    const summary = await plan(repair, { outDir });

    expect(summary.eventsToDelete).toBe(2);
    expect(summary.eventsToCreate).toBe(0);
  });

  it('returns correct totals across all outcomes', async () => {
    const [h1, h2, h3] = [
      factories.housing.build(),
      factories.housing.build(),
      factories.housing.build()
    ];
    const repair: Repair = {
      name: 'test',
      query: () => rows([h1, h2, h3]),
      decide: (h) => {
        if (h.id === h1.id)
          return { update: { status: HousingStatus.NEVER_CONTACTED } };
        if (h.id === h2.id) return { action: 'skip' };
        return { action: 'error', reason: 'test' };
      }
    };

    const summary = await plan(repair, { outDir });

    expect(summary).toEqual({
      total: 3,
      planned: 1,
      skipped: 1,
      errors: 1,
      eventsToDelete: 0,
      eventsToCreate: 0
    });
  });

  it('does not truncate an existing plan when query() fails', async () => {
    const planFile = path.join(outDir, 'plan.jsonl');
    fs.writeFileSync(
      planFile,
      '{"housingId":"keep","housingGeoCode":"01001"}\n'
    );

    const repair: Repair = {
      name: 'test',
      query: () => {
        const stream = new Readable({ objectMode: true, read() {} });
        stream.destroy(new Error('db unavailable'));
        return rows<HousingApi>(stream);
      },
      decide: () => ({ action: 'skip' })
    };

    await expect(plan(repair, { outDir })).rejects.toThrow('db unavailable');
    // A failed query must leave a previously reviewed plan untouched.
    expect(fs.readFileSync(planFile, 'utf-8')).toBe(
      '{"housingId":"keep","housingGeoCode":"01001"}\n'
    );
  });
});

describe('Repair type safety', () => {
  it('requires rows(): a plain Readable is not a RowStream<H>', () => {
    const repair: Repair = {
      name: 'test',
      // @ts-expect-error query() must return RowStream<H>; wrap the stream with rows()
      query: () => Readable.from([]),
      decide: () => ({ action: 'skip' })
    };
    // The @ts-expect-error above is the assertion — it fails typecheck if a
    // plain Readable ever becomes assignable (i.e. the brand stops enforcing).
    expect(repair.name).toBe('test');
  });
});
