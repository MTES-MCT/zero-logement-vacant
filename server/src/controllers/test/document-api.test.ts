import { faker } from '@faker-js/faker/locale/fr';
import { HousingDocumentDTO, UserRole } from '@zerologementvacant/models';
import { constants } from 'http2';
import request from 'supertest';

import type { DeepPartial } from 'ts-essentials';
import { createServer } from '~/infra/server';
import { UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import housingDocumentRepository from '~/repositories/housingDocumentRepository';
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
import { tokenProvider } from '~/test/testUtils';

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
  const anotherEstablishment = genEstablishmentApi('23456');
  const userFromAnotherEstablishment = genUserApi(anotherEstablishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(
      [user, admin, anotherUser, userFromAnotherEstablishment].map(
        formatUserApi
      )
    );
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

  describe('POST /housing/:id/documents', () => {
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
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url)
        .post(testRoute(housing.id))
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should forbid uploading to housing outside of an establishment’s perimeter', async () => {
      const { status } = await request(url)
        .post(testRoute(anotherHousing.id))
        .attach('file', Buffer.from('test'), 'test.pdf')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 400 Bad request if no file is uploaded', async () => {
      const { status } = await request(url)
        .post(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return 201 Created with the uploaded document', async () => {
      const { status, body } = await request(url)
        .post(testRoute(housing.id))
        .attach('file', Buffer.from('test content'), 'document.pdf')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<DeepPartial<HousingDocumentDTO>>({
        id: expect.any(String),
        filename: 'document.pdf',
        url: expect.stringMatching(/^http/),
        contentType: 'application/pdf',
        sizeBytes: expect.any(Number),
        createdAt: expect.any(String),
        updatedAt: null,
        creator: {
          id: user.id,
          email: user.email
        }
      });
    });
  });

  describe('PUT /documents/:id', () => {
    const testRoute = (documentId: string) => `/api/documents/${documentId}`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );
    const userDocument = genHousingDocumentApi(housing, user);
    const anotherUserDocument = genHousingDocumentApi(housing, anotherUser);

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await housingDocumentRepository.createMany([
        userDocument,
        anotherUserDocument
      ]);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url)
        .put(testRoute(userDocument.id))
        .send({ filename: 'nouveau-nom.pdf' });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return 404 Not found if document does not exist', async () => {
      const { status } = await request(url)
        .put(testRoute(faker.string.uuid()))
        .send({ filename: 'nouveau-nom.pdf' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should forbid updating a document created by another user', async () => {
      const { status } = await request(url)
        .put(testRoute(anotherUserDocument.id))
        .send({ filename: 'nouveau-nom.pdf' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should allow admin to update any document', async () => {
      const { status, body } = await request(url)
        .put(testRoute(anotherUserDocument.id))
        .send({ filename: 'admin-rename.pdf' })
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<HousingDocumentDTO>>({
        id: anotherUserDocument.id,
        filename: 'admin-rename.pdf',
        updatedAt: expect.any(String)
      });
    });

    it('should return 200 OK with updated document', async () => {
      const { status, body } = await request(url)
        .put(testRoute(userDocument.id))
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

    it('should return 400 Bad request if filename is missing', async () => {
      const { status } = await request(url)
        .put(testRoute(userDocument.id))
        .send({})
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });
  });

  describe('DELETE /documents/:id', () => {
    const testRoute = (documentId: string) => `/api/documents/${documentId}`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );

    it('should be forbidden for a non-authenticated user', async () => {
      const document = genHousingDocumentApi(housing, user);
      await Housing().insert(formatHousingRecordApi(housing));
      await housingDocumentRepository.create(document);

      const { status } = await request(url).delete(testRoute(document.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return 404 Not found if document does not exist', async () => {
      const { status } = await request(url)
        .delete(testRoute(faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should forbid deleting a document created by another user', async () => {
      const document = genHousingDocumentApi(housing, anotherUser);
      await housingDocumentRepository.create(document);

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should allow admin to delete any document', async () => {
      const document = genHousingDocumentApi(housing, anotherUser);
      await housingDocumentRepository.create(document);

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });

    it('should return 204 No content after deletion', async () => {
      const document = genHousingDocumentApi(housing, user);
      await housingDocumentRepository.create(document);

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });

    it('should soft-delete the document', async () => {
      const document = genHousingDocumentApi(housing, user);
      await housingDocumentRepository.create(document);

      await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      const deletedDocument = await housingDocumentRepository.get(document.id);

      expect(deletedDocument).not.toBeNull();
      expect(deletedDocument!.deletedAt).not.toBeNull();
    });
  });
});
