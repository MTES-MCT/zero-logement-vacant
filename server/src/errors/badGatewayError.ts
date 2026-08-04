import { constants } from 'node:http2';

import { HttpError } from './httpError';

export default class BadGatewayError extends HttpError implements HttpError {
  constructor(message = 'Bad gateway') {
    super({
      name: 'BadGatewayError',
      message,
      status: constants.HTTP_STATUS_BAD_GATEWAY
    });
  }
}
