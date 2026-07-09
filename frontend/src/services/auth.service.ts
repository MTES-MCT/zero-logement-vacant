import config from '../utils/config';

const resetPassword = async (key: string, password: string) => {
  const response = await fetch(`${config.apiEndpoint}/account/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, password })
  });
  if (!response.ok) {
    throw new Error('Password reset failed');
  }
};

const authService = {
  resetPassword
};

export default authService;
