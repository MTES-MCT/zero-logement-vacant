import { HttpError } from "./httpError";
import { constants } from "http2";

export default class EstablishmentNotFoundError extends HttpError implements HttpError {
  constructor() {
    super({
      name: 'EstablishmentNotFoundError',
      message: 'Establishment not found',
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
