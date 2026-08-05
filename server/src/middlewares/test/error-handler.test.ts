import { constants } from 'http2';

import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, vi } from 'vitest';
import { object, string } from 'yup';

const mocks = vi.hoisted(() => ({
  error: vi.fn()
}));

vi.mock('~/infra/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/infra/logger')>();
  return {
    ...actual,
    createLogger: () => ({
      error: mocks.error
    })
  };
});

import ExternalServiceUnavailableError from '~/errors/externalServiceUnavailableError';
import TestAccountError from '~/errors/testAccountError';
import { genEmail } from '~/test/testFixtures';

import errorHandler from '../error-handler';
import validator from '../validator';

describe('Error handler', () => {
  beforeEach(() => {
    mocks.error.mockClear();
  });

  describe('Integration test', () => {
    const expectedErrorRoute = '/fail';
    const retryableErrorRoute = '/retryable-fail';
    const validationErrorRoute = '/validation-fail';
    const unexpectedErrorRoute = '/unexpected-fail';
    const sensitiveValue = 'SensitiveErrorValue123';
    const app = express();

    app.use(express.json());

    const email = genEmail();
    app.get(
      expectedErrorRoute,
      async (request: Request, response: Response, next: NextFunction) => {
        const error = new TestAccountError(email);
        next(error);
      }
    );
    app.get(
      retryableErrorRoute,
      async (request: Request, response: Response, next: NextFunction) => {
        next(
          new ExternalServiceUnavailableError('Metabase', {
            retryAfterSeconds: 1
          })
        );
      }
    );
    app.get(
      unexpectedErrorRoute,
      async (request: Request, response: Response, next: NextFunction) => {
        const error = new Error(sensitiveValue);
        next(error);
      }
    );
    app.post(
      validationErrorRoute,
      validator.validate({
        body: object({
          geoCode: string().length(5).required()
        })
      }),
      (_request: Request, response: Response) => {
        response.sendStatus(constants.HTTP_STATUS_OK);
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
          status: constants.HTTP_STATUS_FORBIDDEN
        });

      expect(mocks.error).toHaveBeenCalledWith(
        expect.objectContaining({ stack: undefined })
      );
    });

    it('should respond 500 Internal server error otherwise', async () => {
      await request(app)
        .get(unexpectedErrorRoute)
        .expect(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR);

      expect(JSON.stringify(mocks.error.mock.calls)).not.toContain(
        sensitiveValue
      );
      expect(mocks.error).toHaveBeenCalledWith(
        expect.objectContaining({
          diagnosticId: expect.stringMatching(/^[a-f0-9]{12}$/),
          stack: expect.stringContaining('error-handler.test.ts')
        })
      );
    });

    it('logs a safe structured validation diagnostic without the rejected value', async () => {
      await request(app)
        .post(validationErrorRoute)
        .send({ geoCode: { secret: sensitiveValue } })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      expect(JSON.stringify(mocks.error.mock.calls)).not.toContain(
        sensitiveValue
      );
      expect(mocks.error).toHaveBeenCalledWith(
        expect.objectContaining({
          errorName: 'ValidationError',
          diagnostic: {
            path: 'body.geoCode',
            type: 'typeError'
          }
        })
      );
    });

    it('returns Retry-After for a retryable upstream error', async () => {
      const response = await request(app)
        .get(retryableErrorRoute)
        .expect(constants.HTTP_STATUS_SERVICE_UNAVAILABLE);

      expect(response.headers['retry-after']).toBe('1');
      expect(response.body).toEqual({
        name: 'ExternalServiceUnavailableError',
        message: 'Metabase is temporarily unavailable.',
        status: constants.HTTP_STATUS_SERVICE_UNAVAILABLE,
        data: { service: 'Metabase' }
      });
    });
  });
});
