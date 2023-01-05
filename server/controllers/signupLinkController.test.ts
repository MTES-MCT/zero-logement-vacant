import { createServer } from '../server';
import request from 'supertest';
import { constants } from 'http2';
import db from '../repositories/db';
import signupLinkRepository, {
  signupLinkTable,
} from '../repositories/signupLinkRepository';
import { genEmail, genSignupLinkApi } from '../test/testFixtures';
import { Prospect1 } from '../../database/seeds/test/007-prospects';
import { SignupLinkApi } from '../models/SignupLinkApi';
import { subHours } from 'date-fns';

describe('Signup link controller', () => {
  const { app } = createServer();

  describe('create', () => {
    const testRoute = '/api/signup-links';

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

    it('should create a signup link', async () => {
      const email = genEmail();

      const { status } = await request(app).post(testRoute).send({
        email,
      });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const actualLink = await db(signupLinkTable)
        .select()
        .where('prospect_email', email)
        .first();
      expect(actualLink).toBeDefined();
    });
  });

  describe('show', () => {
    const testRoute = (id: string) => `/api/signup-links/${id}`;

    it('should get a signup link', async () => {
      const link = genSignupLinkApi(Prospect1.email);
      await db(signupLinkTable).insert(
        signupLinkRepository.formatSignupLinkApi(link)
      );

      const { body, status } = await request(app).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({
        ...link,
        expiresAt: link.expiresAt.toISOString(),
      });
    });

    it('should return not found if the signup link does not exist', async () => {
      const { status } = await request(app).get(testRoute('not-found'));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be impossible when the signup link is expired', async () => {
      const email = genEmail();
      const link: SignupLinkApi = {
        ...genSignupLinkApi(email),
        expiresAt: subHours(new Date(), 24),
      };
      await signupLinkRepository.insert(link);

      const { status } = await request(app).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });
  });
});
