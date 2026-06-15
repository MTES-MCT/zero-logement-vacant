import { constants } from 'http2';

import { HttpError } from './httpError';

export default class AuthenticationFailedError
  extends HttpError
  implements HttpError
{
  constructor() {
    super({
      name: 'AuthenticationFailedError',
      message: `Authentication failed.`,
      status: constants.HTTP_STATUS_UNAUTHORIZED
    });
  }
}
