import { constants } from 'http2';

import { HttpError } from './httpError';

export default class DraftMissingError extends HttpError implements HttpError {
  constructor(id: string) {
    super({
      name: 'DraftMissingError',
      message: `Draft ${id} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
