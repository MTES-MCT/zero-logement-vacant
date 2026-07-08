import { HousingStatus } from '@zerologementvacant/models';
import { describe, expect, it } from 'vitest';

import { toDecideInput } from './transforms';

describe('toDecideInput', () => {
  it('maps a row with a latest event', () => {
    const input = toDecideInput({
      geo_code: '01001',
      id: 'h1',
      status: HousingStatus.COMPLETED,
      data_file_years: ['lovac-2026'],
      next_new: { status: 'Suivi terminé', subStatus: 'Sortie de la vacance' },
      event_created_at: '2026-01-01T00:00:00.000Z'
    });
    expect(input).toEqual({
      geoCode: '01001',
      id: 'h1',
      status: HousingStatus.COMPLETED,
      dataFileYears: ['lovac-2026'],
      latestEvent: {
        status: 'Suivi terminé',
        subStatus: 'Sortie de la vacance'
      }
    });
  });

  it('treats a missing event (no event_created_at) as latestEvent null', () => {
    const input = toDecideInput({
      geo_code: '01001',
      id: 'h2',
      status: HousingStatus.BLOCKED,
      data_file_years: null,
      next_new: null,
      event_created_at: null
    });
    expect(input.latestEvent).toBeNull();
    expect(input.dataFileYears).toEqual([]);
  });

  it('treats an existing event with a null payload as an empty latestEvent (for review)', () => {
    const input = toDecideInput({
      geo_code: '01001',
      id: 'h3',
      status: HousingStatus.BLOCKED,
      data_file_years: [],
      next_new: null,
      event_created_at: '2026-01-01T00:00:00.000Z'
    });
    expect(input.latestEvent).toEqual({});
  });
});

import { groupByTarget } from './transforms';

describe('groupByTarget', () => {
  it('groups rows sharing the same target status and sub-status', () => {
    const groups = groupByTarget([
      {
        geo_code: '01001',
        id: 'a',
        target_status: 4,
        target_sub_status: 'Sortie de la vacance'
      },
      {
        geo_code: '01001',
        id: 'b',
        target_status: 4,
        target_sub_status: 'Sortie de la vacance'
      },
      { geo_code: '01002', id: 'c', target_status: 0, target_sub_status: null }
    ]);

    expect(groups).toHaveLength(2);

    const completed = groups.find((g) => g.status === 4);
    expect(completed).toMatchObject({
      status: 4,
      subStatus: 'Sortie de la vacance'
    });
    expect(completed?.housings).toEqual([
      { geoCode: '01001', id: 'a' },
      { geoCode: '01001', id: 'b' }
    ]);

    const neverContacted = groups.find((g) => g.status === 0);
    expect(neverContacted).toMatchObject({ status: 0, subStatus: null });
    expect(neverContacted?.housings).toEqual([{ geoCode: '01002', id: 'c' }]);
  });

  it('keeps null and non-null sub-status as distinct groups for the same status', () => {
    const groups = groupByTarget([
      { geo_code: '01001', id: 'a', target_status: 4, target_sub_status: null },
      {
        geo_code: '01001',
        id: 'b',
        target_status: 4,
        target_sub_status: 'Sortie de la vacance'
      }
    ]);
    expect(groups).toHaveLength(2);
  });
});
