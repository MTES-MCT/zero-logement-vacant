import { constants } from 'http2';

import { HttpError } from './httpError';

export default class NoteMissingError extends HttpError implements HttpError {
  constructor(id: string) {
    super({
      name: 'NoteMissingError',
      message: `Note ${id} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND
    });
  }
}
