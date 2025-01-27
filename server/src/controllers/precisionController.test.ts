import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { tokenProvider } from '~/test/testUtils';
import {
  genEstablishmentApi,
  genPrecisions,
  genUserApi,
} from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  PrecisionDBO,
  Precisions,
} from '~/repositories/precisionRepository';

describe('Precision API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('listPrecisions', () => {
    const testRoute = () => `/api/precisions`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute());

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list the precisions', async () => {
      const precisions = Array.from({ length: 3 }, () =>
        genPrecisions(),
      );
      await Precisions().insert(precisions);

      const { body, status } = await request(app)
        .get(testRoute())
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfyAll<PrecisionDBO>((actual) => {
        return precisions.map((precision) => precision.id).includes(actual.id);
      });
    });
  });
});
