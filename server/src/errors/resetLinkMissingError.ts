import { constants } from 'http2';

import { HttpError } from './httpError';

export default class ResetLinkMissingError
  extends HttpError
  implements HttpError
{
  constructor() {
    super({
      name: 'ResetLinkMissingError',
      message: `Reset link missing`,
      status: constants.HTTP_STATUS_NOT_FOUND
    });
  }
}
