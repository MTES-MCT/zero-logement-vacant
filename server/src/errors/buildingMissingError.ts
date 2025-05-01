import { constants } from 'http2';

import { HttpError } from './httpError';

export default class BuildingMissingError
  extends HttpError
  implements HttpError
{
  constructor(...id: string[]) {
    super({
      name: 'BuildingMissingError',
      message: `Building ${id.join(', ')} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND
    });
  }
}
