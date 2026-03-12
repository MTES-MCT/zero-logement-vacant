import { describe, expect, it, vi } from 'vitest';

import { genDocumentApi } from '~/test/testFixtures';

vi.mock('@zerologementvacant/utils/node', () => ({
  generatePresignedUrl: vi
    .fn()
    .mockResolvedValue('https://s3.example.com/presigned-url')
}));

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
});
