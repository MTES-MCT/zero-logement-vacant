import config from '../utils/config';
import authService from './auth.service';

const sendResetEmail = async (email: string): Promise<void> => {
  await fetch(`${config.apiEndpoint}/api/reset-links`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
};

const resetLinkService = {
  sendResetEmail,
};

export default resetLinkService;
