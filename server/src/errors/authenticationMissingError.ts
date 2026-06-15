import { constants } from 'http2';

import { HttpError } from './httpError';

export default class AuthenticationMissingError
  extends HttpError
  implements HttpError
{
  constructor() {
    super({
      name: 'AuthenticationMissingError',
      message: `Authentication missing`,
      status: constants.HTTP_STATUS_UNAUTHORIZED
    });
  }
}
