import { constants } from 'http2';
import { http, HttpResponse, RequestHandler } from 'msw';

import {
  SignupLinkDTO
} from '@zerologementvacant/models';
import data from './data';
import config from '../../utils/config';
import { isPast } from 'date-fns';

export const userAccessHandlers: RequestHandler[] = [
  http.get<never, SignupLinkDTO>(
    `${config.apiEndpoint}/api/user-access`,
    ({ request }) => {

      const url = new URL(request.url);
      const email = url.searchParams.get('email');
      const signupLink = data.signupLinks.find((link) => link.prospectEmail === email);

      if (!signupLink) {
        return HttpResponse.json({
          name: 'SignupLinkMissingError',
          message: `Signup ${email} link missing`
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

      const user = data.ceremaUsers.find((user) => user.email === email);
      if(!user) {
        return HttpResponse.json({
          name: 'AuthenticationFailedError',
          message: `Authentication failed.`
        },
        { status: constants.HTTP_STATUS_UNAUTHORIZED });
      }

      if(user !== null) {
        if(user.establishmentId === null) {
          return HttpResponse.json({
            name: 'EstablishmentMissingError',
            message: `Establishment ${undefined} missing`
          },
          { status: constants.HTTP_STATUS_NOT_FOUND });
        }
        return HttpResponse.json(user, {
          status: constants.HTTP_STATUS_OK
        });
      }
    }
  )
];
