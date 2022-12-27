import { Request, Response } from 'express';
import { isClientError, isHttpError } from '../errors/httpError';
import { errors as compose, ErrorHandler, Next } from 'compose-middleware';

function log(
  error: Error,
  request: Request,
  response: Response,
  next: Next
): void {
  // Should later be enhanced with relevant info like Request ID, user ID, etc.
  console.error(error);
  next(error);
}

function respond(
  error: Error,
  request: Request,
  response: Response,
  // Needed because express bases itself on the number of arguments
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: Next
): void {
  const status =
    isHttpError(error) && isClientError(error) ? error.status : 500;

  response.status(status).send({
    name: error.name,
    message: error.message,
  });
}

export default function errorHandler(): ErrorHandler<Request, Response> {
  return compose<Request, Response>(log, respond);
}
