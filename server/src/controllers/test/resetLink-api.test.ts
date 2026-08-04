import { constants } from 'http2';

import { subDays } from 'date-fns';
import request from 'supertest';
import { vi, type MockedFunction } from 'vitest';

import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { ResetLinkApi } from '~/models/ResetLinkApi';
import { UserApi } from '~/models/UserApi';
import resetLinkRepository from '~/repositories/resetLinkRepository';
import mailService from '~/services/mailService';
import { factories } from '~/test/factories';
import { genResetLinkApi } from '~/test/testFixtures';

describe('Reset link API', () => {
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

  describe('POST /reset-links', () => {
    const testRoute = '/reset-links';

    let createLink: MockedFunction<typeof resetLinkRepository.insert>;
    let sendEmail: MockedFunction<typeof mailService.sendPasswordReset>;

    beforeEach(() => {
      createLink = vi.spyOn(resetLinkRepository, 'insert');
      sendEmail = vi.spyOn(mailService, 'sendPasswordReset');
    });

    afterEach(() => {
      createLink.mockClear();
      sendEmail.mockClear();
    });

    it('should return 400 when body.email is missing', async () => {
      const { status, body } = await request(url)
        .post(testRoute)
        .send({})
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

    it('should create a reset link', async () => {
      const email = user.email;

      const { status } = await request(url).post(testRoute).send({
        email
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const link = await kysely
        .selectFrom('resetLinks')
        .where('userId', '=', user.id)
        .selectAll()
        .executeTakeFirst();
      expect(link).toBeDefined();
    });

    it('should return OK if the user is missing without sending an email', async () => {
      const email = 'test@test.test';

      const { status } = await request(url).post(testRoute).send({ email });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(createLink).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('GET /reset-links/{id}', () => {
    const testRoute = (id: string) => `/reset-links/${id}`;

    it('should return 400 when id contains non-alphanumeric characters', async () => {
      const { status, body } = await request(url)
        .get(testRoute('abc!def'))
        .set('Content-Type', 'application/json');

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/id/i);
    });

    it('should be missing', async () => {
      const { status } = await request(url).get(testRoute('unknown'));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be gone if expired', async () => {
      const link: ResetLinkApi = {
        ...genResetLinkApi(user.id),
        expiresAt: subDays(new Date(), 1)
      };
      await resetLinkRepository.insert(link);

      const { status } = await request(url).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it('should be gone if already used', async () => {
      const link: ResetLinkApi = {
        ...genResetLinkApi(user.id),
        usedAt: new Date()
      };
      await resetLinkRepository.insert(link);

      const { status } = await request(url).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it('should return a valid reset link', async () => {
      const link = genResetLinkApi(user.id);
      await resetLinkRepository.insert(link);

      const { body, status } = await request(url).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({ valid: true });
      expect(JSON.stringify(body)).not.toContain(link.id);
      expect(JSON.stringify(body)).not.toContain(user.id);
    });
  });
});
