import { faker } from '@faker-js/faker/locale/fr';

import type {
  SignupLinkDTO,
  SignupLinkPayloadDTO
} from '@zerologementvacant/models';
import { constants } from 'http2';
import { http, HttpResponse, RequestHandler } from 'msw';
import config from '../../utils/config';
import data from './data';

export const signupLinksHandlers: RequestHandler[] = [
  http.post<never, SignupLinkPayloadDTO, SignupLinkDTO>(
    `${config.apiEndpoint}/api/signup-links`,
    async ({ request }) => {
      const payload = await request.json();
      const signupLink: SignupLinkDTO = {
        id: faker.string.uuid(),
        prospectEmail: payload.email,
        expiresAt: faker.date.soon({ days: 7 })
      };
      data.signupLinks.push(signupLink);
      return HttpResponse.json(signupLink, {
        status: constants.HTTP_STATUS_CREATED
      });
    }
  )
];
