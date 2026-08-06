import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import { NoteDTO, NotePayloadDTO, UserRole } from '@zerologementvacant/models';
import type { Selectable } from 'kysely';
import request from 'supertest';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingNoteApi, NoteApi } from '~/models/NoteApi';
import { UserApi } from '~/models/UserApi';
import { toHousingNoteDBO, toNoteDBO } from '~/repositories/noteRepository';
import { factories } from '~/test/factories';
import { genHousingNoteApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Note API', () => {
  let url: string;
  let establishment: EstablishmentApi;
  let user: UserApi;
  let visitor: UserApi;
  let admin: UserApi;
  let housing: HousingApi;

  beforeAll(async () => {
    url = await createServer().testing();
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
    visitor = await factories.user.create({
      establishmentId: establishment.id,
      role: UserRole.VISITOR
    });
    admin = await factories.user.create({
      establishmentId: establishment.id,
      role: UserRole.ADMIN
    });
    housing = await factories.housing.create({
      geoCode: faker.helpers.arrayElement(establishment.geoCodes)
    });
  });

  describe('GET /housing/:id/notes', () => {
    const testRoute = (housingId: string) => `/housing/${housingId}/notes`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid housingId', async () => {
      const { status } = await request(url)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list the housing notes', async () => {
      const notes = Array.from({ length: 3 }, () =>
        genHousingNoteApi(user, housing)
      );
      await kysely.insertInto('notes').values(notes.map(toNoteDBO)).execute();
      await kysely
        .insertInto('housingNotes')
        .values(notes.map(toHousingNoteDBO))
        .execute();

      const { body, status } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfyAll<NoteApi>((actual) => {
        return notes.map((note) => note.id).includes(actual.id);
      });
    });
  });

  describe('POST /housing/:id/notes', () => {
    const testRoute = (id: string) => `/housing/${id}/notes`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).post(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a visitor', async () => {
      const { status } = await request(url)
        .post(testRoute(housing.id))
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    test.prop<NotePayloadDTO>({
      content: fc.string({ minLength: 1 })
    })('should validate inputs', async (payload) => {
      const { status } = await request(url)
        .post(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should fail if the housing was not found', async () => {
      const payload: NotePayloadDTO = {
        content: 'Nouvelle note'
      };

      const { status } = await request(url)
        .post(testRoute(faker.string.uuid()))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create the note', async () => {
      const payload: NotePayloadDTO = {
        content: 'This is a test note'
      };

      const { body, status } = await request(url)
        .post(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<Partial<NoteDTO>>({
        id: expect.any(String),
        content: payload.content,
        noteKind: 'Note courante',
        createdBy: user.id,
        createdAt: expect.any(String),
        updatedAt: null
      });
      const actualNote = await kysely
        .selectFrom('notes')
        .selectAll('notes')
        .where('id', '=', body.id)
        .executeTakeFirst();
      expect(actualNote).toBeDefined();
      const actualHousingNote = await kysely
        .selectFrom('housingNotes')
        .selectAll('housingNotes')
        .where('noteId', '=', body.id)
        .where('housingId', '=', housing.id)
        .where('housingGeoCode', '=', housing.geoCode)
        .executeTakeFirst();
      expect(actualHousingNote).toBeDefined();
    });
  });

  describe('PUT /notes/:id', () => {
    const testRoute = (noteId: string) => `/notes/${noteId}`;

    let note: HousingNoteApi;

    beforeAll(async () => {
      note = genHousingNoteApi(user, housing);
      await kysely.insertInto('notes').values(toNoteDBO(note)).execute();
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).put(testRoute(note.id)).send({
        content: 'Updated content'
      });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a visitor', async () => {
      const { status } = await request(url)
        .put(testRoute(note.id))
        .send({ content: 'Updated content' })
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should be forbidden for another user than the creator', async () => {
      const anotherUser = await factories.user.create({
        establishmentId: establishment.id
      });

      const { status } = await request(url)
        .put(testRoute(note.id))
        .send({ content: 'Updated content' })
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should be allowed for the creator of the note', async () => {
      const { status } = await request(url)
        .put(testRoute(note.id))
        .send({ content: 'Updated content' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should be allowed for an admin', async () => {
      const { status } = await request(url)
        .put(testRoute(note.id))
        .send({ content: 'Updated content' })
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should throw an error if the note is missing', async () => {
      const payload: NotePayloadDTO = {
        content: 'Non-existing note'
      };

      const { status } = await request(url)
        .put(testRoute(faker.string.uuid()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should update the note', async () => {
      const payload: NotePayloadDTO = {
        content: 'Nouveau contenu'
      };

      const { status, body } = await request(url)
        .put(testRoute(note.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<NoteDTO>>({
        id: note.id,
        content: payload.content,
        updatedAt: expect.any(String)
      });
      const actual = await kysely
        .selectFrom('notes')
        .selectAll('notes')
        .where('id', '=', note.id)
        .executeTakeFirst();
      expect(actual).toMatchObject<Partial<Selectable<DB['notes']>>>({
        id: note.id,
        content: payload.content,
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('DELETE /notes/:id', () => {
    const testRoute = (id: string) => `/notes/${id}`;

    let note: HousingNoteApi;

    beforeEach(async () => {
      note = genHousingNoteApi(user, housing);
      await kysely.insertInto('notes').values(toNoteDBO(note)).execute();
      await kysely
        .insertInto('housingNotes')
        .values(toHousingNoteDBO(note))
        .execute();
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).delete(testRoute(note.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a visitor', async () => {
      const { status } = await request(url)
        .delete(testRoute(note.id))
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should be forbidden for another user than the creator', async () => {
      const anotherUser = await factories.user.create({
        establishmentId: establishment.id
      });

      const { status } = await request(url)
        .delete(testRoute(note.id))
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should be allowed for the creator of the note', async () => {
      const { status } = await request(url)
        .delete(testRoute(note.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });

    it('should be allowed for an admin', async () => {
      const { status } = await request(url)
        .delete(testRoute(note.id))
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });

    it('should throw an error if the note is missing', async () => {
      const { status } = await request(url)
        .delete(testRoute(faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should soft-delete the note', async () => {
      const { status } = await request(url)
        .delete(testRoute(note.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const actualNote = await kysely
        .selectFrom('notes')
        .selectAll('notes')
        .where('id', '=', note.id)
        .executeTakeFirst();
      expect(actualNote).toMatchObject<Partial<Selectable<DB['notes']>>>({
        id: note.id,
        deletedAt: expect.any(Date)
      });
      const actualHousingNote = await kysely
        .selectFrom('housingNotes')
        .selectAll('housingNotes')
        .where('noteId', '=', note.id)
        .where('housingId', '=', housing.id)
        .where('housingGeoCode', '=', housing.geoCode)
        .executeTakeFirst();
      expect(actualHousingNote).toBeDefined();
    });
  });
});
