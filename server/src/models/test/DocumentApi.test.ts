import { describe, it, expect } from 'vitest';

import { toDocumentDTO } from '~/models/DocumentApi';
import { genDocumentApi } from '~/test/testFixtures';

describe('DocumentApi', () => {
  describe('genDocumentApi', () => {
    it('should generate a valid DocumentApi fixture', () => {
      const document = genDocumentApi();

      expect(document).toMatchObject({
        id: expect.any(String),
        filename: expect.any(String),
        s3Key: expect.any(String),
        contentType: expect.any(String),
        sizeBytes: expect.any(Number),
        establishmentId: expect.any(String),
        createdBy: expect.any(String),
        createdAt: expect.any(String),
        creator: expect.objectContaining({
          id: expect.any(String)
        })
      });
    });

    it('should allow overriding properties', () => {
      const document = genDocumentApi({
        filename: 'custom.pdf',
        establishmentId: 'est-123'
      });

      expect(document.filename).toBe('custom.pdf');
      expect(document.establishmentId).toBe('est-123');
    });
  });

  describe('toDocumentDTO', () => {
    it('should convert DocumentApi to DocumentDTO with URL', () => {
      const document = genDocumentApi();
      const url = 'https://s3.example.com/presigned-url';

      const dto = toDocumentDTO(document, url);

      expect(dto).toEqual({
        id: document.id,
        filename: document.filename,
        url,
        contentType: document.contentType,
        sizeBytes: document.sizeBytes,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        creator: expect.objectContaining({
          id: document.creator.id
        })
      });
    });
  });
});
