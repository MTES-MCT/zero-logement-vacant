import { constants } from 'http2';

import { HttpError } from './httpError';

export default class CampaignMissingError
  extends HttpError
  implements HttpError
{
  constructor(id?: string) {
    super({
      name: 'CampaignMissingError',
      message: `Campaign missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
      data: {
        id,
      },
    });
  }
}
