import config from '../utils/config';
import { SignupLink } from '../models/SignupLink';

const sendActivationEmail = async (email: string): Promise<void> => {
  const response = await fetch(`${config.apiEndpoint}/api/signup-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (response.status >= 500) {
    throw new Error('Cannot create sign-up link');
  }
};

const get = async (id: string): Promise<SignupLink> => {
  const response = await fetch(`${config.apiEndpoint}/api/signup-links/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Cannot get sign-up link');
  }
  return response.json();
};

const signupLinkService = {
  sendActivationEmail,
  get,
};

export default signupLinkService;
