import { constants } from 'http2';

import { HttpError } from './httpError';

export default class ContactPointMissingError
  extends HttpError
  implements HttpError
{
  constructor(contactPointId: string) {
    super({
      name: 'ContactPointError',
      message: `Contact point ${contactPointId} missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
