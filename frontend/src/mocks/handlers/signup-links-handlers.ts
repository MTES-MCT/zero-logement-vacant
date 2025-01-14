import { faker } from '@faker-js/faker';
import { constants } from 'http2';
import { http, HttpResponse, RequestHandler } from 'msw';

import {
  SignupLinkDTO,
  SignupLinkPayloadDTO
} from '@zerologementvacant/models';
import data from './data';
import config from '../../utils/config';
import { isPast } from 'date-fns';

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
  ),
  http.get<never, SignupLinkDTO>(
    `${config.apiEndpoint}/api/signup-links/:id`,
    ({ params }) => {
      const { id } = params;
      const signupLink = data.signupLinks.find((link) => link.id === id);

      if (!signupLink) {
        return HttpResponse.json({
          name: 'SignupLinkMissingError',
          message: `Signup ${id} link missing`
        },
        { status: constants.HTTP_STATUS_NOT_FOUND });
      }

      if (isPast(signupLink.expiresAt)) {
        return HttpResponse.json({
          name: 'SignupLinkExpiredError',
          message: `Signup link expired`
        },
        { status: constants.HTTP_STATUS_GONE });
      }

      return HttpResponse.json(signupLink, {
        status: constants.HTTP_STATUS_OK
      });
    }
  )
];
