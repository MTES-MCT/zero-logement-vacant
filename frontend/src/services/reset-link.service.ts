import config from '../utils/config';
import authService from './auth.service';

const sendResetEmail = async (email: string): Promise<void> => {
  const { status } = await fetch(`${config.apiEndpoint}/api/reset-links`, {
    method: 'POST',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  if (status >= 500) {
    throw new Error('Impossible d’envoyer le mail');
  }
};

const exists = async (id: string): Promise<boolean> => {
  const response = await fetch(`${config.apiEndpoint}/api/reset-links/${id}`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  });
  return response.ok;
};

const resetLinkService = {
  sendResetEmail,
  exists,
};

export default resetLinkService;
