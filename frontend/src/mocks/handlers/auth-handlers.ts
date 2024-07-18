import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import { UserDTO } from '@zerologementvacant/models';
import config from '../../utils/config';
import data from './data';

interface AuthPayload {
  email: string;
  password: string;
  establishmentId?: string;
}

interface Auth {
  user: UserDTO;
  accessToken: string;
}

export const authHandlers: RequestHandler[] = [
  http.post<Record<string, never>, AuthPayload, Auth>(
    `${config.apiEndpoint}/api/authenticate`,
    async ({ request, }) => {
      const payload = await request.json();
      const user = data.users.find((user) => user.email === payload.email);
      if (!user) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_UNAUTHORIZED,
        });
      }

      return HttpResponse.json({
        user,
        accessToken: 'fake-access-token',
      });
    }
  )
];
