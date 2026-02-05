import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingDocumentDTO,
  UserRole,
  type DocumentDTO,
  type DocumentPayload
} from '@zerologementvacant/models';
import { createS3 } from '@zerologementvacant/utils/node';
import { constants } from 'http2';
import path from 'node:path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import config from '~/infra/config';
import { createServer } from '~/infra/server';
import { UserApi } from '~/models/UserApi';
import { Documents, toDocumentDBO } from '~/repositories/documentRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  DOCUMENT_EVENTS_TABLE,
  Events,
  EVENTS_TABLE,
  HOUSING_DOCUMENT_EVENTS_TABLE,
  type EventDBO
} from '~/repositories/eventRepository';
import { HousingDocuments } from '~/repositories/housingDocumentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genDocumentApi,
  genEstablishmentApi,
  genHousingApi,
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

    it('should create an event "document:created" for each document', async () => {
      const { body, status } = await request(url)
        .post('/api/documents')
        .use(tokenProvider(user))
        .attach('files', samplePdfPath)
        .attach('files', samplePdfPath);

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const documents = body as ReadonlyArray<DocumentDTO>;
      const events = await Events()
        .where({ type: 'document:created' })
        .join(
          DOCUMENT_EVENTS_TABLE,
          `${DOCUMENT_EVENTS_TABLE}.event_id`,
          `${EVENTS_TABLE}.id`
        )
        .whereIn(
          `${DOCUMENT_EVENTS_TABLE}.document_id`,
          documents.map((document) => document.id)
        );
      expect(events).toHaveLength(2);
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

    it('should create an event "document:updated"', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));
      const payload: DocumentPayload = {
        filename: 'renamed.pdf'
      };

      const { status } = await request(url)
        .put(testRoute(document.id))
        .use(tokenProvider(user))
        .send(payload);

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await Events()
        .where({ type: 'document:updated' })
        .join(
          DOCUMENT_EVENTS_TABLE,
          `${DOCUMENT_EVENTS_TABLE}.event_id`,
          `${EVENTS_TABLE}.id`
        )
        .where(`${DOCUMENT_EVENTS_TABLE}.document_id`, document.id)
        .first();
      expect(event).toMatchObject<Partial<EventDBO<'document:updated'>>>({
        type: 'document:updated',
        name: 'Modification d’un document',
        next_old: { filename: document.filename },
        next_new: { filename: payload.filename },
        created_by: user.id
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

    it('should remove the actual file from S3', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));
      const s3 = createS3(config.s3);
      const upload = new PutObjectCommand({
        Bucket: config.s3.bucket,
        Key: document.s3Key
      });
      await s3.send(upload);
      const head = new HeadObjectCommand({
        Bucket: config.s3.bucket,
        Key: document.s3Key
      });
      await s3.send(head);

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      await expect(s3.send(head)).rejects.toThrow();
    });

    it('should create an event "document:removed"', async () => {
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
      const event = await Events()
        .where({ type: 'document:removed' })
        .join(
          DOCUMENT_EVENTS_TABLE,
          `${DOCUMENT_EVENTS_TABLE}.event_id`,
          `${EVENTS_TABLE}.id`
        )
        .where(`${DOCUMENT_EVENTS_TABLE}.document_id`, document.id)
        .first();
      expect(event).toMatchObject<Partial<EventDBO<'document:removed'>>>({
        type: 'document:removed',
        name: 'Suppression d’un document',
        next_old: { filename: document.filename },
        next_new: null,
        created_by: user.id
      });
    });

    it('should create an event "housing:document-removed" for each housing to which the document was attached', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));
      const housings = faker.helpers.multiple(() => genHousingApi());
      await Housing().insert(housings.map(formatHousingRecordApi));
      await HousingDocuments().insert(housings.map(housing => ({
        document_id: document.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      })));

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const events = await Events()
        .where({ type: 'housing:document-removed' })
        .join(
          HOUSING_DOCUMENT_EVENTS_TABLE,
          `${HOUSING_DOCUMENT_EVENTS_TABLE}.event_id`,
          `${EVENTS_TABLE}.id`
        )
        .where(`${HOUSING_DOCUMENT_EVENTS_TABLE}.document_id`, document.id);
      events.forEach((event) => {
        expect(event).toMatchObject<
          Partial<EventDBO<'housing:document-removed'>>
        >({
          type: 'housing:document-removed',
          name: 'Suppression d’un document du logement',
          next_old: { filename: document.filename },
          next_new: null,
          created_by: user.id
        });
      });
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
        genDocumentApi({
          createdBy: anotherUser.id,
          creator: anotherUser,
          establishmentId: establishment.id
        }),
        genDocumentApi({
          createdBy: user.id,
          creator: user,
          establishmentId: establishment.id
        }),
        genDocumentApi({
          createdBy: userFromAnotherEstablishment.id,
          creator: userFromAnotherEstablishment,
          establishmentId: anotherEstablishment.id
        })
      ];

      // Insert documents
      await Documents().insert(documents.map(toDocumentDBO));

      // Link documents to housings
      await HousingDocuments().insert([
        {
          document_id: documents[0].id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        },
        {
          document_id: documents[1].id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        },
        {
          document_id: documents[2].id,
          housing_id: anotherHousing.id,
          housing_geo_code: anotherHousing.geoCode
        }
      ]);
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
      await Documents().insert(toDocumentDBO(document));
      await HousingDocuments().insert({
        document_id: document.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const { status } = await request(url)
        .delete(testRoute(housing.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      // Verify association removed
      const links = await HousingDocuments()
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

    it('should create an event "housing:document-detached"', async () => {
      const housing = genHousingApi(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      await Housing().insert(formatHousingRecordApi(housing));
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));
      await HousingDocuments().insert({
        document_id: document.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const { status } = await request(url)
        .delete(testRoute(housing.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const event = await Events()
        .where({ type: 'housing:document-detached' })
        .join(
          HOUSING_DOCUMENT_EVENTS_TABLE,
          `${HOUSING_DOCUMENT_EVENTS_TABLE}.event_id`,
          `${EVENTS_TABLE}.id`
        )
        .where(`${HOUSING_DOCUMENT_EVENTS_TABLE}.document_id`, document.id)
        .where(`${HOUSING_DOCUMENT_EVENTS_TABLE}.housing_id`, housing.id)
        .first();
      expect(event).toMatchObject<
        Partial<EventDBO<'housing:document-detached'>>
      >({
        type: 'housing:document-detached',
        name: 'Retrait d’un document du logement',
        next_old: { filename: document.filename },
        next_new: null,
        created_by: user.id
      });
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

      // Link document to housing
      await HousingDocuments().insert({
        document_id: document.id,
        housing_id: housingFromAnotherEstablishment.id,
        housing_geo_code: housingFromAnotherEstablishment.geoCode
      });

      const { status } = await request(url)
        .delete(testRoute(housingFromAnotherEstablishment.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
