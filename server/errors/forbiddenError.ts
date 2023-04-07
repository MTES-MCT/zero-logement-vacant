import { constants } from 'http2';

import { HttpError } from './httpError';

export default class ForbiddenError extends HttpError implements HttpError {
  constructor() {
    super({
      name: 'ForbiddenError',
      message: `Forbidden`,
      status: constants.HTTP_STATUS_FORBIDDEN,
    });
  }
}
