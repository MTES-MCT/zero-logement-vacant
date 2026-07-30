import { constants } from 'http2';

import { subHours } from 'date-fns';
import { Record } from 'effect';
import { snakeToCamel } from 'effect/String';
import type { Insertable } from 'kysely';
import request from 'supertest';
import { vi } from 'vitest';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { SignupLinkApi } from '~/models/SignupLinkApi';
import { UserApi } from '~/models/UserApi';
import { formatProspectApi } from '~/repositories/prospectRepository';
import signupLinkRepository from '~/repositories/signupLinkRepository';
import ceremaService from '~/services/ceremaService';
import { factories } from '~/test/factories';
import {
  genEmail,
  genProspectApi,
  genSignupLinkApi
} from '~/test/testFixtures';

describe('Signup link API', () => {
  let url: string;
  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('POST /signup-links', () => {
    const testRoute = '/signup-links';

    beforeEach(() => {
      vi.spyOn(ceremaService, 'consultUsers').mockResolvedValue([
        {
          email: '',
          establishmentSiren: '*',
          hasAccount: true,
          hasCommitment: true
        }
      ]);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return 400 when body.email is missing', async () => {
      const { status, body } = await request(url)
        .post(testRoute)
        .send({})
        .set('Content-Type', 'application/json');

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
    });

    it('should return 400 when body.email is empty', async () => {
      const { status, body } = await request(url)
        .post(testRoute)
        .send({ email: '' })
        .set('Content-Type', 'application/json');

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
    });

    it('should return 400 when body.email is not a valid email', async () => {
      const { status, body } = await request(url)
        .post(testRoute)
        .send({ email: 'not-an-email' })
        .set('Content-Type', 'application/json');

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/email/i);
    });

    it('should send no email if the account already exists', async () => {
      const { status } = await request(url).post(testRoute).send({
        email: user.email
      });

      // Return a success code to avoid giving information to an attacker
      // that an account already exists with the given email
      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should create a signup link', async () => {
      const email = genEmail();

      const { status } = await request(url).post(testRoute).send({
        email
      });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const actualLink = await kysely
        .selectFrom('signupLinks')
        .where('prospectEmail', '=', email)
        .selectAll()
        .executeTakeFirst();
      expect(actualLink).toBeDefined();
    });
  });

  describe('GET /signup-links/{id}', () => {
    const testRoute = (id: string) => `/signup-links/${id}`;

    it('should get a signup link', async () => {
      const prospect = genProspectApi(establishment);
      await kysely
        .insertInto('prospects')
        .values(
          Record.mapKeys(
            formatProspectApi(prospect) as unknown as Record<string, unknown>,
            snakeToCamel
          ) as Insertable<DB['prospects']>
        )
        .execute();
      const link = genSignupLinkApi(prospect.email);
      await signupLinkRepository.insert(link);

      const { body, status } = await request(url).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({
        ...link,
        expiresAt: link.expiresAt.toISOString()
      });
    });

    it('should return not found if the signup link does not exist', async () => {
      const { status } = await request(url).get(testRoute('not-found'));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be impossible when the signup link is expired', async () => {
      const email = genEmail();
      const link: SignupLinkApi = {
        ...genSignupLinkApi(email),
        expiresAt: subHours(new Date(), 24)
      };
      await signupLinkRepository.insert(link);

      const { status } = await request(url).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });
  });
});
