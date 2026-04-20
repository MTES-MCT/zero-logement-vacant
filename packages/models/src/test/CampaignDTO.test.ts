import { Comparison } from '@zerologementvacant/utils';
import {
  byCreatedAt,
  byHousingCount,
  byOwnerCount,
  byReturnCount,
  byReturnRate,
  bySentAt,
  byStatus,
  byTitle,
  CAMPAIGN_STATUS_VALUES,
  CampaignDTO,
  CampaignStatus,
  isCampaignStatus,
  nextStatus
} from '../CampaignDTO';
import { genCampaignDTO } from './fixtures';

describe('CampaignDTO', () => {
  describe('nextStatus', () => {
    it.each`
      current          | expected
      ${'draft'}       | ${'sending'}
      ${'sending'}     | ${'in-progress'}
      ${'in-progress'} | ${'archived'}
      ${'archived'}    | ${null}
    `('$current → $expected', ({ current, expected }) => {
      expect(nextStatus(current)).toBe(expected);
    });
  });

  describe('isCampaignStatus', () => {
    it.each(CAMPAIGN_STATUS_VALUES)('returns true for valid status "%s"', (status) => {
      expect(isCampaignStatus(status)).toBe(true);
    });

    it.each(['unknown', '', 'DRAFT', 123, null, undefined])(
      'returns false for invalid value %j',
      (value) => {
        expect(isCampaignStatus(value)).toBe(false);
      }
    );
  });

  describe('compare', () => {
    function generateCampaign(status: CampaignStatus): CampaignDTO {
      return { ...genCampaignDTO(), status };
    }

    it.each`
      first                              | second                             | expected
      ${generateCampaign('draft')}       | ${generateCampaign('sending')}     | ${Comparison.B_GT_A}
      ${generateCampaign('sending')}     | ${generateCampaign('in-progress')} | ${Comparison.B_GT_A}
      ${generateCampaign('in-progress')} | ${generateCampaign('archived')}    | ${Comparison.B_GT_A}
      ${generateCampaign('archived')}    | ${generateCampaign('draft')}       | ${Comparison.A_GT_B}
      ${generateCampaign('sending')}     | ${generateCampaign('sending')}     | ${Comparison.A_EQ_B}
    `(
      'should compare $first and $second as $expected',
      ({ first, second, expected }) => {
        const actual = byStatus(first, second);

        expect(actual).toBe(expected);
      }
    );
  });

  describe('byTitle', () => {
    it('ranks alphabetically earlier title first', () => {
      const a = { ...genCampaignDTO(), title: 'Alpha' };
      const b = { ...genCampaignDTO(), title: 'Zeta' };
      expect(byTitle(a, b)).toBe(Comparison.B_GT_A);
      expect(byTitle(b, a)).toBe(Comparison.A_GT_B);
    });

    it('returns equal for same title', () => {
      const a = { ...genCampaignDTO(), title: 'Same' };
      const b = { ...genCampaignDTO(), title: 'Same' };
      expect(byTitle(a, b)).toBe(Comparison.A_EQ_B);
    });
  });

  describe('byCreatedAt', () => {
    it('ranks earlier creation date first', () => {
      const a = { ...genCampaignDTO(), createdAt: '2023-01-01T00:00:00.000Z' };
      const b = { ...genCampaignDTO(), createdAt: '2024-01-01T00:00:00.000Z' };
      expect(byCreatedAt(a, b)).toBe(Comparison.B_GT_A);
      expect(byCreatedAt(b, a)).toBe(Comparison.A_GT_B);
    });

    it('returns equal for same creation date', () => {
      const date = '2023-06-15T12:00:00.000Z';
      const a = { ...genCampaignDTO(), createdAt: date };
      const b = { ...genCampaignDTO(), createdAt: date };
      expect(byCreatedAt(a, b)).toBe(Comparison.A_EQ_B);
    });
  });

  describe('bySentAt', () => {
    it('ranks earlier sent date first', () => {
      const a = { ...genCampaignDTO(), sentAt: '2023-01-01T00:00:00.000Z' };
      const b = { ...genCampaignDTO(), sentAt: '2024-01-01T00:00:00.000Z' };
      expect(bySentAt(a, b)).toBe(Comparison.B_GT_A);
      expect(bySentAt(b, a)).toBe(Comparison.A_GT_B);
    });

    it('treats null sentAt as empty string (sorts before any date)', () => {
      const a = { ...genCampaignDTO(), sentAt: null };
      const b = { ...genCampaignDTO(), sentAt: '2023-01-01T00:00:00.000Z' };
      expect(bySentAt(a, b)).toBe(Comparison.B_GT_A);
    });
  });

  describe('byHousingCount', () => {
    it('ranks lower housing count first', () => {
      const a = { ...genCampaignDTO(), housingCount: 10 };
      const b = { ...genCampaignDTO(), housingCount: 20 };
      expect(byHousingCount(a, b)).toBe(Comparison.B_GT_A);
      expect(byHousingCount(b, a)).toBe(Comparison.A_GT_B);
    });

    it('returns equal for same housing count', () => {
      const a = { ...genCampaignDTO(), housingCount: 15 };
      const b = { ...genCampaignDTO(), housingCount: 15 };
      expect(byHousingCount(a, b)).toBe(Comparison.A_EQ_B);
    });
  });

  describe('byOwnerCount', () => {
    it('ranks lower owner count first', () => {
      const a = { ...genCampaignDTO(), ownerCount: 5 };
      const b = { ...genCampaignDTO(), ownerCount: 10 };
      expect(byOwnerCount(a, b)).toBe(Comparison.B_GT_A);
      expect(byOwnerCount(b, a)).toBe(Comparison.A_GT_B);
    });
  });

  describe('byReturnCount', () => {
    it('ranks lower return count first', () => {
      const a = { ...genCampaignDTO(), returnCount: 1 };
      const b = { ...genCampaignDTO(), returnCount: 5 };
      expect(byReturnCount(a, b)).toBe(Comparison.B_GT_A);
    });

    it('treats null returnCount as 0', () => {
      const a = { ...genCampaignDTO(), returnCount: null };
      const b = { ...genCampaignDTO(), returnCount: 0 };
      expect(byReturnCount(a, b)).toBe(Comparison.A_EQ_B);
    });
  });

  describe('byReturnRate', () => {
    it('ranks lower return rate first', () => {
      const a = { ...genCampaignDTO(), returnRate: 0.1 };
      const b = { ...genCampaignDTO(), returnRate: 0.5 };
      expect(byReturnRate(a, b)).toBe(Comparison.B_GT_A);
    });

    it('treats null returnRate as 0', () => {
      const a = { ...genCampaignDTO(), returnRate: null };
      const b = { ...genCampaignDTO(), returnRate: 0 };
      expect(byReturnRate(a, b)).toBe(Comparison.A_EQ_B);
    });
  });
});
