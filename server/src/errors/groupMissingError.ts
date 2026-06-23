import { constants } from 'http2';

import { HttpError } from './httpError';

export default class GroupMissingError extends HttpError implements HttpError {
  constructor(id?: string) {
    super({
      name: 'GroupMissingError',
      message: `Group missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
      data: {
        id
      }
    });
  }
}
