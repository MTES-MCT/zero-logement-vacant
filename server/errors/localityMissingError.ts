import { constants } from 'http2';

import { HttpError } from './httpError';

export default class LocalityMissingError
  extends HttpError
  implements HttpError
{
  constructor(geoCode: string) {
    super({
      name: 'LocalityError',
      message: `Locality ${geoCode} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
