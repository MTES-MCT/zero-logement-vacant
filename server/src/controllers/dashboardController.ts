import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { param, ValidationChain } from 'express-validator';
import { constants } from 'http2';
import jwt from 'jsonwebtoken';

import {
  DashboardDTO,
  Resource,
  RESOURCE_VALUES
} from '@zerologementvacant/models';
import config from '~/infra/config';
import { createURL, getResource } from '~/models/DashboardApi';

async function findOne(
  request: Request<{ id: Resource }>,
  response: Response<DashboardDTO>
): Promise<void> {
  const { auth, params } = request as AuthenticatedRequest<{ id: Resource }>;

  const payload = {
    resource: {
      dashboard: getResource(params.id)
    },
    params: {}
  };
  const token = await sign(payload);
  const dashboard = {
    url: createURL({
      domain: config.metabase.domain,
      token
    })
  };
  response.status(constants.HTTP_STATUS_OK).json(dashboard);
}
const findOneValidators: ValidationChain[] = [
  param('id').isIn(RESOURCE_VALUES)
];

function sign(payload: any): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      config.metabase.token,
      {
        algorithm: 'HS256',
        expiresIn: '10m'
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
  findOneValidators
};
