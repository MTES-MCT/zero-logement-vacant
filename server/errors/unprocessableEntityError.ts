import { constants } from 'http2';

import { HttpError } from './httpError';

export default class UnprocessableEntityError
  extends HttpError
  implements HttpError
{
  constructor() {
    super({
      name: 'UnprocessableEntityError',
      message: `Unprocessable entity`,
      status: constants.HTTP_STATUS_UNPROCESSABLE_ENTITY,
    });
  }
}
