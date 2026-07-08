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
