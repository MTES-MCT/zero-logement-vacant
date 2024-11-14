import { byStatus } from '../CampaignDTO';
import { Comparison } from '@zerologementvacant/utils';

describe('CampaignDTO', () => {
  describe('compare', () => {
    it.each`
      first            | second           | expected
      ${'draft'}       | ${'sending'}     | ${Comparison.B_GT_A}
      ${'sending'}     | ${'in-progress'} | ${Comparison.B_GT_A}
      ${'in-progress'} | ${'archived'}    | ${Comparison.B_GT_A}
      ${'archived'}    | ${'draft'}       | ${Comparison.A_GT_B}
      ${'sending'}     | ${'sending'}     | ${Comparison.A_EQ_B}
    `(
      'should compare $first and $second as $expected',
      ({ first, second, expected }) => {
        const actual = byStatus(first, second);

        expect(actual).toBe(expected);
      }
    );
  });
});
