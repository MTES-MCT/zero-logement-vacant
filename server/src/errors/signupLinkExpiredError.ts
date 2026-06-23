import { constants } from 'http2';

import { HttpError } from './httpError';

export default class SignupLinkExpiredError
  extends HttpError
  implements HttpError
{
  constructor() {
    super({
      name: 'SignupLinkExpiredError',
      message: `Signup link expired`,
      status: constants.HTTP_STATUS_GONE
    });
  }
}
