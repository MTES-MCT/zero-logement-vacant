import { constants } from 'node:http2';

import { HttpError } from './httpError';

export default class ExternalServiceUnavailableError
  extends HttpError
  implements HttpError
{
  constructor(service: string) {
    super({
      name: 'ExternalServiceUnavailableError',
      message: `${service} is temporarily unavailable.`,
      status: constants.HTTP_STATUS_SERVICE_UNAVAILABLE,
      data: { service }
    });
  }
}
