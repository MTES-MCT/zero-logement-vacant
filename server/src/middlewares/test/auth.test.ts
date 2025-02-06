import express, { NextFunction, Request, Response } from 'express';
import { constants } from 'http2';
import request from 'supertest';

import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';
import { UserApi, UserRoles } from '~/models/UserApi';
import { hasRole } from '~/middlewares/auth';

describe('Auth', () => {
  describe('hasRoles', () => {
    const establishment = genEstablishmentApi();

    function createUser(role: UserRoles): UserApi {
      return { ...genUserApi(establishment.id), role };
    }

    function setUser(user: UserApi) {
      return (request: Request, _: Response, next: NextFunction) => {
        request.user = user;
        next();
      };
    }

    const visitor = createUser(UserRoles.Visitor);
    const admin = createUser(UserRoles.Admin);
    const user = createUser(UserRoles.Usual);

    it('should succeed if the user has the given role', async () => {
      const app = express();
      app.get(
        '/',
        setUser(admin),
        hasRole([UserRoles.Admin]),
        (_, response) => {
          response.status(constants.HTTP_STATUS_OK).send();
        }
      );

      const { status } = await request(app).get('/');

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should succeed if the user has one of the given roles', async () => {
      const app = express();
      app.get(
        '/',
        setUser(user),
        hasRole([UserRoles.Admin, UserRoles.Usual]),
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
        hasRole([UserRoles.Admin, UserRoles.Usual]),
        (_, response) => {
          response.status(constants.HTTP_STATUS_OK).send();
        }
      );

      const { status } = await request(app).get('/');

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });
  });
});
