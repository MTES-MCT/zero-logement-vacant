import { describe, it, expect, beforeAll } from 'vitest';


import housingDocumentRepository, {
  HousingDocuments,
  type HousingDocumentDBO
} from '../housingDocumentRepository';
import { Documents, toDocumentDBO } from '~/repositories/documentRepository';
import { Documents, toDocumentDBO } from '~/repositories/documentRepository';
import { Users, formatUserApi } from '~/repositories/userRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Housing, formatHousingRecordApi } from '~/repositories/housingRepository';
import {
  genHousingDocumentApi,
  genUserApi,
  genEstablishmentApi,
  genHousingApi
} from '~/test/testFixtures';

describe('housingDocumentRepository - junction table operations', () => {
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
      const housings = [
        genHousingApi(),
        genHousingApi()
      ];
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
        documentIds: housingDocuments.map(d => d.id),
        housingIds: housings.map(h => h.id),
        housingGeoCodes: housings.map(h => h.geoCode)
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
      const housings = [
        genHousingApi(),
        genHousingApi()
      ];
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
});
