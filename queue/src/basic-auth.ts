import auth from 'http-auth';
import path from 'node:path';

export const createBasicAuth = () =>
  auth.basic({
    file: path.join(__dirname, '.htpasswd'),
    skipUser: true
  });
