import { UserRole } from '@zerologementvacant/models';
import express, { NextFunction, Request, Response } from 'express';
import { constants } from 'http2';
import request from 'supertest';
import { hasRole } from '~/middlewares/auth';
import { UserApi } from '~/models/UserApi';

import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

describe('Auth', () => {
  describe('hasRoles', () => {
    const establishment = genEstablishmentApi();

    function createUser(role: UserRole): UserApi {
      return { ...genUserApi(establishment.id), role };
    }

    function setUser(user: UserApi) {
      return (request: Request, _: Response, next: NextFunction) => {
        // @ts-expect-error: adding user to request object
        request.user = user;
        next();
      };
    }

    const visitor = createUser(UserRole.VISITOR);
    const admin = createUser(UserRole.ADMIN);
    const user = createUser(UserRole.USUAL);

    it('should succeed if the user has the given role', async () => {
      const app = express();
      app.get('/', setUser(admin), hasRole([UserRole.ADMIN]), (_, response) => {
        response.status(constants.HTTP_STATUS_OK).send();
      });

      const { status } = await request(app).get('/');

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should succeed if the user has one of the given roles', async () => {
      const app = express();
      app.get(
        '/',
        setUser(user),
        hasRole([UserRole.ADMIN, UserRole.USUAL]),
        (_, response) => {
          response.status(constants.HTTP_STATUS_OK).send();
        }
      );

      const { status } = await request(app).get('/');

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should fail if the user has none of the given roles', async () => {
      const app = express();
      app.get(
        '/',
        setUser(visitor),
        hasRole([UserRole.ADMIN, UserRole.USUAL]),
        (_, response) => {
          response.status(constants.HTTP_STATUS_OK).send();
        }
      );

      const { status } = await request(app).get('/');

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });
  });
});
