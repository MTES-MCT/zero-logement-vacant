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
    const response = await fetch(`${config.cerema.api}/api/api-token-auth/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: config.cerema.username,
        password: config.cerema.password
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('V1 authentication failed', { status: response.status, error });
      throw new Error(`Cerema V1 authentication failed: ${response.status}`);
    }

    const data = (await response.json()) as { token: string };

    return {
      token: data.token,
      authPrefix: 'Token',
      apiUrl: config.cerema.api
    };
  }
}

/**
 * V2 authentication provider for the new DataFoncier API.
 * Uses POST /api/token/ and returns { access, refresh }.
 */
class CeremaAuthProviderV2 implements CeremaAuthProvider {
  async authenticate(): Promise<AuthResult> {
    const response = await fetch(`${config.cerema.apiV2}/api/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: config.cerema.username,
        password: config.cerema.password
      })
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('V2 authentication failed', { status: response.status, error });
      throw new Error(`Cerema V2 authentication failed: ${response.status}`);
    }

    const data = (await response.json()) as { access: string; refresh: string };

    return {
      token: data.access,
      authPrefix: 'Bearer',
      apiUrl: config.cerema.apiV2
    };
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
