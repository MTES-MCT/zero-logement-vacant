import { InternalAxiosRequestConfig } from 'axios';
import jwt from 'jsonwebtoken';
import { Knex } from 'knex';

import { Logger } from '@zerologementvacant/utils';

interface TokenProviderOptions {
  auth: {
    secret: string;
  };
  db: Knex;
  logger: Logger;
  serviceAccount: string;
}

export default function createTokenProvider(
  establishment: string,
  opts: TokenProviderOptions,
) {
  const { auth, db, logger } = opts;
  const cache = new Map<string, string>();

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
      jwt.sign(payload, auth.secret, (error, token) => {
        if (error || !token) {
          return reject(error);
        }
        logger.debug('Token generated', { establishment });
        return resolve(token);
      });
    });
  }

  let user: { id: string } | null;

  return async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    user = await db('users').where({ email: opts.serviceAccount }).first();
    if (!user) {
      throw new Error(`User ${opts.serviceAccount} not found.`);
    }
    const token =
      cache.get(establishment) ?? (await fetchToken(establishment, user.id));

    // TODO: change this to "Authorization: `Bearer ${token}`"
    config.headers.set('x-access-token', token);
    return config;
  };
}
