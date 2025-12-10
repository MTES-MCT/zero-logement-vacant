import { constants } from 'http2';

import { HttpError } from './httpError';

/**
 * Custom error class for file validation failures
 */
export class FileValidationError extends HttpError implements HttpError {
  public readonly filename: string;
  public readonly reason:
    | 'invalid_file_type'
    | 'mime_mismatch'
    | 'virus_detected'
    | 'file_too_large';

  constructor(
    filename: string,
    reason:
      | 'invalid_file_type'
      | 'mime_mismatch'
      | 'virus_detected'
      | 'file_too_large',
    message: string,
    details?: Record<string, any>
  ) {
    super({
      name: 'FileValidationError',
      message,
      status: constants.HTTP_STATUS_BAD_REQUEST,
      data: {
        filename,
        reason,
        ...details
      }
    });
    this.filename = filename;
    this.reason = reason;
  }
}
