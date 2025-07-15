import { faker } from '@faker-js/faker';

import { UserDTO, UserRole } from '@zerologementvacant/models';
import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';
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
        role: UserRole.USUAL,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        activatedAt: new Date().toJSON(),
        establishmentId: faker.string.uuid()
      };
      return HttpResponse.json(user, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  )
];
