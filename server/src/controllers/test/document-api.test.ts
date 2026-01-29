import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import {
  HousingDocumentDTO,
  UserRole,
  type DocumentPayload
} from '@zerologementvacant/models';
import { constants } from 'http2';
import path from 'node:path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '~/infra/server';
import { UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import housingDocumentRepository, {
  toHousingDocumentDBO
} from '~/repositories/housingDocumentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { Documents, toDocumentDBO } from '~/repositories/documentRepository';
import {
  genDocumentApi,
  genEstablishmentApi,
  genHousingApi,
  genHousingDocumentApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';
import { DocumentsHousings } from '~/repositories/documentHousingRepository';

describe('Document API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi('12345');
  const user: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.USUAL
  };
  const admin: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.ADMIN
  };
  const anotherUser: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.USUAL
  };
  const visitor: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.VISITOR
  };
  const anotherEstablishment = genEstablishmentApi('23456');
  const userFromAnotherEstablishment = genUserApi(anotherEstablishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(
      [user, admin, anotherUser, visitor, userFromAnotherEstablishment].map(
        formatUserApi
      )
    );
  });

  describe('POST /documents', () => {
    let url: string;

    beforeAll(async () => {
      url = await createServer().testing();
    });

    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
    });

    const samplePdfPath = path.join(__dirname, '../../test/sample.pdf');

    it('should upload a single document successfully', async () => {
      const { body, status } = await request(url)
        .post('/api/documents')
        .use(tokenProvider(user))
        .attach('files', samplePdfPath);

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({
        id: expect.any(String),
        filename: 'sample.pdf',
        url: expect.stringContaining('http'),
        contentType: 'application/pdf'
      });
    });

    it('should upload multiple documents successfully', async () => {
      const { body, status } = await request(url)
        .post('/api/documents')
        .use(tokenProvider(user))
        .attach('files', samplePdfPath)
        .attach('files', samplePdfPath);

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toHaveLength(2);
    });

    it('should return 207 for partial success', async () => {
      const { body, status } = await request(url)
        .post('/api/documents')
        .use(tokenProvider(user))
        .attach('files', samplePdfPath)
        .attach('files', Buffer.from('invalid'), 'invalid.exe');

      expect(status).toBe(constants.HTTP_STATUS_MULTI_STATUS);
      expect(body).toHaveLength(2);

      const [valid, invalid] = body;
      expect(valid).toMatchObject({ filename: 'sample.pdf' });
      expect(invalid).toMatchObject({
        name: 'FileValidationError',
        data: {
          filename: 'invalid.exe',
          reason: 'invalid_file_type'
        }
      });
    });

    it('should return 400 if all files fail validation', async () => {
      const { status } = await request(url)
        .post('/api/documents')
        .use(tokenProvider(user))
        .attach('files', Buffer.from('bad'), 'bad.exe');

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return 400 if no files provided', async () => {
      const { status } = await request(url)
        .post('/api/documents')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });
  });

  describe('PUT /documents/:id', () => {
    const testRoute = (id: string) => `/api/documents/${id}`;

    it('should update document filename', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));
      const payload: DocumentPayload = {
        filename: 'renamed.pdf'
      };

      const { status, body } = await request(url)
        .put(testRoute(document.id))
        .use(tokenProvider(user))
        .send(payload);

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: document.id,
        filename: 'renamed.pdf'
      });
    });

    it('should return 404 if document not found', async () => {
      const payload: DocumentPayload = {
        filename: 'test.pdf'
      };

      const { status } = await request(url)
        .put(testRoute(faker.string.uuid()))
        .use(tokenProvider(user))
        .send(payload);

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should only allow updating documents in user establishment', async () => {
      const document = genDocumentApi({
        createdBy: userFromAnotherEstablishment.id,
        creator: userFromAnotherEstablishment,
        establishmentId: anotherEstablishment.id
      });
      await Documents().insert(toDocumentDBO(document));
      const payload: DocumentPayload = {
        filename: 'hacked.pdf'
      };

      const { status } = await request(url)
        .put(testRoute(document.id))
        .use(tokenProvider(user))
        .send(payload);

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('DELETE /documents/:id', () => {
    const testRoute = (id: string) => `/api/documents/${id}`;

    it('should soft-delete document', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const [deletedDocument] = await Documents()
        .where('id', document.id)
        .select('*');
      expect(deletedDocument).toBeDefined();
      expect(deletedDocument.deleted_at).not.toBeNull();
    });

    it('should return 404 if document not found', async () => {
      const { status } = await request(url)
        .delete(testRoute(faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should only allow deleting documents in user establishment', async () => {
      const document = genDocumentApi({
        createdBy: userFromAnotherEstablishment.id,
        creator: userFromAnotherEstablishment,
        establishmentId: anotherEstablishment.id
      });
      await Documents().insert(toDocumentDBO(document));

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('GET /housing/:id/documents', () => {
    const testRoute = (housingId: string) =>
      `/api/housing/${housingId}/documents`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );
    const anotherHousing = genHousingApi(
      faker.helpers.arrayElement(anotherEstablishment.geoCodes)
    );

    beforeAll(async () => {
      await Housing().insert(
        [housing, anotherHousing].map(formatHousingRecordApi)
      );

      const documents = [
        genHousingDocumentApi(housing, user),
        genHousingDocumentApi(housing, user),
        genHousingDocumentApi(anotherHousing, userFromAnotherEstablishment)
      ];
      await housingDocumentRepository.createMany(documents);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should forbid access to documents of housing outside of an establishment's perimeter", async () => {
      const { status } = await request(url)
        .get(testRoute(anotherHousing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 200 OK with documents list', async () => {
      const { status, body } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(2);
    });

    it('should include pre-signed URLs', async () => {
      const { status, body } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfyAll<HousingDocumentDTO>((doc) => {
        return doc.url.startsWith('http');
      });
    });

    it('should return documents ordered by creation date desc', async () => {
      const { status, body } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeSortedBy('createdAt', {
        descending: true
      });
    });
  });

  describe('PUT /housing/:housingId/documents/:documentId', () => {
    const testRoute = (housingId: string, documentId: string) =>
      `/api/housing/${housingId}/documents/${documentId}`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );
    const housingFromAnotherEstablishment = genHousingApi(
      faker.helpers.arrayElement(anotherEstablishment.geoCodes)
    );
    const userDocument = genHousingDocumentApi(housing, user);
    const documentFromAnotherEstablishment = genHousingDocumentApi(
      housingFromAnotherEstablishment,
      userFromAnotherEstablishment
    );

    beforeAll(async () => {
      await Housing().insert(
        [housing, housingFromAnotherEstablishment].map(formatHousingRecordApi)
      );
      await housingDocumentRepository.createMany([
        userDocument,
        documentFromAnotherEstablishment
      ]);
    });

    it('should return 400 Bad request if filename is missing', async () => {
      const { status } = await request(url)
        .put(testRoute(userDocument.housingId, userDocument.id))
        .send({})
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    test.prop({
      filename: fc.oneof(
        // Empty string after trim (only whitespace)
        fc.stringMatching(/^\s+$/),
        // String exceeding 255 characters
        fc.string({ minLength: 256 }).filter((s) => s.trim().length > 255)
      )
    })(
      'should return 400 Bad request for invalid filename',
      async ({ filename }) => {
        const { status } = await request(url)
          .put(testRoute(userDocument.housingId, userDocument.id))
          .send({ filename })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      }
    );

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url)
        .put(testRoute(userDocument.housingId, userDocument.id))
        .send({ filename: 'nouveau-nom.pdf' });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a visitor', async () => {
      const { status } = await request(url)
        .put(testRoute(userDocument.housingId, userDocument.id))
        .send({ filename: 'nouveau-nom.pdf' })
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should return 404 Not found if the document is missing', async () => {
      const { status } = await request(url)
        .put(testRoute(userDocument.housingId, faker.string.uuid()))
        .send({ filename: 'nouveau-nom.pdf' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 404 Not found if the document belongs to a user from another establishment', async () => {
      const { status } = await request(url)
        .put(
          testRoute(documentFromAnotherEstablishment.housingId, userDocument.id)
        )
        .send({ filename: 'nouveau-nom.pdf' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should allow admin to update any document', async () => {
      const { status, body } = await request(url)
        .put(
          testRoute(
            documentFromAnotherEstablishment.housingId,
            documentFromAnotherEstablishment.id
          )
        )
        .send({ filename: 'admin-rename.pdf' })
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<HousingDocumentDTO>>({
        id: documentFromAnotherEstablishment.id,
        filename: 'admin-rename.pdf',
        updatedAt: expect.any(String)
      });
    });

    it('should return 200 OK with updated document', async () => {
      const { status, body } = await request(url)
        .put(testRoute(userDocument.housingId, userDocument.id))
        .send({ filename: 'nouveau-nom.pdf' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<HousingDocumentDTO>>({
        id: userDocument.id,
        filename: 'nouveau-nom.pdf',
        url: expect.stringMatching(/^http/),
        updatedAt: expect.any(String)
      });
    });
  });

  describe('DELETE /housing/:housingId/documents/:documentId', () => {
    const testRoute = (housingId: string, documentId: string) =>
      `/api/housing/${housingId}/documents/${documentId}`;

    it('should remove association only (keep document)', async () => {
      const housing = genHousingApi(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      await Housing().insert(formatHousingRecordApi(housing));
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      const housingDocument = genHousingDocumentApi({
        ...document,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      });
      await Documents().insert(toDocumentDBO(document));
      await DocumentsHousings().insert(toHousingDocumentDBO(housingDocument));

      const { status } = await request(url)
        .delete(testRoute(housing.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      // Verify association removed
      const links = await DocumentsHousings()
        .where({
          document_id: document.id,
          housing_id: housing.id
        })
        .select('*');
      expect(links).toHaveLength(0);

      // Verify document still exists
      const [doc] = await Documents().where({ id: document.id }).select('*');
      expect(doc).toBeDefined();
      expect(doc.deleted_at).toBeNull();
    });

    it('should return 404 if association not found', async () => {
      const housing = genHousingApi(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      await Housing().insert(formatHousingRecordApi(housing));

      const { status } = await request(url)
        .delete(testRoute(housing.id, faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 404 if housing not found', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));

      const { status } = await request(url)
        .delete(testRoute(faker.string.uuid(), document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 404 if housing belongs to another establishment', async () => {
      const housingFromAnotherEstablishment = genHousingApi(
        faker.helpers.arrayElement(anotherEstablishment.geoCodes)
      );
      await Housing().insert(
        formatHousingRecordApi(housingFromAnotherEstablishment)
      );

      const document = genDocumentApi({
        createdBy: userFromAnotherEstablishment.id,
        creator: userFromAnotherEstablishment,
        establishmentId: anotherEstablishment.id
      });
      await Documents().insert(toDocumentDBO(document));

      await housingDocumentRepository.create({
        ...document,
        housingId: housingFromAnotherEstablishment.id,
        housingGeoCode: housingFromAnotherEstablishment.geoCode
      });

      const { status } = await request(url)
        .delete(testRoute(housingFromAnotherEstablishment.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
