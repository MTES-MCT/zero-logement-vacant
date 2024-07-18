import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { constants } from 'http2';
import errorHandler from '../error-handler';
import TestAccountError from '~/errors/testAccountError';
import { genEmail } from '~/test/testFixtures';

describe('Error handler', () => {
  describe('Integration test', () => {
    const expectedErrorRoute = '/fail';
    const unexpectedErrorRoute = '/unexpected-fail';
    const app = express();

    const email = genEmail();
    app.get(
      expectedErrorRoute,
      async (request: Request, response: Response, next: NextFunction) => {
        const error = new TestAccountError(email);
        next(error);
      }
    );
    app.get(
      unexpectedErrorRoute,
      async (request: Request, response: Response, next: NextFunction) => {
        const error = new Error('Unexpected error');
        next(error);
      }
    );
    app.use(errorHandler());

    it('should respond with the status of the error if any', async () => {
      await request(app)
        .get(expectedErrorRoute)
        .expect(constants.HTTP_STATUS_FORBIDDEN)
        .expect({
          name: 'TestAccountError',
          message: `${email} is a test account. It cannot be used.`,
        });
    });

    it('should respond 500 Internal server error otherwise', async () => {
      await request(app)
        .get(unexpectedErrorRoute)
        .expect(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
    });
  });
});
