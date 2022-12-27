import validator from '../validator';
import { v4 as uuidv4 } from 'uuid';
import express, { Request, Response } from 'express';
import { body, header, param, query } from 'express-validator';
import { constants } from 'http2';
import bodyParser from 'body-parser';
import request from 'supertest';

describe('Validator middleware', () => {
  describe('Integration test', () => {
    const testRoute = `/validate/${uuidv4()}`;
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.post(
      '/validate/:id',
      body('name').isString().isLength({ min: 5 }),
      header('Custom-Header').isString().isLowercase().optional(),
      param('id').isUUID(),
      query('establishmentId').isString().optional(),
      validator.validate,
      (request: Request, response: Response) => {
        response.status(201).json(request.body);
      }
    );

    it('should validate body', () => {
      return request(app)
        .post(testRoute)
        .send({ name: '1234' })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should validate header', () => {
      return request(app)
        .post(testRoute)
        .set('Custom-Header', 'SHOULD BE LOWERCASE')
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should validate params', () => {
      return request(app)
        .post('/validate/not-uuid')
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should validate query', () => {
      return request(app)
        .post(testRoute)
        .query({
          establishmentId: '1234',
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should pass and sanitize input', async () => {
      await request(app)
        .post(testRoute)
        .send({
          name: '12345',
          should: 'be removed',
        })
        .expect(constants.HTTP_STATUS_CREATED)
        .expect({ name: '12345' });
    });
  });
});
