import { constants } from 'http2';

import { HttpError } from './httpError';

export default class DashcardMissingError
  extends HttpError
  implements HttpError
{
  constructor(dashcardId: number) {
    super({
      name: 'DashcardMissingError',
      message: `Dashcard ${dashcardId} not found or not a supported type`,
      status: constants.HTTP_STATUS_NOT_FOUND,
      data: {
        dashcardId,
      },
    });
  }
}
