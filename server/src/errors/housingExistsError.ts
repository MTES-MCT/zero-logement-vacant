import { constants } from 'http2';

import { HttpError } from './httpError';

export default class HousingExistsError extends HttpError implements HttpError {
  constructor(id: string) {
    super({
      name: 'HousingExistsError',
      message: `Housing ${id} exists`,
      status: constants.HTTP_STATUS_CONFLICT,
    });
  }
}
