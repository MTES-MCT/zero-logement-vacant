import { faker } from '@faker-js/faker/locale/fr';

import { kysely } from '~/infra/database/kysely';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingDocumentApi } from '~/models/HousingDocumentApi';
import { UserApi } from '~/models/UserApi';
import { toDocumentInsert } from '~/repositories/documentRepository';
import housingDocumentRepository, {
  fromHousingDocumentDBO,
  toHousingDocumentInsert
} from '~/repositories/housingDocumentRepository';
import { factories } from '~/test/factories';
import { genHousingDocumentApi } from '~/test/testFixtures';

describe('Housing document repository', () => {
  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('link', () => {
    it('should create document-housing link', async () => {
      const housing = await factories.housing.create();

      const housingDocument = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(housingDocument))
        .execute();

      await housingDocumentRepository.link(housingDocument);

      const actual = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where('documentId', '=', housingDocument.id)
        .executeTakeFirst();

      expect(actual).toMatchObject({
        documentId: housingDocument.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      });
    });

    it('should be idempotent (ignore duplicate links)', async () => {
      const housing = await factories.housing.create();

      const housingDocument = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(housingDocument))
        .execute();

      await housingDocumentRepository.link(housingDocument);
      await housingDocumentRepository.link(housingDocument); // Second call

      const actual = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where('documentId', '=', housingDocument.id)
        .execute();
      expect(actual).toHaveLength(1); // Still only 1 link
    });
  });

  describe('linkMany', () => {
    it('should create multiple document-housing links (cartesian product)', async () => {
      const housings = await factories.housing.createList(2);

      const housingDocuments = [
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user
        }),
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user
        })
      ];

      // Insert the documents
      await kysely
        .insertInto('documents')
        .values(housingDocuments.map(toDocumentInsert))
        .execute();

      // Link 2 documents × 2 housings = 4 links (cartesian product)
      const links = housingDocuments.flatMap((d) =>
        housings.map((h) => ({
          document_id: d.id,
          housing_id: h.id,
          housing_geo_code: h.geoCode
        }))
      );
      await housingDocumentRepository.linkMany(links);

      // Should create 4 links
      const allLinks = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where(
          'documentId',
          'in',
          housingDocuments.map((d) => d.id)
        )
        .execute();

      expect(allLinks).toHaveLength(4);
    });

    it('should handle empty arrays', async () => {
      await expect(
        housingDocumentRepository.linkMany([])
      ).resolves.not.toThrow();
    });
  });

  describe('unlink', () => {
    it('should remove document-housing link', async () => {
      const housing = await factories.housing.create();

      const housingDocument = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(housingDocument))
        .execute();

      await kysely
        .insertInto('documentsHousings')
        .values(toHousingDocumentInsert(housingDocument))
        .execute();

      await housingDocumentRepository.unlink({
        documentId: housingDocument.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      });

      const actual = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where('documentId', '=', housingDocument.id)
        .execute();
      expect(actual).toHaveLength(0);
    });
  });

  describe('get', () => {
    let housing: HousingApi;
    let document: HousingDocumentApi;

    beforeAll(async () => {
      housing = await factories.housing.create();
      document = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });

      // Insert document and link manually
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values(toHousingDocumentInsert(document))
        .execute();
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
      const differentHousing = await factories.housing.create();

      // The document belongs to 'housing', not 'differentHousing'
      const actual = await housingDocumentRepository.get(document.id, {
        housing: [differentHousing]
      });

      expect(actual).toBeNull();
    });
  });

  describe('remove', () => {
    it('should soft-delete the document', async () => {
      const housing = await factories.housing.create();
      const document = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });

      // Insert document and link manually
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values(toHousingDocumentInsert(document))
        .execute();

      await housingDocumentRepository.remove(document);

      const actualDocument = await kysely
        .selectFrom('documents')
        .select('deletedAt')
        .where('id', '=', document.id)
        .executeTakeFirst();

      expect(actualDocument).toBeDefined();
      expect(actualDocument!.deletedAt).not.toBeNull();

      const actualLink = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where('documentId', '=', document.id)
        .where('housingId', '=', housing.id)
        .executeTakeFirst();

      expect(actualLink).toBeDefined();
    });
  });

  describe('unlinkMany', () => {
    it('should unlink multiple documents from all housings', async () => {
      const housings = await factories.housing.createList(2);
      const housingDocuments = [
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user
        }),
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user
        })
      ];

      await kysely
        .insertInto('documents')
        .values(housingDocuments.map(toDocumentInsert))
        .execute();

      // Link all documents to all housings (cartesian product)
      const links = housingDocuments.flatMap((doc) =>
        housings.map((h) => ({
          document_id: doc.id,
          housing_id: h.id,
          housing_geo_code: h.geoCode
        }))
      );
      await housingDocumentRepository.linkMany(links);

      // Verify links were created (2 documents × 2 housings = 4 links)
      const linksBefore = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where(
          'documentId',
          'in',
          housingDocuments.map((doc) => doc.id)
        )
        .execute();
      expect(linksBefore).toHaveLength(4);

      await housingDocumentRepository.unlinkMany({
        documentIds: housingDocuments.map((doc) => doc.id)
      });

      const linksAfter = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where(
          'documentId',
          'in',
          housingDocuments.map((doc) => doc.id)
        )
        .execute();
      expect(linksAfter).toBeEmpty();
    });

    it('should handle empty array', async () => {
      await housingDocumentRepository.unlinkMany({ documentIds: [] });
      // Should not throw
    });

    it('should only unlink specified documents', async () => {
      const housing = await factories.housing.create();
      const documents = [
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        }),
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
      ];

      await kysely
        .insertInto('documents')
        .values(documents.map(toDocumentInsert))
        .execute();

      const links = documents.map((doc) => ({
        document_id: doc.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      }));
      await housingDocumentRepository.linkMany(links);

      // Unlink only the first document
      await housingDocumentRepository.unlinkMany({
        documentIds: [documents[0].id]
      });

      const remainingLinks = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where('housingId', '=', housing.id)
        .execute();
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0].documentId).toBe(documents[1].id);
    });
  });

  describe('find', () => {
    it('should return linked documents with housingId, housingGeoCode, and creator populated (no filter)', async () => {
      const housing = await factories.housing.create();
      const document = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });

      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values(toHousingDocumentInsert(document))
        .execute();

      const results = await housingDocumentRepository.find();

      const actual = results.find((r) => r.id === document.id);
      expect(actual).toBeDefined();
      expect(actual).toMatchObject<Partial<HousingDocumentApi>>({
        id: document.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        createdBy: user.id
      });
      expect(actual!.creator).toBeDefined();
      expect(actual!.creator.id).toBe(user.id);
    });

    it('should filter by documentIds', async () => {
      const housing1 = await factories.housing.create();
      const housing2 = await factories.housing.create();
      const document1 = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing1.id,
        housingGeoCode: housing1.geoCode
      });
      const document2 = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing2.id,
        housingGeoCode: housing2.geoCode
      });

      await kysely
        .insertInto('documents')
        .values([toDocumentInsert(document1), toDocumentInsert(document2)])
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values([
          toHousingDocumentInsert(document1),
          toHousingDocumentInsert(document2)
        ])
        .execute();

      const results = await housingDocumentRepository.find({
        filters: { documentIds: [document1.id] }
      });

      const ids = results.map((r) => r.id);
      expect(ids).toContain(document1.id);
      expect(ids).not.toContain(document2.id);
    });

    it('should filter by housingIds composite key', async () => {
      const housing1 = await factories.housing.create();
      const housing2 = await factories.housing.create();
      const document1 = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing1.id,
        housingGeoCode: housing1.geoCode
      });
      const document2 = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing2.id,
        housingGeoCode: housing2.geoCode
      });

      await kysely
        .insertInto('documents')
        .values([toDocumentInsert(document1), toDocumentInsert(document2)])
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values([
          toHousingDocumentInsert(document1),
          toHousingDocumentInsert(document2)
        ])
        .execute();

      const results = await housingDocumentRepository.find({
        filters: {
          housingIds: [{ geoCode: housing1.geoCode, id: housing1.id }]
        }
      });

      const ids = results.map((r) => r.id);
      expect(ids).toContain(document1.id);
      expect(ids).not.toContain(document2.id);
    });

    it('should return only soft-deleted documents when deleted: true', async () => {
      const housingLive = await factories.housing.create();
      const housingDeleted = await factories.housing.create();
      const liveDoc = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housingLive.id,
        housingGeoCode: housingLive.geoCode
      });
      const deletedDoc = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housingDeleted.id,
        housingGeoCode: housingDeleted.geoCode
      });

      await kysely
        .insertInto('documents')
        .values([toDocumentInsert(liveDoc), toDocumentInsert(deletedDoc)])
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values([
          toHousingDocumentInsert(liveDoc),
          toHousingDocumentInsert(deletedDoc)
        ])
        .execute();

      // Soft-delete one document
      await kysely
        .updateTable('documents')
        .set({ deletedAt: new Date() })
        .where('id', '=', deletedDoc.id)
        .execute();

      const results = await housingDocumentRepository.find({
        filters: {
          deleted: true,
          documentIds: [liveDoc.id, deletedDoc.id]
        }
      });

      const ids = results.map((r) => r.id);
      expect(ids).toContain(deletedDoc.id);
      expect(ids).not.toContain(liveDoc.id);
    });

    it('should return only live documents when deleted: false', async () => {
      const housingLive = await factories.housing.create();
      const housingDeleted = await factories.housing.create();
      const liveDoc = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housingLive.id,
        housingGeoCode: housingLive.geoCode
      });
      const deletedDoc = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housingDeleted.id,
        housingGeoCode: housingDeleted.geoCode
      });

      await kysely
        .insertInto('documents')
        .values([toDocumentInsert(liveDoc), toDocumentInsert(deletedDoc)])
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values([
          toHousingDocumentInsert(liveDoc),
          toHousingDocumentInsert(deletedDoc)
        ])
        .execute();

      // Soft-delete one document
      await kysely
        .updateTable('documents')
        .set({ deletedAt: new Date() })
        .where('id', '=', deletedDoc.id)
        .execute();

      const results = await housingDocumentRepository.find({
        filters: {
          deleted: false,
          documentIds: [liveDoc.id, deletedDoc.id]
        }
      });

      const ids = results.map((r) => r.id);
      expect(ids).toContain(liveDoc.id);
      expect(ids).not.toContain(deletedDoc.id);
    });

    it('should return only live documents when deleted filter is absent', async () => {
      const housingLive = await factories.housing.create();
      const housingDeleted = await factories.housing.create();
      const liveDoc = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housingLive.id,
        housingGeoCode: housingLive.geoCode
      });
      const deletedDoc = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housingDeleted.id,
        housingGeoCode: housingDeleted.geoCode
      });

      await kysely
        .insertInto('documents')
        .values([toDocumentInsert(liveDoc), toDocumentInsert(deletedDoc)])
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values([
          toHousingDocumentInsert(liveDoc),
          toHousingDocumentInsert(deletedDoc)
        ])
        .execute();

      // Soft-delete one document
      await kysely
        .updateTable('documents')
        .set({ deletedAt: new Date() })
        .where('id', '=', deletedDoc.id)
        .execute();

      const results = await housingDocumentRepository.find({
        filters: { documentIds: [liveDoc.id, deletedDoc.id] }
      });

      const ids = results.map((r) => r.id);
      expect(ids).toContain(liveDoc.id);
      expect(ids).not.toContain(deletedDoc.id);
    });
  });

  describe('fromHousingDocumentDBO', () => {
    it('should throw "Creator not fetched" when creator is null', () => {
      const dbo = {
        id: faker.string.uuid(),
        filename: faker.system.fileName(),
        s3_key: faker.string.uuid(),
        content_type: 'application/pdf',
        size_bytes: 1024,
        establishment_id: faker.string.uuid(),
        created_by: faker.string.uuid(),
        created_at: new Date(),
        updated_at: null,
        deleted_at: null,
        document_id: faker.string.uuid(),
        housing_geo_code: faker.location.zipCode('######'),
        housing_id: faker.string.uuid(),
        creator:
          null as unknown as import('~/repositories/userRepository').UserDBO
      };

      expect(() => fromHousingDocumentDBO(dbo)).toThrow('Creator not fetched');
    });
  });
});
