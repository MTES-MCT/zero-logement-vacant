import auth from 'http-auth';
import path from 'node:path';

export const createBasicAuth = (): ReturnType<typeof auth.basic> =>
  auth.basic({
    file: path.join(__dirname, '.htpasswd'),
    skipUser: true
  });
