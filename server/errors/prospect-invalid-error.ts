import { constants } from "http2";

import { HttpError } from "./http-error";
import { ProspectApi } from "../models/ProspectApi";

export default class ProspectInvalidError extends HttpError implements HttpError {
  constructor(prospect: ProspectApi) {
    super({
      name: 'ProspectInvalidError',
      message: `Prospect ${prospect.email} invalid`,
      // TODO: add details
      status: constants.HTTP_STATUS_FORBIDDEN,
    });
  }
}
