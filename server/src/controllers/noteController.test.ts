import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { tokenProvider } from '~/test/testUtils';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingNoteApi,
  genUserApi,
  oneOf,
} from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  formatHousingRecordApi,
  Housing,
} from '~/repositories/housingRepository';
import {
  formatHousingNoteApi,
  formatNoteApi,
  HousingNotes,
  Notes,
} from '~/repositories/noteRepository';
import { NoteApi } from '~/models/NoteApi';

describe('Note API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const housing = genHousingApi(oneOf(establishment.geoCodes));

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
    await Housing().insert(formatHousingRecordApi(housing));
  });

  describe('listByHousingId', () => {
    const testRoute = (housingId: string) => `/api/notes/housing/${housingId}`;

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
        genHousingNoteApi(user, housing),
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
});
