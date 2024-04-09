import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '~/server';
import {
  formatSignupLinkApi,
  SignupLinks,
} from '~/repositories/signupLinkRepository';
import {
  genEmail,
  genEstablishmentApi,
  genProspectApi,
  genSignupLinkApi,
  genUserApi,
} from '~/test/testFixtures';
import { SignupLinkApi } from '~/models/SignupLinkApi';
import { subHours } from 'date-fns';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  formatProspectApi,
  Prospects,
} from '~/repositories/prospectRepository';

describe('Signup link API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('POST /signup-links', () => {
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

    it('should send no email if the account already exists', async () => {
      const { status } = await request(app).post(testRoute).send({
        email: user.email,
      });

      // Return a success code to avoid giving information to an attacker
      // that an account already exists with the given email
      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should create a signup link', async () => {
      const email = genEmail();

      const { status } = await request(app).post(testRoute).send({
        email,
      });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const actualLink = await SignupLinks()
        .select()
        .where('prospect_email', email)
        .first();
      expect(actualLink).toBeDefined();
    });
  });

  describe('GET /signup-links/{id}', () => {
    const testRoute = (id: string) => `/api/signup-links/${id}`;

    it('should get a signup link', async () => {
      const prospect = genProspectApi(establishment);
      await Prospects().insert(formatProspectApi(prospect));
      const link = genSignupLinkApi(prospect.email);
      await SignupLinks().insert(formatSignupLinkApi(link));

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
      await SignupLinks().insert(formatSignupLinkApi(link));

      const { status } = await request(app).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });
  });
});
