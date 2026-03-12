import { constants } from 'http2';

import { HttpError } from './httpError';

export default class BadRequestError extends HttpError implements HttpError {
  constructor(message = 'Bad request') {
    super({
      name: 'BadRequestError',
      message,
      status: constants.HTTP_STATUS_BAD_REQUEST,
    });
  }
}
