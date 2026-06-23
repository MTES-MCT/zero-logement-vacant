import { constants } from 'http2';

import { HttpError } from './httpError';

export default class SignupLinkMissingError
  extends HttpError
  implements HttpError
{
  constructor(id: string) {
    super({
      name: 'SignupLinkMissingError',
      message: `Signup ${id} link missing`,
      status: constants.HTTP_STATUS_NOT_FOUND
    });
  }
}
