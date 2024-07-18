import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import jwt from 'jsonwebtoken';

import config from '~/infra/config';
import { param, ValidationChain } from 'express-validator';
import { createURL, getResource, Resource } from '~/models/DashboardApi';

async function findOne(request: Request, response: Response): Promise<void> {
  const { auth, params, } = request as AuthenticatedRequest;

  const payload = {
    resource: {
      dashboard: getResource(params.id as Resource),
    },
    params: {
      id: auth.establishmentId,
    },
  };
  const token = await sign(payload);
  const dashboard = {
    url: createURL({
      domain: config.metabase.domain,
      token,
    }),
  };
  response.status(constants.HTTP_STATUS_OK).json(dashboard);
}
const findOneValidators: ValidationChain[] = [
  param('id').isIn(['utilisateurs', 'etablissements'])
];

function sign(payload: any): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      config.metabase.token,
      {
        algorithm: 'HS256',
        expiresIn: '10m',
      },
      (err, token) => {
        if (err) {
          return reject(err);
        }
        return resolve(token ?? '');
      }
    );
  });
}

export default {
  findOne,
  findOneValidators,
};
