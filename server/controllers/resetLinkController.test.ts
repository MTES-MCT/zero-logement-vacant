import { subDays } from 'date-fns';
import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '../server';
import resetLinkRepository, {
  formatResetLinkApi,
  ResetLinks,
} from '../repositories/resetLinkRepository';
import {
  genEstablishmentApi,
  genResetLinkApi,
  genUserApi,
} from '../test/testFixtures';
import { ResetLinkApi } from '../models/ResetLinkApi';
import mailService from '../services/mailService';
import {
  Establishments,
  formatEstablishmentApi,
} from '../repositories/establishmentRepository';
import { formatUserApi, Users } from '../repositories/userRepository';

describe('Reset link API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('POST /reset-links', () => {
    const testRoute = '/api/reset-links';

    it('should validate the email', async () => {
      // Without email
      await request(app)
        .post(testRoute)
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      // With empty value
      await request(app)
        .post(testRoute)
        .send({
          email: '',
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      // With wrong format
      await request(app)
        .post(testRoute)
        .send({ email: 'wrong-format' })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should create a reset link', async () => {
      const email = user.email;

      const { status } = await request(app).post(testRoute).send({
        email,
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const link = await ResetLinks()
        .select()
        .where('user_id', user.id)
        .first();
      expect(link).toBeDefined();
    });

    it('should return OK if the user is missing without sending an email', async () => {
      const createLink = jest.spyOn(resetLinkRepository, 'insert');
      const sendEmail = jest.spyOn(mailService, 'sendPasswordReset');
      const email = 'test@test.test';

      const { status } = await request(app).post(testRoute).send({ email });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(createLink).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('GET /reset-links/{id}', () => {
    const testRoute = (id: string) => `/api/reset-links/${id}`;

    it('should validate the id', async () => {
      const { status } = await request(app).get(testRoute('@$'));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be missing', async () => {
      const { status } = await request(app).get(testRoute('unknown'));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be gone if expired', async () => {
      const link: ResetLinkApi = {
        ...genResetLinkApi(user.id),
        expiresAt: subDays(new Date(), 1),
      };
      await ResetLinks().insert(formatResetLinkApi(link));

      const { status } = await request(app).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it('should be gone if already used', async () => {
      const link: ResetLinkApi = {
        ...genResetLinkApi(user.id),
        usedAt: new Date(),
      };
      await ResetLinks().insert(formatResetLinkApi(link));

      const { status } = await request(app).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it('should return a valid reset link', async () => {
      const link = genResetLinkApi(user.id);
      await ResetLinks().insert(formatResetLinkApi(link));

      const { status } = await request(app).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });
  });
});
