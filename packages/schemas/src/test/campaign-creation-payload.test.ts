import { fc, test } from '@fast-check/vitest';
import { type CampaignCreationPayload } from '@zerologementvacant/models';

import { campaignCreationPayload } from '../campaign-creation-payload';
import { DATE_LENGTH } from '../date-string';

describe('Campaign creation payload', () => {
  test.prop<CampaignCreationPayload>({
    title: fc.stringMatching(/\S/),
    description: fc.stringMatching(/\S/),
    sentAt: fc.option(
      fc
        .date({
          min: new Date('0001-01-01'),
          max: new Date('9999-12-31'),
          noInvalidDate: true
        })
        .map((date) => date.toISOString().substring(0, DATE_LENGTH))
    )
  })('should validate inputs', (payload) => {
    const validate = () => campaignCreationPayload.validateSync(payload);

    expect(validate).not.toThrow();
  });
});
