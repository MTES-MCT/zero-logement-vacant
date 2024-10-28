import express, { Request, Response } from 'express';
import { constants } from 'http2';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { object, string } from 'yup';

import validatorNext from '~/middlewares/validator-next';
import errorHandler from '~/middlewares/error-handler';

describe('ValidatorNext middleware', () => {
  describe('Integration test', () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.post(
      '/validate/:id',
      validatorNext.validate({
        body: object({
          geoCode: string().length(5).required()
        })
      }),
      (request: Request, response: Response) => {
        response.status(constants.HTTP_STATUS_OK).json(request.body);
      }
    );
    app.use(errorHandler());

    const testRoute = `/validate/${uuidv4()}`;

    it('should validate the request body', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send({ geoCode: '12345' })
        .set('Content-Type', 'application/json');

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({
        geoCode: '12345'
      });
    });

    it('should validate wrong input', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send({
          geoCode: '1'
        })
        .set('Content-Type', 'application/json');

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({
        name: 'ValidationError'
      });
    });
  });
});
