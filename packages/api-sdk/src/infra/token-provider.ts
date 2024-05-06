import { InternalAxiosRequestConfig } from 'axios';
import jwt from 'jsonwebtoken';

import config from './config';
import { logger } from './logger';

export default function createTokenProvider(establishment: string) {
  const cache = new Map<string, string>();

  return async (
    config: InternalAxiosRequestConfig,
  ): Promise<InternalAxiosRequestConfig> => {
    const token = cache.get(establishment) ?? (await fetchToken(establishment));

    // TODO: change this to "Authorization: `Bearer ${token}`"
    config.headers.set('x-access-token', token);
    return config;
  };
}

async function fetchToken(establishment: string): Promise<string> {
  const payload = {
    establishmentId: establishment,
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
