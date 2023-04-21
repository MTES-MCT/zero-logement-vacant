import request from 'supertest';
import { createServer } from '../server';
import { constants } from 'http2';
import { Settings1 } from '../../database/seeds/test/009-settings';
import { SettingsDTO } from '../../shared/models/SettingsDTO';
import { withAccessToken } from '../test/testUtils';
import { User2 } from '../../database/seeds/test/003-users';

describe('Settings controller', () => {
  const { app } = createServer();

  describe('Get settings', () => {
    const testRoute = (id: string) => `/api/establishments/${id}/settings`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute('any'));
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should retrieve existing settings', async () => {
      const { body, status } = await withAccessToken(
        request(app).get(testRoute(Settings1.establishmentId))
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<SettingsDTO>({
        contactPoints: Settings1.contactPoints,
      });
    });
  });

  describe('Update settings', () => {
    const testRoute = (id: string) => `/api/establishments/${id}/settings`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).put(testRoute('any'));
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should create missing settings', async () => {
      const { body, status } = await withAccessToken(
        request(app)
          .put(testRoute('any'))
          .send({
            contactPoints: {
              public: true,
            },
          }),
        User2
      );

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual<SettingsDTO>({
        contactPoints: {
          public: true,
        },
      });
    });

    it('should update existing settings', async () => {
      const { body, status } = await withAccessToken(
        request(app).put(testRoute('any'))
      ).send({
        contactPoints: {
          public: !Settings1.contactPoints.public,
        },
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<SettingsDTO>({
        contactPoints: {
          public: !Settings1.contactPoints.public,
        },
      });
    });
  });
});
