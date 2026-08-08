import { constants } from 'http2';

import { NextFunction, Request, Response } from 'express';
import {
  AnyObject,
  Maybe,
  object,
  ObjectSchema,
  ValidationError as YupValidationError
} from 'yup';

import { HttpError } from '~/errors/httpError';

type RequestSchema = Partial<{
  body: ObjectSchema<Maybe<AnyObject>>;
  params: ObjectSchema<Maybe<Record<string, string>>>;
  query: ObjectSchema<Maybe<AnyObject>>;
}>;

function validate(schema: RequestSchema) {
  return (request: Request, response: Response, next: NextFunction) => {
    try {
      const data = object(schema).validateSync(
        {
          body: request.body,
          params: request.params,
          query: request.query
        },
        { stripUnknown: true }
      );
      request.body = data.body;
      request.params = data.params as Record<string, string>;
      request.query = data.query as Record<string, string>;
      next();
    } catch (error) {
      next(new ValidationError(error as YupValidationError));
    }
  };
}

class ValidationError extends HttpError implements HttpError {
  constructor(error: YupValidationError) {
    const message =
      error.type === 'typeError'
        ? `Valeur invalide pour ${error.path ?? 'la requête'}.`
        : error.message;
    super({
      name: error.name,
      message,
      status: constants.HTTP_STATUS_BAD_REQUEST,
      diagnostic: {
        path: error.path,
        type: error.type
      }
    });
  }
}

export default {
  validate
};
