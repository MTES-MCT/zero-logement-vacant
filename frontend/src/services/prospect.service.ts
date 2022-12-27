import config from '../utils/config';
import { Prospect } from '../models/Prospect';
import authService from './auth.service';

const get = (email: string): Promise<Prospect> => {
  return fetch(`${config.apiEndpoint}/api/prospects/${email}`, {
    method: 'GET',
    headers: {
      ...authService.authHeader(),
      'Content-Type': 'application/json',
    },
  }).then((_) => _.json());
};

const prospectService = {
  get,
};

export default prospectService;
