import { constants } from 'http2';

import { HttpError } from './httpError';
import { HousingOwnerApi } from '../models/HousingOwnerApi';

export default class HousingOwnersDifferentError
  extends HttpError
  implements HttpError
{
  constructor(a: HousingOwnerApi[], b: HousingOwnerApi[]) {
    super({
      name: 'HousingOwnersDifferentError',
      message: `Housing owners are different`,
      status: constants.HTTP_STATUS_UNPROCESSABLE_ENTITY,
      data: {
        a,
        b,
      },
    });
  }
}
