import config from '../utils/config';
import { AuthUser } from '../models/User';

const login = async (
  email: string,
  password: string,
  establishmentId?: string
): Promise<AuthUser> => {
  return fetch(`${config.apiEndpoint}/api/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, establishmentId }),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Authentication failed');
      }
    })
    .then((authUser) => {
      if (authUser.accessToken) {
        localStorage.setItem('authUser', JSON.stringify(authUser));
      }
      return authUser;
    });
};

const logout = (): void => {
  localStorage.removeItem('authUser');
};

const changePassword = async (currentPassword: string, newPassword: string) => {
  return fetch(`${config.apiEndpoint}/api/account/password`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Password change failed');
    }
  });
};

const resetPassword = async (key: string, password: string) => {
  const response = await fetch(
    `${config.apiEndpoint}/api/account/reset-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, password }),
    }
  );
  if (!response.ok) {
    throw new Error('Password reset failed');
  }
};

const authHeader = () => {
  const authUser = JSON.parse(localStorage.getItem('authUser') ?? '{}');
  return authUser && authUser.accessToken
    ? { 'x-access-token': authUser.accessToken }
    : undefined;
};

const authService = {
  login,
  logout,
  changePassword,
  resetPassword,
  authHeader,
};

export default authService;
