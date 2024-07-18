import { InternalAxiosRequestConfig } from 'axios';
import jwt from 'jsonwebtoken';
import { Knex } from 'knex';
import { AsyncLocalStorage } from 'node:async_hooks';

import { Logger } from '@zerologementvacant/utils';

interface TokenProviderOptions {
  auth: {
    secret: string;
  };
  db: Knex;
  logger: Logger;
  serviceAccount: string;
  storage: AsyncLocalStorage<{ establishment: string }>;
}

export default function createTokenProvider(opts: TokenProviderOptions) {
  const { auth, db, logger, serviceAccount, storage, } = opts;
  const cache = new Map<string, string>();

  async function fetchToken(
    establishment: string,
    user: string
  ): Promise<string> {
    const payload = {
      establishmentId: establishment,
      userId: user,
      role: 'admin',
    };
    return new Promise<string>((resolve, reject) => {
      jwt.sign(payload, auth.secret, (error, token) => {
        if (error || !token) {
          return reject(error);
        }
        logger.debug('Token generated', { establishment, });
        return resolve(token);
      });
    });
  }

  return async (
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
    logger.debug('Intercepting request...');
    const establishment = storage.getStore()?.establishment;
    if (!establishment) {
      throw new Error('Establishment not found in context.');
    }

    if (cache.has(establishment)) {
      logger.debug('Cache hit!', { establishment, });
      config.headers.set('x-access-token', cache.get(establishment));
      return config;
    }

    const user = await db('users').where({ email: serviceAccount, }).first();
    if (!user) {
      throw new Error(`User ${serviceAccount} not found.`);
    }
    logger.debug('Found user', user);
    const token = await fetchToken(establishment, user.id);

    // TODO: change this to "Authorization: `Bearer ${token}`"
    config.headers.set('x-access-token', token);
    cache.set(establishment, token);
    logger.debug('Cache token', { establishment, token, });
    return config;
  };
}
