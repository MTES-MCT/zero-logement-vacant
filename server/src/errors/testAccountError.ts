import { HttpError } from './httpError';
import { constants } from 'http2';

export default class TestAccountError extends HttpError implements HttpError {
  constructor(email: string) {
    super({
      name: 'TestAccountError',
      message: `${email} is a test account. It cannot be used.`,
      status: constants.HTTP_STATUS_FORBIDDEN,
    });
  }
}
