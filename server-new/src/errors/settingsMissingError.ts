import { constants } from 'http2';

import { HttpError } from './httpError';

interface Data {
  id?: string;
  establishmentId?: string;
}

export default class SettingsMissingError
  extends HttpError
  implements HttpError
{
  constructor(data?: Data) {
    super({
      name: 'SettingsMissingError',
      message: `Settings missing`,
      status: constants.HTTP_STATUS_NOT_FOUND,
      data: {
        id: data?.id,
        establishmentId: data?.establishmentId,
      },
    });
  }

  toJSON() {
    return {
      ...super.toJSON(),
      data: this.data,
    };
  }
}
