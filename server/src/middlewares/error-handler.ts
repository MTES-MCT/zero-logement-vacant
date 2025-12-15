import { errors as compose, ErrorHandler, Next } from 'compose-middleware';
import { Request, Response } from 'express';
import { constants } from 'http2';
import multer from 'multer';

import { isHttpError } from '~/errors/httpError';
import { createLogger } from '~/infra/logger';

const logger = createLogger('error-handler');

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
  next: Next
): void {
  if (response.headersSent) {
    next(error);
    return;
  }
  // Handle Multer errors (third-party library - needs transformation)
  if (error instanceof multer.MulterError) {
    const status = constants.HTTP_STATUS_BAD_REQUEST;
    let message: string;
    let reason: string;

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

  // Handle all HttpError instances (including custom errors)
  if (isHttpError(error)) {
    response.status(error.status).json(error.toJSON());
    return;
  }

  // Handle unknown errors
  response.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
    name: error.name,
    message: 'Internal Server Error'
  });
}

export default function errorHandler(): ErrorHandler<Request, Response> {
  return compose<Request, Response>(log, respond);
}
