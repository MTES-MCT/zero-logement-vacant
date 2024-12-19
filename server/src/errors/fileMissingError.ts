import { constants } from 'http2';

import { HttpError } from './httpError';

export default class FileMissingError extends HttpError implements HttpError {
  constructor() {
    super({
      name: 'FileMissingError',
      message: `File not found on bucket`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
