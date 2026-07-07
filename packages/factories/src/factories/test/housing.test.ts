import {
  getSubStatuses,
  HOUSING_STATUS_VALUES,
  HousingStatus
} from '@zerologementvacant/models';
import { describe, expect, it, vi } from 'vitest';

import { MemoryAdapter } from '../../memory-adapter';
import { createHousingFactory } from '../housing';

describe('createHousingFactory', () => {
  it('builds a HousingDTO with required fields', () => {
    const factory = createHousingFactory(new MemoryAdapter());
    const housing = factory.build();

    expect(housing.id).toBeDefined();
    expect(housing.geoCode).toBeDefined();
    expect(housing.invariant).toBeDefined();
    expect(housing.localId).toBeDefined();
    expect(housing.status).toBeDefined();
    expect(housing.occupancy).toBeDefined();
  });

  it('allows overriding fields', () => {
    const factory = createHousingFactory(new MemoryAdapter());
    const housing = factory.build({ geoCode: '75056' });

    expect(housing.geoCode).toBe('75056');
  });

  it('creates via the adapter with table "housings"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createHousingFactory(adapter);

    const housing = await factory.create();

    expect(spy).toHaveBeenCalledWith(
      'housings',
      expect.objectContaining({ id: housing.id })
    );
  });

  it('generates a null subStatus when the status is "never contacted"', () => {
    const factory = createHousingFactory(new MemoryAdapter());

    const housings = factory.buildList(20, {
      status: HousingStatus.NEVER_CONTACTED
    });

    expect(housings.every((housing) => housing.subStatus === null)).toBe(true);
  });

  it('derives subStatus from an overridden status', () => {
    const factory = createHousingFactory(new MemoryAdapter());

    HOUSING_STATUS_VALUES.forEach((status) => {
      const allowed = getSubStatuses(status);
      const housings = factory.buildList(20, { status });

      housings.forEach((housing) => {
        if (allowed.size === 0) {
          expect(housing.subStatus).toBeNull();
        } else {
          expect(allowed.has(housing.subStatus as string)).toBe(true);
        }
      });
    });
  });

  it('builds a list of housings', () => {
    const factory = createHousingFactory(new MemoryAdapter());
    const housings = factory.buildList(5);

    expect(housings).toHaveLength(5);
    expect(new Set(housings.map((h) => h.id)).size).toBe(5);
  });
});
