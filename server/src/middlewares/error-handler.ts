import { ErrorHandler, errors as compose, Next } from 'compose-middleware';
import { Request, Response } from 'express';
import { constants } from 'http2';
import multer from 'multer';

import { isClientError, isHttpError } from '~/errors/httpError';
import BadRequestError from '~/errors/badRequestError';
import { createLogger } from '~/infra/logger';

const logger = createLogger('error-handler');

/**
 * Check if error is a FileValidationError (from fileTypeValidation middleware)
 */
function isFileValidationError(error: Error): error is BadRequestError & {
  reason: 'invalid_file_type' | 'mime_mismatch';
  fileName: string;
  detectedType?: string;
} {
  return (
    error instanceof BadRequestError &&
    error.name === 'FileValidationError' &&
    'reason' in error &&
    'fileName' in error
  );
}

function log(
  error: Error,
  request: Request,
  response: Response,
  next: Next
): void {
  // Should later be enhanced with relevant info like Request ID, user ID, etc.
  logger.error('API Error', error);
  next(error);
}

function respond(
  error: Error,
  request: Request,
  response: Response,
  // Needed because express bases itself on the number of arguments
  next: Next,
): void {
  if (response.headersSent) {
    next(error);
    return;
  }

  // Handle FileValidationError (from fileTypeValidation middleware)
  if (isFileValidationError(error)) {
    const status = constants.HTTP_STATUS_BAD_REQUEST;
    let message = 'Invalid file type';

    if (error.reason === 'mime_mismatch') {
      message = `Declared MIME type does not match actual file type`;
    } else if (error.detectedType) {
      message = `File type ${error.detectedType} is not allowed`;
    }

    response.status(status).json({
      name: 'FileValidationError',
      message,
      reason: error.reason,
      fileName: error.fileName
    });
    return;
  }

  // Handle Multer errors (file upload errors)
  if (error instanceof multer.MulterError) {
    const status = constants.HTTP_STATUS_BAD_REQUEST;
    let message = 'File upload error';
    let reason = 'unknown';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        reason = 'file_too_large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        reason = 'too_many_files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        reason = 'unexpected_field';
        break;
      default:
        message = error.message;
        reason = 'upload_error';
    }

    response.status(status).json({
      name: 'MulterError',
      message,
      reason,
      error: error.code
    });
    return;
  }

  const status =
    isHttpError(error) && isClientError(error) ? error.status : 500;

  response.status(status ?? constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
    name: error.name,
    message: isHttpError(error) ? error.message : 'Internal Server Error',
  });
}

export default function errorHandler(): ErrorHandler<Request, Response> {
  return compose<Request, Response>(log, respond);
}
