import config from '../utils/config';
import { Prospect } from '../models/Prospect';

async function upsert(signupLink: string): Promise<Prospect> {
  const response = await fetch(
    `${config.apiEndpoint}/api/signup-links/${signupLink}/prospect`,
    { method: 'PUT', }
  );
  if (!response.ok) {
    throw new Error('Une erreur s’est produite.');
  }
  return response.json();
}

async function get(email: string): Promise<Prospect> {
  const response = await fetch(`${config.apiEndpoint}/api/prospects/${email}`);
  return response.json();
}

const prospectService = {
  upsert,
  get,
};

export default prospectService;
