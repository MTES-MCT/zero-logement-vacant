import { constants } from 'http2';

import { HttpError } from './httpError';

export default class OwnerProspectMissingError
  extends HttpError
  implements HttpError
{
  constructor(id: string) {
    super({
      name: 'OwnerProspectMissingError',
      message: `Owner prospect ${id} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
