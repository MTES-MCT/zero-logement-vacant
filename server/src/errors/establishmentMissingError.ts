import { constants } from 'http2';

import { HttpError } from './httpError';

export default class EstablishmentMissingError
  extends HttpError
  implements HttpError
{
  constructor(id: string) {
    super({
      name: 'EstablishmentMissingError',
      message: `Establishment ${id} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
