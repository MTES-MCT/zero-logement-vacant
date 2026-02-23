import { constants } from 'http2';

import { HttpError } from './httpError';

export default class UserDeletedError extends HttpError implements HttpError {
  constructor() {
    super({
      name: 'UserDeletedError',
      message: 'User account has been deleted.',
      status: constants.HTTP_STATUS_FORBIDDEN
    });
  }
}
