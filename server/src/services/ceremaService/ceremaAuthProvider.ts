import axios from 'axios';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';

const logger = createLogger('ceremaAuthProvider');

/**
 * Represents an authentication token for Cerema API.
 */
export interface AuthResult {
  /** The token to use in Authorization header */
  token: string;
  /** The Authorization header prefix (Token for V1, Bearer for V2) */
  authPrefix: 'Token' | 'Bearer';
  /** The base API URL to use for subsequent requests */
  apiUrl: string;
}

/**
 * Interface for Cerema authentication providers.
 */
export interface CeremaAuthProvider {
  /**
   * Authenticates with the Cerema API and returns an auth result.
   */
  authenticate(): Promise<AuthResult>;
}

/**
 * V1 authentication provider for the legacy Portail DF API.
 * Uses POST /api/api-token-auth/ and returns { token }.
 */
class CeremaAuthProviderV1 implements CeremaAuthProvider {
  async authenticate(): Promise<AuthResult> {
    try {
      const { data } = await axios.post<{ token: string }>(
        `${config.cerema.api}/api/api-token-auth/`,
        { username: config.cerema.username, password: config.cerema.password }
      );
      return { token: data.token, authPrefix: 'Token', apiUrl: config.cerema.api };
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = axios.isAxiosError(error) ? error.message : String(error);
      logger.error('V1 authentication failed', { status, error: message });
      throw new Error(`Cerema V1 authentication failed: ${status}`);
    }
  }
}

/**
 * V2 authentication provider for the new DataFoncier API.
 * Uses POST /api/token/ and returns { access, refresh }.
 */
class CeremaAuthProviderV2 implements CeremaAuthProvider {
  async authenticate(): Promise<AuthResult> {
    try {
      const { data } = await axios.post<{ access: string; refresh: string }>(
        `${config.cerema.apiV2}/api/token/`,
        { username: config.cerema.username, password: config.cerema.password }
      );
      return {
        token: data.access,
        authPrefix: 'Bearer',
        apiUrl: config.cerema.apiV2
      };
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = axios.isAxiosError(error) ? error.message : String(error);
      logger.error('V2 authentication failed', { status, error: message });
      throw new Error(`Cerema V2 authentication failed: ${status}`);
    }
  }
}

/**
 * Creates an auth provider based on the configured auth version.
 */
export function createAuthProvider(): CeremaAuthProvider {
  const version = config.cerema.authVersion;
  logger.debug(`Using Cerema auth version: ${version}`);

  return version === 'v2'
    ? new CeremaAuthProviderV2()
    : new CeremaAuthProviderV1();
}
