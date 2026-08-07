import axios from 'axios';

import config from '~/infra/config';
import { createLogger } from '~/infra/logger';

const logger = createLogger('ceremaAuthProvider');

export interface CeremaAuth {
  apiUrl: string;
  authorization: string;
}

export async function authenticate(): Promise<CeremaAuth> {
  let data: { access?: string; refresh?: string };
  try {
    ({ data } = await axios.post<{ access?: string; refresh?: string }>(
      `${config.cerema.api}/api/token/`,
      { username: config.cerema.username, password: config.cerema.password }
    ));
  } catch (error) {
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    const message = axios.isAxiosError(error) ? error.message : String(error);
    logger.error('Authentication failed', { status, error: message });
    throw new Error(`Cerema authentication failed: ${status}`);
  }

  if (!data.access) {
    throw new Error('Cerema authentication response has no access token');
  }

  return {
    apiUrl: config.cerema.api,
    authorization: `Bearer ${data.access}`
  };
}
