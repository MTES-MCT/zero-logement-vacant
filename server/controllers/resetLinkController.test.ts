import request from 'supertest';
import { createServer } from '../server';
import { constants } from 'http2';
import db from '../repositories/db';
import resetLinkRepository, {
  resetLinkTable,
} from '../repositories/resetLinkRepository';
import { User1 } from '../../database/seeds/test/003-users';
import { genResetLinkApi } from '../test/testFixtures';
import { ResetLinkApi } from '../models/ResetLinkApi';
import { subDays } from 'date-fns';

describe('Reset link controller', () => {
  const { app } = createServer();

  describe('create', () => {
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
      const email = User1.email;

      const { status } = await request(app).post(testRoute).send({
        email,
      });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const link = await db(resetLinkTable)
        .select()
        .where('user_id', User1.id)
        .first();
      expect(link).toBeDefined();
    });

    it('should return not found if the user does not exist', async () => {
      const email = 'test@test.test';

      const { status } = await request(app).post(testRoute).send({ email });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('show', () => {
    const testRoute = (id: string) => `/api/reset-links/${id}`;

    const insertLink = resetLinkRepository.insert;

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
        ...genResetLinkApi(User1.id),
        expiresAt: subDays(new Date(), 1),
      };
      await insertLink(link);

      const { status } = await request(app).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it('should be gone if already used', async () => {
      const link: ResetLinkApi = {
        ...genResetLinkApi(User1.id),
        usedAt: new Date(),
      };
      await insertLink(link);

      const { status } = await request(app).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_GONE);
    });

    it('should return a valid reset link', async () => {
      const link = genResetLinkApi(User1.id);
      await insertLink(link);

      const { status } = await request(app).get(testRoute(link.id));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });
  });
});
