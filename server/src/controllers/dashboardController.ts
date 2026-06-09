import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { constants } from 'node:http2';
import jwt from 'jsonwebtoken';

import type { CardDataDTO, DashboardDTO, Resource } from '@zerologementvacant/models';
import type {
  BarChartValue,
  LineChartValue,
  PieChartValue,
  TableValue
} from '~/services/metabase/metabase-service';
import { RESOURCE_VALUES } from '@zerologementvacant/models';
import DashcardMissingError from '~/errors/dashcardMissingError';
import UnprocessableEntityError from '~/errors/unprocessableEntityError';
import config from '~/infra/config';
import { createURL, getResource } from '~/models/DashboardApi';
import { metabaseAPI } from '~/services/metabase/metabase-api';

async function findOne(
  request: Request<{ id: Resource }>,
  response: Response<DashboardDTO>
): Promise<void> {
  const { auth, params } = request as AuthenticatedRequest<{ id: Resource }>;

  const numericId = getResource(params.id);

  const [token, normalized] = await Promise.all([
    sign({
      resource: { dashboard: numericId },
      params: { id: auth.establishmentId }
    }),
    metabaseAPI.getDashboard(numericId)
  ]);

  const url = createURL({ domain: config.metabase.domain, token });

  response
    .status(constants.HTTP_STATUS_OK)
    .json({ id: numericId, url, ...normalized });
}

async function findOneCard(
  request: Request<{ did: string; cid: string }>,
  response: Response<CardDataDTO>
): Promise<void> {
  const { auth, params } = request as AuthenticatedRequest<{
    did: string;
    cid: string;
  }>;

  const numericDid = RESOURCE_VALUES.includes(params.did as Resource)
    ? getResource(params.did as Resource)
    : parseInt(params.did, 10);
  if (isNaN(numericDid)) {
    throw new UnprocessableEntityError();
  }

  const numericCid = parseInt(params.cid, 10);
  if (isNaN(numericCid)) {
    throw new UnprocessableEntityError();
  }

  const dashcard = await metabaseAPI.findDashcard(numericDid, numericCid);
  if (!dashcard) throw new DashcardMissingError(numericCid);

  const queryParameters = dashcard.dashboardParameters
    .filter((p) => p.slug === 'id')
    .map((p) => ({ ...p, value: auth.establishmentId }));

  const raw = await metabaseAPI.getCardValue(
    numericDid,
    dashcard.dashcardId,
    dashcard.cardId,
    queryParameters,
    dashcard.valueColumn,
    dashcard.type,
    dashcard.direction,
    dashcard.tableColumns
  );

  if (dashcard.type === 'bar-chart') {
    const barRaw = raw as BarChartValue;
    response.status(constants.HTTP_STATUS_OK).json({
      id: numericCid,
      type: 'bar-chart',
      direction: barRaw.direction,
      labels: barRaw.labels,
      data: barRaw.data
    });
    return;
  }

  if (dashcard.type === 'line-chart') {
    const lineRaw = raw as LineChartValue;
    response.status(constants.HTTP_STATUS_OK).json({
      id: numericCid,
      type: 'line-chart',
      labels: lineRaw.labels,
      data: lineRaw.data
    });
    return;
  }

  if (dashcard.type === 'pie-chart') {
    const pieRaw = raw as PieChartValue;
    response.status(constants.HTTP_STATUS_OK).json({
      id: numericCid,
      type: 'pie-chart',
      labels: pieRaw.labels,
      data: pieRaw.data
    });
    return;
  }

  if (dashcard.type === 'table') {
    const tableRaw = raw as TableValue;
    response.status(constants.HTTP_STATUS_OK).json({
      id: numericCid,
      type: 'table',
      columns: tableRaw.columns,
      rows: tableRaw.rows
    });
    return;
  }

  const scalar = raw as number;
  const data = dashcard.type === 'percentage' ? scalar / 100 : scalar;
  response.status(constants.HTTP_STATUS_OK).json({
    id: numericCid,
    type: dashcard.type as 'flat-number' | 'percentage',
    data
  });
}

function sign(payload: object): Promise<string> {
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
        if (!token) return reject(new Error('jwt.sign produced no token'));
        return resolve(token);
      }
    );
  });
}

export default {
  findOne,
  findOneCard
};
