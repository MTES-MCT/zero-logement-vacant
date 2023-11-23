import { HttpError } from './httpError';
import { constants } from 'http2';

export default class HousingUpdateForbiddenError
  extends HttpError
  implements HttpError
{
  constructor(...housingId: string[]) {
    super({
      name: 'HousingUpdateForbiddenError',
      message: `Housing ${housingId.join(', ')} update forbidden`,
      status: constants.HTTP_STATUS_FORBIDDEN,
    });
  }
}
