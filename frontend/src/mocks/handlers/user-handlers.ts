import { faker } from '@faker-js/faker/locale/fr';
import { type UserDTO, UserRole } from '@zerologementvacant/models';
import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import config from '~/utils/config';
import data from './data';

interface UserPayload {
  email: string;
  password: string;
}

const list = http.get<never, never, ReadonlyArray<UserDTO>>(
  `${config.apiEndpoint}/api/users`,
  () => {
    const users = data.users;

    return HttpResponse.json(users, {
      status: constants.HTTP_STATUS_OK
    });
  }
);

const create = http.post<Record<string, never>, UserPayload, never>(
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
      establishmentId: faker.string.uuid(),
      phone: null,
      position: null,
      timePerWeek: null,
      lastAuthenticatedAt: null,
      suspendedAt: null,
      suspendedCause: null,
      updatedAt: '',
      kind: null
    };
    return HttpResponse.json(user, {
      status: constants.HTTP_STATUS_CREATED
    });
  }
);

interface PathParams extends Record<string, string> {
  id: UserDTO['id'];
}

const remove = http.delete<PathParams, never, null | Error>(
  `${config.apiEndpoint}/api/users/:id`,
  ({ params }) => {
    const user = data.users.find((user) => user.id === params.id);
    if (!user) {
      return HttpResponse.json(
        { name: 'UserMissingError', message: `User ${params.id} missing` },
        { status: constants.HTTP_STATUS_NOT_FOUND }
      );
    }

    return HttpResponse.json(null, {
      status: constants.HTTP_STATUS_NO_CONTENT
    });
  }
);

export const userHandlers: RequestHandler[] = [list, create, remove];
