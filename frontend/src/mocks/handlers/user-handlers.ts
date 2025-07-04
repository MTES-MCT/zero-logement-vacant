import { faker } from '@faker-js/faker/locale/fr';

import { UserDTO } from '@zerologementvacant/models';
import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';
import { UserRoles } from '../../models/User';
import config from '../../utils/config';

interface UserPayload {
  email: string;
  password: string;
}

export const userHandlers: RequestHandler[] = [
  http.post<Record<string, never>, UserPayload, never>(
    `${config.apiEndpoint}/api/users/creation`,
    async ({ request }) => {
      const payload = await request.json();

      const user: UserDTO = {
        id: faker.string.uuid(),
        email: payload.email,
        role: UserRoles.Usual
      };
      return HttpResponse.json(user, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  )
];
