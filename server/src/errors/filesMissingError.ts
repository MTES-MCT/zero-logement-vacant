import { constants } from 'http2';

import { HttpError } from './httpError';

export default class FilesMissingError extends HttpError implements HttpError {
  constructor() {
    super({
      name: 'FilesMissingError',
      message: 'No file uploaded',
      status: constants.HTTP_STATUS_BAD_REQUEST
    });
  }
}
