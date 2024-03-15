import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '../server';
import { SettingsDTO } from '../../shared/models/SettingsDTO';
import { tokenProvider } from '../test/testUtils';
import {
  genEstablishmentApi,
  genSettingsApi,
  genUserApi,
} from '../test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi,
} from '../repositories/establishmentRepository';
import { formatUserApi, Users } from '../repositories/userRepository';
import {
  formatSettingsApi,
  Settings,
} from '../repositories/settingsRepository';
import { EstablishmentApi } from '../models/EstablishmentApi';
import { UserApi } from '../models/UserApi';

describe('Settings API', () => {
  const { app } = createServer();

  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeEach(async () => {
    establishment = genEstablishmentApi();
    user = genUserApi(establishment.id);
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('GET /establishments/{id}/settings', () => {
    const testRoute = (id: string) => `/api/establishments/${id}/settings`;

    it('should retrieve existing settings', async () => {
      const settings = genSettingsApi(establishment.id);
      await Settings().insert(formatSettingsApi(settings));

      const { body, status } = await request(app)
        .get(testRoute(settings.establishmentId))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<SettingsDTO>({
        contactPoints: settings.contactPoints,
        inbox: settings.inbox,
      });
    });
  });

  describe('PUT /establishments/{id}/settings', () => {
    const testRoute = (id: string) => `/api/establishments/${id}/settings`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).put(testRoute('any'));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should create missing settings', async () => {
      const { body, status } = await request(app)
        .put(testRoute('any'))
        .send({
          contactPoints: {
            public: true,
          },
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual<SettingsDTO>({
        contactPoints: {
          public: true,
        },
        inbox: {
          enabled: true,
        },
      });
    });

    it('should update existing settings', async () => {
      const settings = genSettingsApi(establishment.id);
      await Settings().insert(formatSettingsApi(settings));

      const { body, status } = await request(app)
        .put(testRoute('any'))
        .use(tokenProvider(user))
        .send({
          contactPoints: {
            public: !settings.contactPoints.public,
          },
        });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<SettingsDTO>({
        contactPoints: {
          public: !settings.contactPoints.public,
        },
        inbox: {
          enabled: true,
        },
      });
    });
  });
});
