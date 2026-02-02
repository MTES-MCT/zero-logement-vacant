import { describe, it, expect, beforeAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

import documentRepository, { Documents, toDocumentDBO } from '~/repositories/documentRepository';
import { Users, formatUserApi } from '~/repositories/userRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  genDocumentApi,
  genUserApi,
  genEstablishmentApi
} from '~/test/testFixtures';

describe('documentRepository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('insert', () => {
    it('should insert a document', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user
      });

      await documentRepository.insert(document);

      const actual = await Documents().where('id', document.id).first();
      expect(actual).toMatchObject({
        id: document.id,
        filename: document.filename,
        s3_key: document.s3Key,
        establishment_id: document.establishmentId
      });
    });
  });

  describe('insertMany', () => {
    it('should insert multiple documents', async () => {
      const documents = [
        genDocumentApi({ createdBy: user.id, creator: user }),
        genDocumentApi({ createdBy: user.id, creator: user })
      ];

      await documentRepository.insertMany(documents);

      const actual = await Documents().whereIn(
        'id',
        documents.map((document) => document.id)
      );

      expect(actual).toHaveLength(2);
    });

    it('should handle empty array', async () => {
      await expect(documentRepository.insertMany([])).resolves.not.toThrow();
    });
  });

  describe('findOne', () => {
    it('should find document by id with creator', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user
      });
      await Documents().insert(toDocumentDBO(document));

      const actual = await documentRepository.findOne(document.id);

      expect(actual).toMatchObject({
        id: document.id,
        creator: expect.objectContaining({
          id: user.id,
          email: user.email
        })
      });
    });

    it('should return null if not found', async () => {
      const actual = await documentRepository.findOne(uuidv4());
      expect(actual).toBeNull();
    });

    it('should filter by establishmentId', async () => {
      const establishment2 = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment2));

      const doc1 = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      const doc2 = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment2.id
      });

      await Documents().insert([doc1, doc2].map(toDocumentDBO));

      const actual = await documentRepository.findOne(doc1.id, {
        filters: { establishmentIds: [establishment2.id] }
      });

      expect(actual).toBeNull(); // doc1 belongs to establishment, filtered out by establishment2
    });
  });

  describe('findMany', () => {
    it('should find multiple documents by ids', async () => {
      const documents = [
        genDocumentApi({ createdBy: user.id, creator: user }),
        genDocumentApi({ createdBy: user.id, creator: user })
      ];
      await Documents().insert(documents.map(toDocumentDBO));

      const actual = await documentRepository.findMany(
        documents.map((document) => document.id)
      );

      expect(actual).toHaveLength(2);
      expect(actual).toIncludeAllPartialMembers([
        { id: documents[0].id },
        { id: documents[1].id }
      ]);
    });

    it('should return empty array for non-existent ids', async () => {
      const actual = await documentRepository.findMany([uuidv4()]);

      expect(actual).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update document filename', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user
      });
      await Documents().insert(toDocumentDBO(document));

      const updated = { ...document, filename: 'updated.pdf' };
      await documentRepository.update(updated);

      const actual = await Documents().where('id', document.id).first();
      expect(actual?.filename).toBe('updated.pdf');
    });
  });

  describe('remove', () => {
    it('should soft-delete a document', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user
      });
      await Documents().insert(toDocumentDBO(document));

      await documentRepository.remove(document.id);

      const actual = await Documents().where('id', document.id).first();
      expect(actual?.deleted_at).not.toBeNull();
    });
  });
});
