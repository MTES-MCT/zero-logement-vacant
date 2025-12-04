import { constants } from 'node:http2';

import { HttpError } from './httpError';

export default class DocumentMissingError
  extends HttpError
  implements HttpError
{
  constructor(...documentId: string[]) {
    super({
      name: 'DocumentMissingError',
      message: `Document ${documentId.join(', ')} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND
    });
  }
}
