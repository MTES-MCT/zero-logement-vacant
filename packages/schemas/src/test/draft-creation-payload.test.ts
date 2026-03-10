import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';
import { draftCreationPayload } from '../draft-creation-payload';

describe('draftCreationPayload', () => {
  describe('logo', () => {
    test.prop([fc.constant(undefined)])('coerces undefined to [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({ campaign: crypto.randomUUID(), logo: value });
      expect(result.logo).toStrictEqual([null, null]);
    });

    test.prop([fc.constant(null)])('coerces null to [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({ campaign: crypto.randomUUID(), logo: value });
      expect(result.logo).toStrictEqual([null, null]);
    });

    test.prop([
      fc.tuple(
        fc.option(fc.uuid({ version: 4 })),
        fc.option(fc.uuid({ version: 4 }))
      )
    ])('accepts a tuple of two optional UUIDs', async ([a, b]) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        logo: [a, b]
      });
      expect(result.logo).toStrictEqual([a ?? null, b ?? null]);
    });
  });

  describe('sender.signatories', () => {
    test.prop([fc.constant(undefined)])('coerces undefined to [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        sender: { signatories: value }
      });
      expect(result.sender?.signatories).toStrictEqual([null, null]);
    });

    test.prop([fc.constant(null)])('coerces null to [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        sender: { signatories: value }
      });
      expect(result.sender?.signatories).toStrictEqual([null, null]);
    });

    test.prop([fc.constant([null, null])])('accepts [null, null]', async (value) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        sender: { signatories: value }
      });
      expect(result.sender?.signatories).toStrictEqual([null, null]);
    });
  });

  describe('sender.signatories[*].document', () => {
    test.prop([fc.uuid({ version: 4 })])('accepts a UUID document ID', async (docId) => {
      const result = await draftCreationPayload.validate({
        campaign: crypto.randomUUID(),
        sender: {
          signatories: [
            { firstName: 'Alice', lastName: 'Dupont', role: 'Maire', document: docId },
            null
          ]
        }
      });
      expect(result.sender?.signatories?.[0]?.document).toBe(docId);
    });

    test.prop([fc.constant('not-a-uuid')])('rejects non-UUID document ID', async (badId) => {
      await expect(
        draftCreationPayload.validate({
          campaign: crypto.randomUUID(),
          sender: {
            signatories: [{ document: badId }, null]
          }
        })
      ).rejects.toThrow();
    });
  });
});
