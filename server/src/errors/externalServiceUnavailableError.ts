import { constants } from 'node:http2';

import { HttpError } from './httpError';

interface ExternalServiceUnavailableErrorOptions {
  retryAfterSeconds?: number;
}

export default class ExternalServiceUnavailableError
  extends HttpError
  implements HttpError
{
  constructor(
    service: string,
    options: ExternalServiceUnavailableErrorOptions = {}
  ) {
    super({
      name: 'ExternalServiceUnavailableError',
      message: `${service} is temporarily unavailable.`,
      status: constants.HTTP_STATUS_SERVICE_UNAVAILABLE,
      data: { service },
      headers:
        options.retryAfterSeconds === undefined
          ? undefined
          : { 'Retry-After': String(options.retryAfterSeconds) }
    });
  }
}
