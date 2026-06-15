import { constants } from 'http2';

import { HttpError } from './httpError';

export default class ResetLinkExpiredError
  extends HttpError
  implements HttpError
{
  constructor() {
    super({
      name: 'ResetLinkExpiredError',
      message: `Reset link expired`,
      status: constants.HTTP_STATUS_GONE
    });
  }
}
