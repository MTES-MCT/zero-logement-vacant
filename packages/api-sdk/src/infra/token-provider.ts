import { InternalAxiosRequestConfig } from 'axios';
import jwt from 'jsonwebtoken';
import { Knex } from 'knex';

import config from './config';
import { logger } from './logger';

interface TokenProviderOptions {
  db: Knex;
  serviceAccount: string;
}

export default function createTokenProvider(
  establishment: string,
  opts: TokenProviderOptions,
) {
  const { db } = opts;
  const cache = new Map<string, string>();

  let user;

  return async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    user = await db('users').where({ email: opts.serviceAccount }).first();
    const token =
      cache.get(establishment) ?? (await fetchToken(establishment, user.id));

    // TODO: change this to "Authorization: `Bearer ${token}`"
    config.headers.set('x-access-token', token);
    return config;
  };
}

async function fetchToken(
  establishment: string,
  user: string,
): Promise<string> {
  const payload = {
    establishmentId: establishment,
    userId: user,
    role: 'admin',
  };
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, config.auth.secret, (error, token) => {
      if (error || !token) {
        return reject(error);
      }
      logger.debug('Token generated', { establishment });
      return resolve(token);
    });
  });
}
