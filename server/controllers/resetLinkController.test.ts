import request from 'supertest';
import { createServer } from '../server';
import { constants } from 'http2';
import db from '../repositories/db';
import { resetLinkTable } from '../repositories/resetLinkRepository';
import { User1 } from '../../database/seeds/test/003-users';

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

      const { body, status } = await request(app).post(testRoute).send({
        email,
      });

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        id: expect.any(String),
        expiresAt: expect.any(String),
      });
      const link = await db(resetLinkTable)
        .select()
        .where('id', body.id)
        .first();
      expect(link).toBeDefined();
    });

    it('should return not found if the user does not exist', async () => {
      const email = 'test@test.test';

      const { status } = await request(app).post(testRoute).send({ email });

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
