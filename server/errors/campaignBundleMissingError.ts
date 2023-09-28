import { constants } from 'http2';

import { HttpError } from './httpError';

interface Data extends Record<string, unknown> {
  establishmentId: string;
  campaignNumber: string;
  reminderNumber: string;
}

export default class CampaignBundleMissingError
  extends HttpError
  implements HttpError
{
  constructor(data?: Data) {
    super({
      name: 'HousingMissingError',
      message: `Campaign bundle missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
      data,
    });
  }
}
