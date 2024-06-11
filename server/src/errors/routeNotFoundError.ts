import { Request } from 'express';
import { constants } from 'http2';

import { HttpError } from './httpError';

export default class RouteNotFoundError extends HttpError implements HttpError {
  constructor(request: Request) {
    super({
      name: 'RouteNotFoundError',
      message: `Route not found`,
      status: constants.HTTP_STATUS_NOT_FOUND,
      data: {
        method: request.method,
        url: request.url,
      },
    });
  }
}
