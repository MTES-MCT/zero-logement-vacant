import { constants } from 'http2';

import { HttpError } from './httpError';

export default class ProspectMissingError
  extends HttpError
  implements HttpError
{
  constructor(id: string) {
    super({
      name: 'ProspectMissingError',
      message: `Prospect ${id} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
