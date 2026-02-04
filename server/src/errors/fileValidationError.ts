import { constants } from 'http2';

import { HttpError } from './httpError';

export const FILE_VALIDATION_ERROR_REASONS = [
  'invalid_file_type',
  'mime_mismatch',
  'virus_detected',
  'file_too_large',
  'upload_failed'
] as const;
export type FileValidationErrorReason =
  (typeof FILE_VALIDATION_ERROR_REASONS)[number];

/**
 * Custom error class for file validation failures
 */
export class FileValidationError extends HttpError implements HttpError {
  public readonly filename: string;
  public readonly reason: FileValidationErrorReason;

  constructor(
    filename: string,
    reason: FileValidationErrorReason,
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
