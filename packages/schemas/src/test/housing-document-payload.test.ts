import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';
import { housingDocumentPayload } from '../housing-document-payload';

describe('Housing document payload', () => {
  test.prop({
    documentIds: fc.array(fc.uuid({ version: 4 }), { minLength: 1, maxLength: 10 })
  })('should validate valid document IDs', (payload) => {
    const validate = () => housingDocumentPayload.validateSync(payload);

    expect(validate).not.toThrow();
  });

  test.prop({
    documentIds: fc.constantFrom([], undefined, null)
  })('should reject empty or missing document IDs', (documentIds) => {
    const validate = () => housingDocumentPayload.validateSync({ documentIds });

    expect(validate).toThrow();
  });

  test.prop({
    documentIds: fc.array(fc.string(), { minLength: 1, maxLength: 5 })
  })('should reject non-UUID document IDs', (payload) => {
    const validate = () => housingDocumentPayload.validateSync(payload);

    expect(validate).toThrow();
  });
});
