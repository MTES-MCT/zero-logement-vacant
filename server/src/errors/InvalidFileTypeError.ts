import { constants } from 'http2';

import { HttpError } from './httpError';

interface InvalidFileTypeErrorOptions {
  filename: string;
  accepted: ReadonlyArray<string>;
}

export class InvalidFileTypeError extends HttpError implements HttpError {
  constructor(options: InvalidFileTypeErrorOptions) {
    super({
      name: 'InvalidFileTypeError',
      message: `Le type du fichier "${options.filename}" n’est pas autorisé`,
      status: constants.HTTP_STATUS_BAD_REQUEST,
      data: {
        filename: options.filename,
        accepted: options.accepted
      }
    });
  }
}
