import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'http2';
import jwt from 'jsonwebtoken';

import type { CardDataDTO, DashboardDTO } from '@zerologementvacant/models';
import { RESOURCE_VALUES } from '@zerologementvacant/models';
import type { Resource } from '@zerologementvacant/models';
import DashcardMissingError from '~/errors/dashcardMissingError';
import UnprocessableEntityError from '~/errors/unprocessableEntityError';
import config from '~/infra/config';
import {
  createURL,
  fetchCardQueryData,
  fetchMetabaseDashboard,
  findDashcard,
  getResource,
  normalizeDashboard
} from '~/models/DashboardApi';

async function findOne(
  request: Request<{ id: Resource }>,
  response: Response<DashboardDTO>
): Promise<void> {
  const { auth, params } = request as AuthenticatedRequest<{ id: Resource }>;

  const numericId = getResource(params.id);

  const [token, raw] = await Promise.all([
    sign({
      resource: { dashboard: numericId },
      params: { id: auth.establishmentId }
    }),
    fetchMetabaseDashboard(
      numericId,
      config.metabase.domain,
      config.metabase.apiToken
    )
  ]);

  const url = createURL({ domain: config.metabase.domain, token });
  const normalized = normalizeDashboard(raw);

  response
    .status(constants.HTTP_STATUS_OK)
    .json({ id: numericId, url, ...normalized });
}

async function findOneCard(
  request: Request<{ did: string; cid: string }>,
  response: Response<CardDataDTO>
): Promise<void> {
  const { params } = request as AuthenticatedRequest<{
    did: string;
    cid: string;
  }>;

  const numericDid = RESOURCE_VALUES.includes(params.did as Resource)
    ? getResource(params.did as Resource)
    : parseInt(params.did, 10);

  const numericCid = parseInt(params.cid, 10);
  if (isNaN(numericCid)) {
    throw new UnprocessableEntityError();
  }

  const raw = await fetchMetabaseDashboard(
    numericDid,
    config.metabase.domain,
    config.metabase.apiToken
  );

  const dashcard = findDashcard(raw, numericCid);
  if (!dashcard) throw new DashcardMissingError(numericCid);

  const data = await fetchCardQueryData({
    dashboardId: numericDid,
    dashcardId: dashcard.dashcardId,
    cardId: dashcard.cardId,
    domain: config.metabase.domain,
    apiToken: config.metabase.apiToken
  });

  response.status(constants.HTTP_STATUS_OK).json({ id: numericCid, data });
}

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
  findOneCard
};
