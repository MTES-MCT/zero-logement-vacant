import { describe, it, expect, beforeAll } from 'vitest';

import documentHousingRepository, {
  DocumentsHousings,
  type DocumentHousingDBO
} from '../documentHousingRepository';
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

describe('documentHousingRepository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('create', () => {
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

      await documentHousingRepository.create(housingDocument);

      const actual = await DocumentsHousings()
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

      await documentHousingRepository.create(housingDocument);
      await documentHousingRepository.create(housingDocument); // Second call

      const actual = await DocumentsHousings().where(
        'document_id',
        housingDocument.id
      );
      expect(actual).toHaveLength(1); // Still only 1 link
    });
  });

  describe('createMany', () => {
    it('should create multiple document-housing links', async () => {
      const housings = [
        genHousingApi(),
        genHousingApi()
      ];
      await Housing().insert(housings.map(formatHousingRecordApi));

      const housingDocuments = [
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user,
          housingId: housings[0].id,
          housingGeoCode: housings[0].geoCode
        }),
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user,
          housingId: housings[1].id,
          housingGeoCode: housings[1].geoCode
        }),
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user,
          housingId: housings[0].id,
          housingGeoCode: housings[0].geoCode
        }),
        genHousingDocumentApi({
          createdBy: user.id,
          creator: user,
          housingId: housings[1].id,
          housingGeoCode: housings[1].geoCode
        })
      ];

      // Insert the documents
      await Documents().insert(housingDocuments.map(toDocumentDBO));

      await documentHousingRepository.createMany(housingDocuments);

      // Should create 4 links
      const allLinks = await DocumentsHousings().whereIn(
        'document_id',
        housingDocuments.map((d) => d.id)
      );

      expect(allLinks).toHaveLength(4);
    });

    it('should handle empty arrays', async () => {
      await expect(
        documentHousingRepository.createMany([])
      ).resolves.not.toThrow();
    });
  });

  describe('remove', () => {
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

      const linkDBO: DocumentHousingDBO = {
        document_id: housingDocument.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      };
      await DocumentsHousings().insert(linkDBO);

      await documentHousingRepository.remove({
        documentId: housingDocument.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      });

      const actual = await DocumentsHousings().where(
        'document_id',
        housingDocument.id
      );
      expect(actual).toHaveLength(0);
    });
  });

  describe('findByDocument', () => {
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

      const links: DocumentHousingDBO[] = [
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
      await DocumentsHousings().insert(links);

      const actual = await documentHousingRepository.findByDocument(
        housingDocument.id
      );

      expect(actual).toHaveLength(2);
      expect(actual).toIncludeAllPartialMembers([
        { housingId: housings[0].id },
        { housingId: housings[1].id }
      ]);
    });
  });

  describe('findByHousing', () => {
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

      const links: DocumentHousingDBO[] = [
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
      await DocumentsHousings().insert(links);

      const actual = await documentHousingRepository.findByHousing({
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
