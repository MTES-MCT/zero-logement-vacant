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
  DocumentDBO,
  Documents,
  HousingDocuments,
  toDocumentDBO,
  toHousingDocumentDBO,
  type HousingDocumentDBO
} from '~/repositories/housingDocumentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingDocumentApi,
  genUserApi
} from '~/test/testFixtures';

describe('Housing document repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('link', () => {
    it('should create document-housing link', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      const housingDocument = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });
      await Documents().insert(toDocumentDBO(housingDocument));

      await housingDocumentRepository.link(housingDocument);

      const actual = await HousingDocuments()
        .where('document_id', housingDocument.id)
        .first();

      expect(actual).toMatchObject({
        document_id: housingDocument.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
    });

    it('should be idempotent (ignore duplicate links)', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      const housingDocument = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });
      await Documents().insert(toDocumentDBO(housingDocument));

      await housingDocumentRepository.link(housingDocument);
      await housingDocumentRepository.link(housingDocument); // Second call

      const actual = await HousingDocuments().where(
        'document_id',
        housingDocument.id
      );
      expect(actual).toHaveLength(1); // Still only 1 link
    });
  });

  describe('linkMany', () => {
    it('should create multiple document-housing links (cartesian product)', async () => {
      const housings = [genHousingApi(), genHousingApi()];
      await Housing().insert(housings.map(formatHousingRecordApi));

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
      await Documents().insert(housingDocuments.map(toDocumentDBO));

      // Link 2 documents × 2 housings = 4 links
      await housingDocumentRepository.linkMany({
        documentIds: housingDocuments.map((d) => d.id),
        housingIds: housings.map((h) => h.id),
        housingGeoCodes: housings.map((h) => h.geoCode)
      });

      // Should create 4 links
      const allLinks = await HousingDocuments().whereIn(
        'document_id',
        housingDocuments.map((d) => d.id)
      );

      expect(allLinks).toHaveLength(4);
    });

    it('should handle empty arrays', async () => {
      await expect(
        housingDocumentRepository.linkMany({
          documentIds: [],
          housingIds: [],
          housingGeoCodes: []
        })
      ).resolves.not.toThrow();
    });
  });

  describe('unlink', () => {
    it('should remove document-housing link', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

      const housingDocument = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });
      await Documents().insert(toDocumentDBO(housingDocument));

      const linkDBO: HousingDocumentDBO = {
        document_id: housingDocument.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      };
      await HousingDocuments().insert(linkDBO);

      await housingDocumentRepository.unlink({
        documentId: housingDocument.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      });

      const actual = await HousingDocuments().where(
        'document_id',
        housingDocument.id
      );
      expect(actual).toHaveLength(0);
    });
  });

  describe('findLinksByDocument', () => {
    it('should find all housings linked to document', async () => {
      const housings = [genHousingApi(), genHousingApi()];
      await Housing().insert(housings.map(formatHousingRecordApi));

      const housingDocument = genHousingDocumentApi({
        createdBy: user.id,
        creator: user
      });
      await Documents().insert(toDocumentDBO(housingDocument));

      const links: HousingDocumentDBO[] = [
        {
          document_id: housingDocument.id,
          housing_geo_code: housings[0].geoCode,
          housing_id: housings[0].id
        },
        {
          document_id: housingDocument.id,
          housing_geo_code: housings[1].geoCode,
          housing_id: housings[1].id
        }
      ];
      await HousingDocuments().insert(links);

      const actual = await housingDocumentRepository.findLinksByDocument(
        housingDocument.id
      );

      expect(actual).toHaveLength(2);
      expect(actual).toIncludeAllPartialMembers([
        { housingId: housings[0].id },
        { housingId: housings[1].id }
      ]);
    });
  });

  describe('findLinksByHousing', () => {
    it('should find all documents linked to housing', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

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
      await Documents().insert(housingDocuments.map(toDocumentDBO));

      const links: HousingDocumentDBO[] = [
        {
          document_id: housingDocuments[0].id,
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        },
        {
          document_id: housingDocuments[1].id,
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        }
      ];
      await HousingDocuments().insert(links);

      const actual = await housingDocumentRepository.findLinksByHousing({
        geoCode: housing.geoCode,
        id: housing.id
      });

      expect(actual).toHaveLength(2);
      expect(actual).toIncludeAllPartialMembers([
        { documentId: housingDocuments[0].id },
        { documentId: housingDocuments[1].id }
      ]);
    });
  });

  describe('findByHousing', () => {
    const housing = genHousingApi();
    const documents: ReadonlyArray<HousingDocumentApi> = [
      {
        ...genHousingDocumentApi({
          createdBy: user.id,
          creator: user,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        }),
        deletedAt: null
      },
      {
        ...genHousingDocumentApi({
          createdBy: user.id,
          creator: user,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        }),
        deletedAt: new Date().toJSON()
      }
    ];

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));

      // Insert documents and links manually
      await Documents().insert(documents.map(toDocumentDBO));
      await HousingDocuments().insert(documents.map(toHousingDocumentDBO));

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
    const document = genHousingDocumentApi({
      createdBy: user.id,
      creator: user,
      housingId: housing.id,
      housingGeoCode: housing.geoCode
    });

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));

      // Insert document and link manually
      await Documents().insert(toDocumentDBO(document));
      await HousingDocuments().insert(toHousingDocumentDBO(document));
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
    const housing = genHousingApi();
    const document = genHousingDocumentApi({
      createdBy: user.id,
      creator: user,
      housingId: housing.id,
      housingGeoCode: housing.geoCode
    });

    beforeAll(async () => {
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
      const document = genHousingDocumentApi({
        createdBy: user.id,
        creator: user,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });
      await Housing().insert(formatHousingRecordApi(housing));

      // Insert document and link manually
      await Documents().insert(toDocumentDBO(document));
      await HousingDocuments().insert(toHousingDocumentDBO(document));

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
