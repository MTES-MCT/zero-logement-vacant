import { constants } from 'http2';

import { HttpError } from './httpError';

export default class PrecisionMissingError
  extends HttpError
  implements HttpError
{
  constructor(...ids: string[]) {
    super({
      name: 'PrecisionMissingError',
      message: `Precision(s) ${ids.join(', ')} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND
    });
  }
}
