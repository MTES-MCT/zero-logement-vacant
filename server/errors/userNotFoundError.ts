import { HttpError } from "./httpError";
import { constants } from "http2";

export default class UserNotFoundError extends HttpError implements HttpError {
  constructor() {
    super({
      name: 'UserNotFoundError',
      message: 'User not found',
      status: constants.HTTP_STATUS_NOT_FOUND,
    });
  }
}
