import async from 'async';
import { Request, Response } from 'express';
import { constants } from 'node:http2';
import process from 'node:process';

import { Logger } from '@zerologementvacant/utils';
import { Check } from './checks/check';

interface Options {
  checks?: Check[];
  logger?: Logger;
}

export interface CheckStatus extends Omit<Check, 'test'> {
  status: 'up' | 'down';
}

export function healthcheck(opts?: Options) {
  const checks = opts?.checks ?? [];
  const logger = opts?.logger ?? console;

  return async (_: Request, response: Response) => {
    const statuses = await async.map(
      checks,
      async (check: Check): Promise<CheckStatus> => {
        try {
          await check.test();
          return {
            ...check,
            status: 'up',
          };
        } catch (error) {
          logger.error('Healthcheck error', error);
          return {
            ...check,
            status: 'down',
          };
        }
      },
    );

    response.status(constants.HTTP_STATUS_OK).json({
      uptime: process.uptime(),
      checks: statuses,
    });
  };
}
