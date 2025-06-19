import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/jest';

import { NoteDTO, NotePayloadDTO, UserRole } from '@zerologementvacant/models';
import { constants } from 'http2';
import request from 'supertest';
import { createServer } from '~/infra/server';
import { NoteApi } from '~/models/NoteApi';
import { UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  formatHousingNoteApi,
  formatNoteApi,
  HousingNotes,
  NoteRecordDBO,
  Notes
} from '~/repositories/noteRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingNoteApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Note API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const visitor: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.VISITOR
  };
  const admin: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.ADMIN
  };
  const housing = genHousingApi(oneOf(establishment.geoCodes));

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert([user, visitor, admin].map(formatUserApi));
    await Housing().insert(formatHousingRecordApi(housing));
  });

  describe('listByHousingId', () => {
    const testRoute = (housingId: string) => `/api/housing/${housingId}/notes`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid housingId', async () => {
      const { status } = await request(app)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list the housing notes', async () => {
      const notes = Array.from({ length: 3 }, () =>
        genHousingNoteApi(user, housing)
      );
      await Notes().insert(notes.map(formatNoteApi));
      await HousingNotes().insert(notes.map(formatHousingNoteApi));

      const { body, status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfyAll<NoteApi>((actual) => {
        return notes.map((note) => note.id).includes(actual.id);
      });
    });
  });

  describe('createByHousing', () => {
    const testRoute = (id: string) => `/api/housing/${id}/notes`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a visitor', async () => {
      const { status } = await request(app)
        .post(testRoute(housing.id))
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    test.prop<NotePayloadDTO>({
      content: fc.string({ minLength: 1 })
    })('should validate inputs', async (payload) => {
      const { status } = await request(app)
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

      const { status } = await request(app)
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

      const { body, status } = await request(app)
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
      const actualNote = await Notes().where({ id: body.id }).first();
      expect(actualNote).toBeDefined();
      const actualHousingNote = await HousingNotes()
        .where({
          note_id: body.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        })
        .first();
      expect(actualHousingNote).toBeDefined();
    });
  });

  describe('update', () => {
    const testRoute = (noteId: string) => `/api/notes/${noteId}`;

    const note = genHousingNoteApi(user, housing);

    beforeAll(async () => {
      await Notes().insert(formatNoteApi(note));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).put(testRoute(note.id)).send({
        content: 'Updated content'
      });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a visitor', async () => {
      const { status } = await request(app)
        .put(testRoute(note.id))
        .send({ content: 'Updated content' })
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for another user than the creator', async () => {
      const anotherUser = genUserApi(establishment.id);
      await Users().insert(formatUserApi(anotherUser));

      const { status } = await request(app)
        .put(testRoute(note.id))
        .send({ content: 'Updated content' })
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should be allowed for the creator of the note', async () => {
      const { status } = await request(app)
        .put(testRoute(note.id))
        .send({ content: 'Updated content' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should be allowed for an admin', async () => {
      const { status } = await request(app)
        .put(testRoute(note.id))
        .send({ content: 'Updated content' })
        .use(tokenProvider(admin));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should throw an error if the note is missing', async () => {
      const payload: NotePayloadDTO = {
        content: 'Non-existing note'
      };

      const { status } = await request(app)
        .put(testRoute(faker.string.uuid()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should update the note', async () => {
      const payload: NotePayloadDTO = {
        content: 'Nouveau contenu'
      };

      const { status, body } = await request(app)
        .put(testRoute(note.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<NoteDTO>>({
        id: note.id,
        content: payload.content,
        updatedAt: expect.any(String)
      });
      const actual = await Notes().where({ id: note.id }).first();
      expect(actual).toMatchObject<Partial<NoteRecordDBO>>({
        id: note.id,
        content: payload.content,
        updated_at: expect.any(Date)
      });
    });
  });
});
