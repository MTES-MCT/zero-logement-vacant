import { constants } from 'http2';

import { HttpError } from './httpError';

export default class FileUploadError extends HttpError implements HttpError {
  constructor() {
    super({
      name: 'FileUploadError',
      message: `A file must be uploaded`,
      status: constants.HTTP_STATUS_BAD_REQUEST,
    });
  }
}
