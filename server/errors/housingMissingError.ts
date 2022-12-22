import { constants } from 'http2';

import { HttpError } from './httpError';

export default class HousingMissingError
  extends HttpError
  implements HttpError
{
  constructor(...housingId: string[]) {
    super({
      name: 'HousingMissingError',
      message: `Housing ${housingId.join(', ')} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
