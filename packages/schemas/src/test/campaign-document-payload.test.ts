import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import { campaignDocumentPayload } from '../campaign-document-payload';

describe('Campaign document payload', () => {
  test.prop({
    documentIds: fc.array(fc.uuid({ version: 4 }), {
      minLength: 1,
      maxLength: 10
    })
  })('should validate valid document IDs', (payload) => {
    const validate = () => campaignDocumentPayload.validateSync(payload);

    expect(validate).not.toThrow();
  });

  test.prop({
    documentIds: fc.constantFrom([], undefined, null)
  })('should reject empty or missing document IDs', (documentIds) => {
    const validate = () =>
      campaignDocumentPayload.validateSync({ documentIds });

    expect(validate).toThrow();
  });

  test.prop({
    documentIds: fc.array(fc.string(), { minLength: 1, maxLength: 5 })
  })('should reject non-UUID document IDs', (payload) => {
    const validate = () => campaignDocumentPayload.validateSync(payload);

    expect(validate).toThrow();
  });
});
