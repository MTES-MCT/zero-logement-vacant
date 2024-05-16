import { constants } from 'http2';

import { HttpError } from './httpError';

export default class PasswordInvalidError
  extends HttpError
  implements HttpError
{
  constructor() {
    super({
      name: 'PasswordInvalidError',
      message: `Password invalid`,
      status: constants.HTTP_STATUS_FORBIDDEN,
    });
  }
}
