import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { constants } from "http2";
import errorHandler from "../error-handler";
import UserNotFoundError from "../../errors/user-not-found-error";

describe('Error handler', () => {
  describe('Integration test', () => {
    const expectedErrorRoute = '/fail';
    const unexpectedErrorRoute = '/unexpected-fail';
    const app = express();

    app.get(expectedErrorRoute, async (request: Request, response: Response, next: NextFunction) => {
      const error = new UserNotFoundError();
      next(error);
    });
    app.get(unexpectedErrorRoute, async (request: Request, response: Response, next: NextFunction) => {
      const error = new Error('Unexpected error');
      next(error);
    });
    app.use(errorHandler());

    it('should respond with the status of the error if any', async () => {
      await request(app)
        .get(expectedErrorRoute)
        .expect(constants.HTTP_STATUS_NOT_FOUND)
        .expect({
          name: 'UserNotFoundError',
          message: 'User not found'
        });
    });

    it('should respond 500 Internal server error otherwise', async () => {
      await request(app)
        .get(unexpectedErrorRoute)
        .expect(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR);
    });
  });
});
