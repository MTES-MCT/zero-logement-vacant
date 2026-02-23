import { http, HttpResponse, RequestHandler } from 'msw';
import { constants } from 'node:http2';

import type { EstablishmentDTO, UserDTO } from '@zerologementvacant/models';
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
  establishment: EstablishmentDTO;
}

export const authHandlers: RequestHandler[] = [
  http.post<Record<string, never>, AuthPayload, Auth>(
    `${config.apiEndpoint}/api/authenticate`,
    async ({ request }) => {
      const payload = await request.json();
      const user = data.users.find((user) => user.email === payload.email);
      if (!user) {
        return HttpResponse.json(null, {
          status: constants.HTTP_STATUS_UNAUTHORIZED
        });
      }

      // Find establishment for the user
      const establishment: EstablishmentDTO = data.establishments.find(
        (e) => e.id === user.establishmentId
      ) ?? {
        id: user.establishmentId ?? 'test-establishment-id',
        name: 'Test Establishment',
        shortName: 'Test',
        siren: '123456789',
        geoCodes: ['75056'],
        available: true,
        kind: 'CA',
        source: 'seed'
      };

      return HttpResponse.json({
        user,
        accessToken: 'fake-access-token',
        establishment
      });
    }
  )
];
