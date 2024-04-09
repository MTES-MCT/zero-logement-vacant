import { constants } from 'http2';

import { HttpError } from './httpError';

export default class OwnerMissingError extends HttpError implements HttpError {
  constructor(...id: string[]) {
    super({
      name: 'OwnerMissingError',
      message: `Owner(s) missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
      data: {
        id,
      },
    });
  }
}
