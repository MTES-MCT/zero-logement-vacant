import { Comparison } from '@zerologementvacant/utils';
import { byStatus, CampaignDTO, CampaignStatus } from '../CampaignDTO';
import { genCampaignDTO } from './fixtures';

describe('CampaignDTO', () => {
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
});
