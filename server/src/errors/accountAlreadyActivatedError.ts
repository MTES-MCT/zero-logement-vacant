import { HttpError } from './httpError';
import { constants } from 'http2';

export default class AccountAlreadyActivatedError
  extends HttpError
  implements HttpError
{
  constructor() {
    super({
      name: 'AccountAlreadyActivatedError',
      message: `This account is already activated.`,
      status: constants.HTTP_STATUS_FORBIDDEN,
    });
  }
}
