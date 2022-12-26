import { createServer } from '../server';
import request from 'supertest';
import { constants } from 'http2';
import db from '../repositories/db';
import signupLinkRepository, {
  signupLinkTable,
} from '../repositories/signupLinkRepository';
import { genProspectApi, genSignupLinkApi } from '../test/testFixtures';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import { ProspectApi } from '../models/ProspectApi';
import { Prospect1 } from '../../database/seeds/test/007-prospects';
import prospectRepository from '../repositories/prospectRepository';

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
      const prospect: ProspectApi = {
        ...genProspectApi(),
        establishment: {
          id: Establishment1.id,
          siren: Establishment1.siren,
        },
        hasAccount: true,
        hasCommitment: true,
      };
      await prospectRepository.upsert(prospect);

      const { status } = await request(app).post(testRoute).send({
        email: prospect.email,
      });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const actualLink = await db(signupLinkTable)
        .select()
        .where('prospect_email', prospect.email)
        .first();
      expect(actualLink).toBeDefined();
    });

    it('should return not found if the prospect does not exist', async () => {
      const email = 'test@test.test';

      const { status } = await request(app).post(testRoute).send({ email });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should forbid the activation of an invalid prospect', async () => {
      const prospect: ProspectApi = {
        ...genProspectApi(),
        hasAccount: false,
        hasCommitment: false,
      };
      await prospectRepository.upsert(prospect);

      const { status } = await request(app).post(testRoute).send({
        email: prospect.email,
      });

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
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
  });
});
