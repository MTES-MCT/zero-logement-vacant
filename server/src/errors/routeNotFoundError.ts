import { HttpError } from './httpError';
import { constants } from 'http2';

export default class RouteNotFoundError extends HttpError implements HttpError {
  constructor() {
    super({
      name: 'RouteNotFoundError',
      message: `Route not found`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
