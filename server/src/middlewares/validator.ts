import { NextFunction, Request, Response } from 'express';
import { matchedData, validationResult } from 'express-validator';
import { constants } from 'http2';
import { logger } from '~/infra/logger';

function validate(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  const errors = validationResult(request);
  if (errors.isEmpty()) {
    ['body', 'cookies', 'headers', 'params', 'query'].forEach((location) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      request[location] = matchedData(request, { locations: [location] });
    });
    return next();
  }
  logger.error('Validation error', {
    errors: errors.array()
  });
  response
    .status(constants.HTTP_STATUS_BAD_REQUEST)
    .json({ errors: errors.array() });
}

export default {
  validate
};
