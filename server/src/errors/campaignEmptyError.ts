import { constants } from 'http2';

import { HousingFiltersDTO } from '@zerologementvacant/models';
import { HttpError } from './httpError';

export default class CampaignEmptyError extends HttpError implements HttpError {
  constructor(filters: HousingFiltersDTO) {
    super({
      name: 'CampaignEmptyError',
      message: `Campaign empty`,
      status: constants.HTTP_STATUS_UNPROCESSABLE_ENTITY,
      data: {
        filters
      }
    });
  }
}
