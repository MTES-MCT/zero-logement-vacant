import { constants } from 'http2';

import { HttpError } from './httpError';

export default class UserSuspendedError extends HttpError implements HttpError {
  constructor(cause?: string) {
    super({
      name: 'UserSuspendedError',
      message: cause
        ? `User account is suspended: ${cause}`
        : 'User account is suspended.',
      status: constants.HTTP_STATUS_FORBIDDEN
    });
  }
}
