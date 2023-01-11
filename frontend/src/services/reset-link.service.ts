import config from '../utils/config';
import authService from './auth.service';
import { ResetLink } from '../models/ResetLink';

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

const get = async (id: string): Promise<ResetLink> => {
  const response = await fetch(`${config.apiEndpoint}/api/reset-links/${id}`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Impossible de récupérer le lien');
  }
  return response.json();
};

const resetLinkService = {
  sendResetEmail,
  get,
};

export default resetLinkService;
