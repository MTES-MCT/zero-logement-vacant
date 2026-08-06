import { constants } from 'node:http2';

import { HttpError } from './httpError';

export default class GatewayTimeoutError
  extends HttpError
  implements HttpError
{
  constructor(message = 'Gateway timeout') {
    super({
      name: 'GatewayTimeoutError',
      message,
      status: constants.HTTP_STATUS_GATEWAY_TIMEOUT
    });
  }
}
