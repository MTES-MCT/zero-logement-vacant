import { constants } from 'http2';

import { HttpError } from './httpError';

export default class OwnerMissingError extends HttpError implements HttpError {
  constructor(ownerId: string) {
    super({
      name: 'OwnerMissingError',
      message: `Owner ${ownerId} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
