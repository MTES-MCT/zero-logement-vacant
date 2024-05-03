import { constants } from 'http2';

import { CampaignStatus, nextStatus } from '@zerologementvacant/models';
import { HttpError } from './httpError';
import { CampaignApi } from '~/models/CampaignApi';

interface Data extends Record<string, unknown> {
  campaign: CampaignApi;
  target: CampaignStatus;
}

export default class CampaignStatusError
  extends HttpError
  implements HttpError
{
  constructor(data: Data) {
    super({
      name: 'CampaignStatusError',
      message: `This campaign’s next status should be ${nextStatus(
        data.campaign.status,
      )}`,
      status: constants.HTTP_STATUS_UNPROCESSABLE_ENTITY,
      data,
    });
  }
}
