import { constants } from 'http2';
import path from 'node:path';

import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingDocumentDTO,
  UserRole,
  type DocumentDTO,
  type DocumentPayload
} from '@zerologementvacant/models';
import { createS3 } from '@zerologementvacant/utils/node';
import type { Selectable } from 'kysely';
import nock from 'nock';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import config from '~/infra/config';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { HousingApi } from '~/models/HousingApi';
import { UserApi } from '~/models/UserApi';
import { toDocumentInsert } from '~/repositories/documentRepository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import { factories } from '~/test/factories';
import { genDocumentApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Document API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let anotherEstablishment: EstablishmentApi;
  let user: UserApi;
  let anotherUser: UserApi;
  let visitor: UserApi;
  let userFromAnotherEstablishment: UserApi;

  beforeAll(async () => {
    [establishment, anotherEstablishment] = await Promise.all([
      factories.establishment.create(),
      factories.establishment.create()
    ]);
    [user, anotherUser, visitor, userFromAnotherEstablishment] =
      await Promise.all([
        factories.user.create({
          establishmentId: establishment.id,
          role: UserRole.USUAL
        }),
        factories.user.create({
          establishmentId: establishment.id,
          role: UserRole.USUAL
        }),
        factories.user.create({
          establishmentId: establishment.id,
          role: UserRole.VISITOR
        }),
        factories.user.create({ establishmentId: anotherEstablishment.id })
      ]);
  });

  describe('POST /documents', () => {
    let url: string;

    beforeAll(async () => {
      url = await createServer().testing();
    });

    let establishment: EstablishmentApi;
    let user: UserApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
    });

    const samplePdfPath = path.join(__dirname, '../../test/sample.pdf');

    it('should upload a single document successfully', async () => {
      const { body, status } = await request(url)
        .post('/documents')
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
        .post('/documents')
        .use(tokenProvider(user))
        .attach('files', samplePdfPath)
        .attach('files', samplePdfPath);

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const documents = body as ReadonlyArray<DocumentDTO>;
      const events = await kysely
        .selectFrom('events')
        .innerJoin('documentEvents', 'documentEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'document:created')
        .where(
          'documentEvents.documentId',
          'in',
          documents.map((document) => document.id)
        )
        .execute();
      expect(events).toHaveLength(2);
    });

    it('should upload multiple documents successfully', async () => {
      const { body, status } = await request(url)
        .post('/documents')
        .use(tokenProvider(user))
        .attach('files', samplePdfPath)
        .attach('files', samplePdfPath);

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toHaveLength(2);
    });

    it('should return 207 for partial success', async () => {
      const { body, status } = await request(url)
        .post('/documents')
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
        .post('/documents')
        .use(tokenProvider(user))
        .attach('files', Buffer.from('bad'), 'bad.exe');

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return 400 if no files provided', async () => {
      const { status } = await request(url)
        .post('/documents')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });
  });

  describe('GET /documents/:id', () => {
    const testRoute = (id: DocumentDTO['id']) => `/documents/${id}`;

    it('should return 404 if document not found', async () => {
      const { status } = await request(url)
        .get(testRoute(faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should only allow viewing a document in user establishment', async () => {
      const document = genDocumentApi({
        createdBy: userFromAnotherEstablishment.id,
        creator: userFromAnotherEstablishment,
        establishmentId: anotherEstablishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status } = await request(url)
        .get(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return the document with a pre-signed URL', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status, body } = await request(url)
        .get(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<DocumentDTO>>({
        id: document.id,
        filename: document.filename,
        url: expect.stringContaining('http')
      });
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute(faker.string.uuid()));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });
  });

  describe('PUT /documents/:id', () => {
    const testRoute = (id: string) => `/documents/${id}`;

    it('should update document filename', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
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
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      const payload: DocumentPayload = {
        filename: 'renamed.pdf'
      };

      const { status } = await request(url)
        .put(testRoute(document.id))
        .use(tokenProvider(user))
        .send(payload);

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await kysely
        .selectFrom('events')
        .innerJoin('documentEvents', 'documentEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'document:updated')
        .where('documentEvents.documentId', '=', document.id)
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'document:updated',
        nextOld: { filename: document.filename },
        nextNew: { filename: payload.filename },
        createdBy: user.id
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
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
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
    const testRoute = (id: string) => `/documents/${id}`;

    it('should soft-delete document', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const deletedDocument = await kysely
        .selectFrom('documents')
        .select('deletedAt')
        .where('id', '=', document.id)
        .executeTakeFirst();
      expect(deletedDocument).toBeDefined();
      expect(deletedDocument?.deletedAt).not.toBeNull();
    });

    it('should remove the actual file from S3', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
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
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const event = await kysely
        .selectFrom('events')
        .innerJoin('documentEvents', 'documentEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'document:removed')
        .where('documentEvents.documentId', '=', document.id)
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'document:removed',
        nextOld: { filename: document.filename },
        nextNew: null,
        createdBy: user.id
      });
    });

    it('should create an event "housing:document-removed" for each housing to which the document was attached', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      const housings = await factories.housing.createList(3);
      await kysely
        .insertInto('documentsHousings')
        .values(
          housings.map((housing) => ({
            documentId: document.id,
            housingGeoCode: housing.geoCode,
            housingId: housing.id
          }))
        )
        .execute();

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'housingDocumentEvents',
          'housingDocumentEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'housing:document-removed')
        .where('housingDocumentEvents.documentId', '=', document.id)
        .execute();
      events.forEach((event) => {
        expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
          type: 'housing:document-removed',
          nextOld: { filename: document.filename },
          nextNew: null,
          createdBy: user.id
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
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status } = await request(url)
        .delete(testRoute(document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('GET /housing/:id/documents', () => {
    const testRoute = (housingId: string) => `/housing/${housingId}/documents`;

    let housing: HousingApi;
    let anotherHousing: HousingApi;

    beforeAll(async () => {
      [housing, anotherHousing] = await Promise.all([
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(establishment.geoCodes)
        }),
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(anotherEstablishment.geoCodes)
        })
      ]);

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
      await kysely
        .insertInto('documents')
        .values(documents.map(toDocumentInsert))
        .execute();

      // Link documents to housings
      await kysely
        .insertInto('documentsHousings')
        .values([
          {
            documentId: documents[0].id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          },
          {
            documentId: documents[1].id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          },
          {
            documentId: documents[2].id,
            housingId: anotherHousing.id,
            housingGeoCode: anotherHousing.geoCode
          }
        ])
        .execute();
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
      `/housing/${housingId}/documents/${documentId}`;

    it('should remove association only (keep document)', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values({
          documentId: document.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const { status } = await request(url)
        .delete(testRoute(housing.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      // Verify association removed
      const links = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where('documentId', '=', document.id)
        .where('housingId', '=', housing.id)
        .execute();
      expect(links).toHaveLength(0);

      // Verify document still exists
      const doc = await kysely
        .selectFrom('documents')
        .select('deletedAt')
        .where('id', '=', document.id)
        .executeTakeFirst();
      expect(doc).toBeDefined();
      expect(doc?.deletedAt).toBeNull();
    });

    it('should create an event "housing:document-detached"', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsHousings')
        .values({
          documentId: document.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const { status } = await request(url)
        .delete(testRoute(housing.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const event = await kysely
        .selectFrom('events')
        .innerJoin(
          'housingDocumentEvents',
          'housingDocumentEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'housing:document-detached')
        .where('housingDocumentEvents.documentId', '=', document.id)
        .where('housingDocumentEvents.housingId', '=', housing.id)
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'housing:document-detached',
        nextOld: { filename: document.filename },
        nextNew: null,
        createdBy: user.id
      });
    });

    it('should return 404 if association not found', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });

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
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status } = await request(url)
        .delete(testRoute(faker.string.uuid(), document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 404 if housing belongs to another establishment', async () => {
      const housingFromAnotherEstablishment = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(anotherEstablishment.geoCodes)
      });

      const document = genDocumentApi({
        createdBy: userFromAnotherEstablishment.id,
        creator: userFromAnotherEstablishment,
        establishmentId: anotherEstablishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      // Link document to housing
      await kysely
        .insertInto('documentsHousings')
        .values({
          documentId: document.id,
          housingId: housingFromAnotherEstablishment.id,
          housingGeoCode: housingFromAnotherEstablishment.geoCode
        })
        .execute();

      const { status } = await request(url)
        .delete(testRoute(housingFromAnotherEstablishment.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('POST /housing/:id/documents', () => {
    const testRoute = (id: string) => `/housing/${id}/documents`;

    it('should not duplicate the "housing:document-attached" event when the same document is linked twice', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      await request(url)
        .post(testRoute(housing.id))
        .use(tokenProvider(user))
        .send({ documentIds: [document.id] });
      const { status } = await request(url)
        .post(testRoute(housing.id))
        .use(tokenProvider(user))
        .send({ documentIds: [document.id] });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const links = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where('documentId', '=', document.id)
        .where('housingId', '=', housing.id)
        .execute();
      expect(links).toHaveLength(1);
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'housingDocumentEvents',
          'housingDocumentEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'housing:document-attached')
        .where('housingDocumentEvents.documentId', '=', document.id)
        .where('housingDocumentEvents.housingId', '=', housing.id)
        .execute();
      expect(events).toHaveLength(1);
    });
  });

  describe('POST /campaigns/:id/documents', () => {
    const testRoute = (id: string) => `/campaigns/${id}/documents`;

    it('should link documents to campaign', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status, body } = await request(url)
        .post(testRoute(campaign.id))
        .use(tokenProvider(user))
        .send({ documentIds: [document.id] });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ id: document.id });
    });

    it('should link documents to campaign when documentIds contains duplicates', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status, body } = await request(url)
        .post(testRoute(campaign.id))
        .use(tokenProvider(user))
        .send({ documentIds: [document.id, document.id] });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ id: document.id });
    });

    it('should create an event "campaign:document-attached"', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status } = await request(url)
        .post(testRoute(campaign.id))
        .use(tokenProvider(user))
        .send({ documentIds: [document.id] });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const event = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignDocumentEvents',
          'campaignDocumentEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'campaign:document-attached')
        .where('campaignDocumentEvents.documentId', '=', document.id)
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'campaign:document-attached',
        nextOld: null,
        nextNew: { filename: document.filename },
        createdBy: user.id
      });
    });

    it('should not duplicate the "campaign:document-attached" event when the same document is linked twice', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      await request(url)
        .post(testRoute(campaign.id))
        .use(tokenProvider(user))
        .send({ documentIds: [document.id] });
      const { status } = await request(url)
        .post(testRoute(campaign.id))
        .use(tokenProvider(user))
        .send({ documentIds: [document.id] });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const links = await kysely
        .selectFrom('documentsCampaigns')
        .selectAll('documentsCampaigns')
        .where('documentId', '=', document.id)
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(links).toHaveLength(1);
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignDocumentEvents',
          'campaignDocumentEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'campaign:document-attached')
        .where('campaignDocumentEvents.documentId', '=', document.id)
        .execute();
      expect(events).toHaveLength(1);
    });

    it('should return 404 if campaign not found', async () => {
      const { status } = await request(url)
        .post(testRoute(faker.string.uuid()))
        .use(tokenProvider(user))
        .send({ documentIds: [faker.string.uuid()] });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 404 if campaign belongs to another establishment', async () => {
      const campaign = await factories
        .campaign(anotherEstablishment)
        .create(
          {},
          { associations: { createdBy: userFromAnotherEstablishment } }
        );
      const document = genDocumentApi({
        createdBy: userFromAnotherEstablishment.id,
        creator: userFromAnotherEstablishment,
        establishmentId: anotherEstablishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status } = await request(url)
        .post(testRoute(campaign.id))
        .use(tokenProvider(user))
        .send({ documentIds: [document.id] });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 403 for a visitor', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status } = await request(url)
        .post(testRoute(campaign.id))
        .use(tokenProvider(visitor))
        .send({ documentIds: [document.id] });

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });
  });

  describe('GET /campaigns/:id/documents', () => {
    const testRoute = (id: string) => `/campaigns/${id}/documents`;

    it('should return 200 OK with documents list', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsCampaigns')
        .values({
          documentId: document.id,
          campaignId: campaign.id
        })
        .execute();

      const { status, body } = await request(url)
        .get(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(1);
      expect(body[0]).toMatchObject({
        id: document.id,
        url: expect.stringContaining('http')
      });
    });

    it('should return 404 if campaign belongs to another establishment', async () => {
      const campaign = await factories
        .campaign(anotherEstablishment)
        .create(
          {},
          { associations: { createdBy: userFromAnotherEstablishment } }
        );

      const { status } = await request(url)
        .get(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('DELETE /campaigns/:id/documents/:documentId', () => {
    const testRoute = (id: string, documentId: string) =>
      `/campaigns/${id}/documents/${documentId}`;

    it('should remove association only (keep document)', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsCampaigns')
        .values({
          documentId: document.id,
          campaignId: campaign.id
        })
        .execute();

      const { status } = await request(url)
        .delete(testRoute(campaign.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const links = await kysely
        .selectFrom('documentsCampaigns')
        .selectAll('documentsCampaigns')
        .where('documentId', '=', document.id)
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(links).toHaveLength(0);

      const doc = await kysely
        .selectFrom('documents')
        .select('deletedAt')
        .where('id', '=', document.id)
        .executeTakeFirst();
      expect(doc).toBeDefined();
      expect(doc?.deletedAt).toBeNull();
    });

    it('should create an event "campaign:document-detached"', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsCampaigns')
        .values({
          documentId: document.id,
          campaignId: campaign.id
        })
        .execute();

      const { status } = await request(url)
        .delete(testRoute(campaign.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const event = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignDocumentEvents',
          'campaignDocumentEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'campaign:document-detached')
        .where('campaignDocumentEvents.documentId', '=', document.id)
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'campaign:document-detached',
        nextOld: { filename: document.filename },
        nextNew: null,
        createdBy: user.id
      });
    });

    it('should return 404 if association not found', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      const { status } = await request(url)
        .delete(testRoute(campaign.id, faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 404 if campaign belongs to another establishment', async () => {
      const campaign = await factories
        .campaign(anotherEstablishment)
        .create(
          {},
          { associations: { createdBy: userFromAnotherEstablishment } }
        );
      const document = genDocumentApi({
        createdBy: userFromAnotherEstablishment.id,
        creator: userFromAnotherEstablishment,
        establishmentId: anotherEstablishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsCampaigns')
        .values({
          documentId: document.id,
          campaignId: campaign.id
        })
        .execute();

      const { status } = await request(url)
        .delete(testRoute(campaign.id, document.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('DELETE /campaigns/:id (campaign document event cleanup)', () => {
    it('should not leave orphaned events after the campaign is deleted', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      await request(url)
        .post(`/campaigns/${campaign.id}/documents`)
        .use(tokenProvider(user))
        .send({ documentIds: [document.id] });

      const attachedEvents = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignDocumentEvents',
          'campaignDocumentEvents.eventId',
          'events.id'
        )
        .select('events.id')
        .where('campaignDocumentEvents.campaignId', '=', campaign.id)
        .execute();
      expect(attachedEvents.length).toBeGreaterThan(0);
      const eventIds = attachedEvents.map((event) => event.id);

      const { status } = await request(url)
        .delete(`/campaigns/${campaign.id}`)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const orphanedEvents = await kysely
        .selectFrom('events')
        .selectAll('events')
        .where('id', 'in', eventIds)
        .execute();
      expect(orphanedEvents).toHaveLength(0);
    });
  });

  describe('Campaign document endpoints respect the geographic perimeter', () => {
    let restrictedEstablishment: EstablishmentApi;
    let restrictedUser: UserApi;

    beforeAll(async () => {
      restrictedEstablishment = await factories.establishment.create({
        geoCodes: ['75056', '13055']
      });
      restrictedUser = await factories.user.create({
        establishmentId: restrictedEstablishment.id,
        role: UserRole.USUAL
      });
      await userPerimeterRepository.upsert({
        userId: restrictedUser.id,
        establishmentId: restrictedEstablishment.id,
        // Restrict the user to 75056 only: 13055 is outside their perimeter
        geoCodes: ['75056'],
        departments: [],
        regions: [],
        epci: [],
        frEntiere: false,
        updatedAt: new Date().toJSON()
      });
      // isCommuneInPerimeter falls back to GeoAPI to resolve 13055's region
      nock('https://geo.api.gouv.fr')
        .persist()
        .get('/departements/13')
        .query({ fields: 'codeRegion' })
        .reply(200, { code: '13', nom: 'Bouches-du-Rhône', codeRegion: '93' });
    });

    afterAll(() => {
      nock.cleanAll();
    });

    async function createCampaignOutsidePerimeter() {
      const campaign = await factories
        .campaign(restrictedEstablishment)
        .create({}, { associations: { createdBy: restrictedUser } });
      const housing = await factories.housing.create({ geoCode: '13055' });
      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();
      return campaign;
    }

    it('should return 404 when linking documents to a campaign with housing outside the perimeter', async () => {
      const campaign = await createCampaignOutsidePerimeter();
      const document = genDocumentApi({
        createdBy: restrictedUser.id,
        creator: restrictedUser,
        establishmentId: restrictedEstablishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status } = await request(url)
        .post(`/campaigns/${campaign.id}/documents`)
        .use(tokenProvider(restrictedUser))
        .send({ documentIds: [document.id] });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 404 when listing documents of a campaign with housing outside the perimeter', async () => {
      const campaign = await createCampaignOutsidePerimeter();

      const { status } = await request(url)
        .get(`/campaigns/${campaign.id}/documents`)
        .use(tokenProvider(restrictedUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return 404 when removing a document from a campaign with housing outside the perimeter', async () => {
      const campaign = await createCampaignOutsidePerimeter();
      const document = genDocumentApi({
        createdBy: restrictedUser.id,
        creator: restrictedUser,
        establishmentId: restrictedEstablishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      await kysely
        .insertInto('documentsCampaigns')
        .values({
          documentId: document.id,
          campaignId: campaign.id
        })
        .execute();

      const { status } = await request(url)
        .delete(`/campaigns/${campaign.id}/documents/${document.id}`)
        .use(tokenProvider(restrictedUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('DELETE /documents/:id (campaign cascade)', () => {
    it('should create an event "campaign:document-removed" for each campaign the document was attached to', async () => {
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .insertInto('documentsCampaigns')
        .values({
          documentId: document.id,
          campaignId: campaign.id
        })
        .execute();

      const { status } = await request(url)
        .delete(`/documents/${document.id}`)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const event = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignDocumentEvents',
          'campaignDocumentEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'campaign:document-removed')
        .where('campaignDocumentEvents.documentId', '=', document.id)
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'campaign:document-removed',
        nextOld: { filename: document.filename },
        nextNew: null,
        createdBy: user.id
      });
    });
  });
});
