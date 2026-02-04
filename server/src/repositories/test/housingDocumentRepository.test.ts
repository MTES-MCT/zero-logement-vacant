import { faker } from '@faker-js/faker/locale/fr';

import { HousingDocumentApi } from '~/models/HousingDocumentApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import housingDocumentRepository, {
  HousingDocuments,
  toDocumentDBO,
  toHousingDocumentDBO,
  type HousingDocumentDBO
} from '~/repositories/housingDocumentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingDocumentApi,
  genUserApi
} from '~/test/testFixtures';
import { Documents } from '../documentRepository';

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
      const allLinks = await HousingDocuments().whereIn(
        'document_id',
        housingDocuments.map((d) => d.id)
      );

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

  describe('unlinkMany', () => {
    it('should unlink multiple documents from all housings', async () => {
      const housings = [genHousingApi(), genHousingApi()];
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

      await Housing().insert(housings.map(formatHousingRecordApi));
      await Documents().insert(housingDocuments.map(toDocumentDBO));

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
      const linksBefore = await HousingDocuments().whereIn(
        'document_id',
        housingDocuments.map((doc) => doc.id)
      );
      expect(linksBefore).toHaveLength(4);

      await housingDocumentRepository.unlinkMany({
        documentIds: housingDocuments.map((doc) => doc.id)
      });

      const linksAfter = await HousingDocuments().whereIn(
        'document_id',
        housingDocuments.map((doc) => doc.id)
      );
      expect(linksAfter).toBeEmpty();
    });

    it('should handle empty array', async () => {
      await housingDocumentRepository.unlinkMany({ documentIds: [] });
      // Should not throw
    });

    it('should only unlink specified documents', async () => {
      const housing = genHousingApi();
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

      await Housing().insert(formatHousingRecordApi(housing));
      await Documents().insert(documents.map(toDocumentDBO));

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

      const remainingLinks = await HousingDocuments().where({
        housing_id: housing.id
      });
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0].document_id).toBe(documents[1].id);
    });
  });
});
