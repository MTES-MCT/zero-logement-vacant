import { faker } from '@faker-js/faker/locale/fr';

import { HousingDocumentApi } from '~/models/HousingDocumentApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import housingDocumentRepository, {
  Documents,
  HousingDocuments,
  toHousingDocumentDBO
} from '~/repositories/housingDocumentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingDocumentApi,
  genUserApi
} from '~/test/testFixtures';
import type { HousingApi } from '~/models/HousingApi';
import { toDocumentDBO, type DocumentDBO } from '../documentRepository';

describe('Housing document repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('create', () => {
    const housing = genHousingApi();
    const document = genHousingDocumentApi(housing, user);

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));

      await housingDocumentRepository.create(document);
    });

    it('should create the document', async () => {
      const actual = await Documents().where({ id: document.id }).first();

      expect(actual).toMatchObject({
        id: document.id,
        filename: document.filename,
        s3_key: document.s3Key,
        content_type: document.contentType,
        size_bytes: document.sizeBytes,
        created_by: document.createdBy,
        deleted_at: null
      });
    });

    it('should link the document to its housing', async () => {
      const actual = await HousingDocuments()
        .where({
          document_id: document.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        })
        .first();

      expect(actual).toBeDefined();
    });
  });

  describe('createMany', () => {
    const housing = genHousingApi();
    const documents: HousingDocumentApi[] = [
      genHousingDocumentApi(housing, user),
      genHousingDocumentApi(housing, user),
      genHousingDocumentApi(housing, user)
    ];

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));

      await housingDocumentRepository.createMany(documents);
    });

    it('should create all documents', async () => {
      const actual = await Documents()
        .whereIn(
          'id',
          documents.map((d) => d.id)
        )
        .select();

      expect(actual).toHaveLength(3);
    });

    it('should link all documents to the housing', async () => {
      const actual = await HousingDocuments()
        .whereIn(
          'document_id',
          documents.map((d) => d.id)
        )
        .select();

      expect(actual).toHaveLength(3);
      expect(actual).toSatisfyAll((link) => {
        return (
          link.housing_id === housing.id &&
          link.housing_geo_code === housing.geoCode
        );
      });
    });

    it('should handle empty array', async () => {
      await expect(
        housingDocumentRepository.createMany([])
      ).resolves.not.toThrow();
    });

    it('should fail when attempting to create documents with duplicate IDs', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      const doc1 = genHousingDocumentApi(housing, user);
      const doc2 = { ...genHousingDocumentApi(housing, user), id: doc1.id };

      await expect(
        housingDocumentRepository.createMany([doc1, doc2])
      ).rejects.toThrow();

      // Verify no documents were created
      const actual = await Documents().where({ id: doc1.id }).first();
      expect(actual).toBeUndefined();
    });

    it('should rollback transaction on partial failure', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      const validDoc = genHousingDocumentApi(housing, user);
      const invalidDoc = {
        ...genHousingDocumentApi(housing, user),
        // Set an invalid field that should cause the insert to fail
        createdBy: faker.string.uuid() // Non-existent user ID
      };

      await expect(
        housingDocumentRepository.createMany([validDoc, invalidDoc])
      ).rejects.toThrow();

      // Verify the valid document was also rolled back
      const actualValid = await Documents().where({ id: validDoc.id }).first();
      expect(actualValid).toBeUndefined();

      // Verify no housing_documents links were created
      const actualLinks = await HousingDocuments()
        .whereIn('document_id', [validDoc.id, invalidDoc.id])
        .select();
      expect(actualLinks).toHaveLength(0);
    });
  });

  describe('findByHousing', () => {
    const housing = genHousingApi();
    const documents: ReadonlyArray<HousingDocumentApi> = [
      {
        ...genHousingDocumentApi(housing, user),
        deletedAt: null
      },
      {
        ...genHousingDocumentApi(housing, user),
        deletedAt: new Date().toJSON()
      }
    ];

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await housingDocumentRepository.createMany(documents);

      // Manually soft-delete the second document
      await Documents()
        .where('id', documents[1].id)
        .update({ deleted_at: new Date(documents[1].deletedAt!) });
    });

    it('should return all the documents of a housing', async () => {
      const actual = await housingDocumentRepository.findByHousing(housing);

      expect(actual).toIncludeAllPartialMembers(
        documents.map((doc) => ({ id: doc.id }))
      );
    });

    it('should return all documents including deleted when no filters are provided', async () => {
      const actual = await housingDocumentRepository.findByHousing(housing);

      expect(actual).toHaveLength(documents.length);
      const deletedDocs = actual.filter((doc) => doc.deletedAt !== null);
      const nonDeletedDocs = actual.filter((doc) => doc.deletedAt === null);

      expect(deletedDocs.length).toBeGreaterThan(0);
      expect(nonDeletedDocs.length).toBeGreaterThan(0);
    });

    it('should return the deleted documents of a housing', async () => {
      const actual = await housingDocumentRepository.findByHousing(housing, {
        filters: {
          deleted: true
        }
      });

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<HousingDocumentApi>((doc) => {
        return doc.deletedAt !== null;
      });
    });

    it('should return the non-deleted documents of a housing', async () => {
      const actual = await housingDocumentRepository.findByHousing(housing, {
        filters: {
          deleted: false
        }
      });

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<HousingDocumentApi>((doc) => {
        return doc.deletedAt === null;
      });
    });

    it('should include creator information', async () => {
      const actual = await housingDocumentRepository.findByHousing(housing, {
        filters: { deleted: false }
      });

      expect(actual.length).toBeGreaterThan(0);
      expect(actual[0].creator).toBeDefined();
      expect(actual[0].creator.id).toBe(user.id);
      expect(actual[0].creator.email).toBe(user.email);
    });

    it('should order by created_at desc', async () => {
      const actual = await housingDocumentRepository.findByHousing(housing, {
        filters: { deleted: false }
      });

      expect(actual).toBeSortedBy('createdAt', {
        descending: true
      });
    });
  });

  describe('get', () => {
    const housing = genHousingApi();
    const document = genHousingDocumentApi(housing, user);

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));

      await housingDocumentRepository.create(document);
    });

    it('should return null if the document is missing', async () => {
      const actual = await housingDocumentRepository.get(faker.string.uuid());

      expect(actual).toBeNull();
    });

    it('should return the document if it exists', async () => {
      const actual = await housingDocumentRepository.get(document.id);

      expect(actual).toBeDefined();
      expect(actual).toMatchObject<Partial<HousingDocumentApi>>({
        id: document.id,
        filename: document.filename,
        s3Key: document.s3Key,
        contentType: document.contentType,
        sizeBytes: document.sizeBytes,
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        createdBy: user.id
      });
    });

    it('should include creator information', async () => {
      const actual = await housingDocumentRepository.get(document.id);

      expect(actual).toBeDefined();
      expect(actual!.creator).toBeDefined();
      expect(actual!.creator.id).toBe(user.id);
      expect(actual!.creator.email).toBe(user.email);
    });

    it('should return null when housing does not match', async () => {
      const differentHousing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(differentHousing));

      // The document belongs to 'housing', not 'differentHousing'
      const actual = await housingDocumentRepository.get(document.id, {
        housing: [differentHousing]
      });

      expect(actual).toBeNull();
    });
  });

  describe('update', () => {
    let housing: HousingApi = genHousingApi();
    let document: HousingDocumentApi = genHousingDocumentApi(housing, user);

    beforeAll(async () => {
      housing = genHousingApi();
      document = genHousingDocumentApi(housing, user);

      await Housing().insert(formatHousingRecordApi(housing));
      await Documents().insert(toDocumentDBO(document));
      await HousingDocuments().insert(toHousingDocumentDBO(document));
    });

    it('should update the document filename and updated_at field', async () => {
      const newFilename = 'Nouveau nom';
      const updatedAt = new Date().toISOString();

      await housingDocumentRepository.update({
        ...document,
        filename: newFilename,
        updatedAt
      });

      const actual = await Documents().where({ id: document.id }).first();

      expect(actual).toMatchObject({
        id: document.id,
        filename: newFilename,
        updated_at: new Date(updatedAt)
      });
    });

    it('should preserve other fields when updating only filename', async () => {
      const newFilename = 'Nouveau nom';

      await housingDocumentRepository.update({
        ...document,
        filename: newFilename,
        updatedAt: new Date().toISOString()
      });

      const actual = await Documents().where({ id: document.id }).first();

      expect(actual).toMatchObject<Partial<DocumentDBO>>({
        id: document.id,
        s3_key: document.s3Key,
        content_type: document.contentType,
        size_bytes: document.sizeBytes,
        created_by: document.createdBy
      });
    });
  });

  describe('remove', () => {
    it('should soft-delete the document', async () => {
      const housing = genHousingApi();
      const document = genHousingDocumentApi(housing, user);
      await Housing().insert(formatHousingRecordApi(housing));

      await housingDocumentRepository.create(document);

      await housingDocumentRepository.remove(document);

      const actualDocument = await Documents()
        .where({ id: document.id })
        .first();

      expect(actualDocument).toBeDefined();
      expect(actualDocument!.deleted_at).not.toBeNull();

      const actualLink = await HousingDocuments()
        .where({ document_id: document.id, housing_id: housing.id })
        .first();

      expect(actualLink).toBeDefined();
    });
  });
});
