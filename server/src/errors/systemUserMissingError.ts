import { constants } from 'node:http2';

import { HttpError } from './httpError';

export default class SystemUserMissingError
  extends HttpError
  implements HttpError
{
  constructor(email: string) {
    super({
      name: 'SystemUserMissingError',
      message:
        'Unable to resolve the system account used to attribute automated ' +
        'campaign-housing status flips',
      status: constants.HTTP_STATUS_INTERNAL_SERVER_ERROR,
      data: { email }
    });
  }
}
