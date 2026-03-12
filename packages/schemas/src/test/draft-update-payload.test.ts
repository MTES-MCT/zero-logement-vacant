import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';
import { draftUpdatePayload } from '../draft-update-payload';

describe('draftUpdatePayload', () => {
  test.prop([fc.uuid({ version: 4 })])('strips campaign field (unknown key)', async (campaignId) => {
    // campaign is omitted from the schema — it is stripped when using stripUnknown
    const result = await draftUpdatePayload.validate({ campaign: campaignId }, { stripUnknown: true });
    expect((result as any).campaign).toBeUndefined();
  });

  test.prop([fc.constant(undefined)])('coerces missing logo to [null, null]', async (value) => {
    const result = await draftUpdatePayload.validate({ logo: value });
    expect(result.logo).toStrictEqual([null, null]);
  });
});
