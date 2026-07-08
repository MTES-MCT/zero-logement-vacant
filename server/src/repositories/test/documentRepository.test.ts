import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeAll } from 'vitest';

import documentRepository, {
  Documents,
  fromDocumentDBO,
  toDocumentDBO
} from '~/repositories/documentRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
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
    await Users().insert(toUserDBO(user));
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

    it('should return a soft-deleted document when deleted: true', async () => {
      const document = genDocumentApi({ createdBy: user.id, creator: user });
      await Documents().insert(toDocumentDBO(document));
      await documentRepository.remove(document.id);

      const actual = await documentRepository.findOne(document.id, {
        filters: { deleted: true }
      });

      expect(actual).not.toBeNull();
      expect(actual?.id).toBe(document.id);
    });

    it('should return null for a non-deleted document when deleted: true', async () => {
      const document = genDocumentApi({ createdBy: user.id, creator: user });
      await Documents().insert(toDocumentDBO(document));

      const actual = await documentRepository.findOne(document.id, {
        filters: { deleted: true }
      });

      expect(actual).toBeNull();
    });

    it('should return null for a soft-deleted document when deleted: false', async () => {
      const document = genDocumentApi({ createdBy: user.id, creator: user });
      await Documents().insert(toDocumentDBO(document));
      await documentRepository.remove(document.id);

      const actual = await documentRepository.findOne(document.id, {
        filters: { deleted: false }
      });

      expect(actual).toBeNull();
    });

    it('should return a live document when deleted: false', async () => {
      const document = genDocumentApi({ createdBy: user.id, creator: user });
      await Documents().insert(toDocumentDBO(document));

      const actual = await documentRepository.findOne(document.id, {
        filters: { deleted: false }
      });

      expect(actual).not.toBeNull();
      expect(actual?.id).toBe(document.id);
    });
  });

  describe('findMany', () => {
    it('should find multiple documents by ids', async () => {
      const documents = [
        genDocumentApi({ createdBy: user.id, creator: user }),
        genDocumentApi({ createdBy: user.id, creator: user })
      ];
      await Documents().insert(documents.map(toDocumentDBO));

      const actual = await documentRepository.find({
        filters: {
          ids: documents.map((document) => document.id)
        }
      });

      expect(actual).toHaveLength(2);
      expect(actual).toIncludeAllPartialMembers([
        { id: documents[0].id },
        { id: documents[1].id }
      ]);
    });

    it('should return empty array for non-existent ids', async () => {
      const actual = await documentRepository.find({
        filters: {
          ids: [uuidv4()]
        }
      });

      expect(actual).toEqual([]);
    });

    it('should find documents by establishmentId when no ids filter is provided', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));

      const actual = await documentRepository.find({
        filters: { establishmentIds: [establishment.id] }
      });

      expect(actual.some((d) => d.id === document.id)).toBe(true);
    });

    it('should only return documents belonging to the specified establishment', async () => {
      const establishment2 = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment2));
      const user2 = genUserApi(establishment2.id);
      await Users().insert(toUserDBO(user2));

      const doc1 = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      const doc2 = genDocumentApi({
        createdBy: user2.id,
        creator: user2,
        establishmentId: establishment2.id
      });
      await Documents().insert([doc1, doc2].map(toDocumentDBO));

      const actual = await documentRepository.find({
        filters: { establishmentIds: [establishment.id] }
      });

      expect(actual.some((d) => d.id === doc1.id)).toBe(true);
      expect(actual.some((d) => d.id === doc2.id)).toBe(false);
    });

    it('should exclude soft-deleted documents when deleted: false', async () => {
      const liveDocument = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      const deletedDocument = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(
        [liveDocument, deletedDocument].map(toDocumentDBO)
      );
      await documentRepository.remove(deletedDocument.id);

      const actual = await documentRepository.find({
        filters: { deleted: false }
      });

      expect(actual.some((d) => d.id === liveDocument.id)).toBe(true);
      expect(actual.some((d) => d.id === deletedDocument.id)).toBe(false);
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

  describe('toDocumentDBO', () => {
    it('should set updated_at when updatedAt is a Date', () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        updatedAt: new Date().toISOString()
      });
      const dbo = toDocumentDBO({ ...document, updatedAt: new Date().toISOString() });
      expect(dbo.updated_at).not.toBeNull();
    });

    it('should set deleted_at when deletedAt is a Date', () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user
      });
      const dbo = toDocumentDBO({ ...document, deletedAt: new Date().toISOString() });
      expect(dbo.deleted_at).not.toBeNull();
    });
  });

  describe('fromDocumentDBO', () => {
    const baseDBO = {
      id: uuidv4(),
      filename: 'test.pdf',
      s3_key: 'documents/test.pdf',
      content_type: 'application/pdf',
      size_bytes: 1024,
      establishment_id: uuidv4(),
      created_by: uuidv4(),
      created_at: new Date(),
      updated_at: null,
      deleted_at: null
    };

    const userDBO = {
      id: uuidv4(),
      email: 'test@example.com',
      password: 'hash',
      first_name: 'Test',
      last_name: 'User',
      establishment_id: uuidv4(),
      role: 1,
      activated_at: new Date(),
      last_authenticated_at: null,
      suspended_at: null,
      suspended_cause: null,
      deleted_at: null,
      updated_at: new Date(),
      phone: null,
      position: null,
      time_per_week: null,
      kind: null,
      two_factor_secret: null,
      two_factor_enabled_at: null,
      two_factor_code: null,
      two_factor_code_generated_at: null,
      two_factor_failed_attempts: 0,
      two_factor_locked_until: null
    };

    it('should throw when creator is null', () => {
      expect(() =>
        fromDocumentDBO({ ...baseDBO, creator: null as never })
      ).toThrow('Creator not fetched');
    });

    it('should return non-null updatedAt Date when updated_at is set', () => {
      const dbo = { ...baseDBO, creator: userDBO, updated_at: new Date() };
      const result = fromDocumentDBO(dbo);
      expect(result.updatedAt).not.toBeNull();
    });

    it('should return non-null deletedAt Date when deleted_at is set', () => {
      const dbo = { ...baseDBO, creator: userDBO, deleted_at: new Date() };
      const result = fromDocumentDBO(dbo);
      expect(result.deletedAt).not.toBeNull();
    });
  });
});
