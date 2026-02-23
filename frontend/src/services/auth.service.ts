import type { EstablishmentDTO } from '@zerologementvacant/models';
import { fromEstablishmentDTO } from '../models/Establishment';
import type { AuthUser, User } from '../models/User';
import config from '../utils/config';

interface TwoFactorResponse {
  requiresTwoFactor: true;
  email: string;
}

// Raw API response before transformation
interface AuthUserRaw {
  user: User;
  accessToken: string;
  establishment: EstablishmentDTO;
  authorizedEstablishments?: EstablishmentDTO[];
}

function transformAuthUser(raw: AuthUserRaw): AuthUser {
  return {
    user: raw.user,
    accessToken: raw.accessToken,
    establishment: fromEstablishmentDTO(raw.establishment),
    authorizedEstablishments: raw.authorizedEstablishments?.map(fromEstablishmentDTO)
  };
}

type LoginResponse = AuthUser | TwoFactorResponse;

const login = async (
  email: string,
  password: string,
  establishmentId?: string
): Promise<LoginResponse> => {
  return fetch(`${config.apiEndpoint}/api/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, establishmentId })
  }).then((response) => {
    if (response.ok) {
      return response.json().then((data) => {
        // Check if 2FA is required
        if ('requiresTwoFactor' in data) {
          return data as TwoFactorResponse;
        }
        return transformAuthUser(data as AuthUserRaw);
      });
    } else {
      throw new Error('Authentication failed');
    }
  });
};

const verifyTwoFactor = async (
  email: string,
  code: string,
  establishmentId?: string
): Promise<AuthUser> => {
  return fetch(`${config.apiEndpoint}/api/authenticate/verify-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, establishmentId })
  }).then((response) => {
    if (response.ok) {
      return response.json().then((data) => transformAuthUser(data as AuthUserRaw));
    } else {
      throw new Error('2FA verification failed');
    }
  });
};

const logout = (): void => {
  localStorage.removeItem('authUser');
};

const resetPassword = async (key: string, password: string) => {
  const response = await fetch(
    `${config.apiEndpoint}/api/account/reset-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, password })
    }
  );
  if (!response.ok) {
    throw new Error('Password reset failed');
  }
};

const changeEstablishment = async (establishmentId: string): Promise<AuthUser> => {
  return fetch(
    `${config.apiEndpoint}/api/account/establishments/${establishmentId}`,
    {
      method: 'GET',
      headers: {
        ...authService.authHeader(),
        'Content-Type': 'application/json'
      }
    }
  ).then((response) => {
    if (response.ok) {
      return response.json().then((data) => transformAuthUser(data as AuthUserRaw));
    } else {
      throw new Error('Authentication failed');
    }
  });
};

const authHeader = () => {
  const authUser = JSON.parse(localStorage.getItem('authUser') ?? '{}');
  return authUser && authUser.accessToken
    ? { 'x-access-token': authUser.accessToken }
    : undefined;
};

const withAuthHeader = (headers?: Headers) => {
  if (authHeader()) {
    const newHeaders = new Headers(authHeader());
    headers?.forEach((value, key) => {
      newHeaders.append(key, value);
    });
    return newHeaders;
  } else {
    return headers;
  }
};

const authService = {
  login,
  verifyTwoFactor,
  logout,
  resetPassword,
  authHeader,
  withAuthHeader,
  changeEstablishment
};

export default authService;
export type { TwoFactorResponse, LoginResponse };
