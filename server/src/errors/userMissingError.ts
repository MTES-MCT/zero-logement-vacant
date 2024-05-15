import { constants } from 'http2';

import { HttpError } from './httpError';

export default class UserMissingError extends HttpError implements HttpError {
  constructor(id: string) {
    super({
      name: 'UserMissingError',
      message: `User ${id} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
