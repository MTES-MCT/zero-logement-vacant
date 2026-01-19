import { NextFunction, Request, Response } from 'express';
import { constants } from 'http2';
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
      // Support multipart/form-data requests with payload field
      let body;
      if (
        request.body !== null &&
        typeof request.body === 'object' &&
        'payload' in request.body &&
        typeof request.body.payload === 'string'
      ) {
        try {
          body = JSON.parse(request.body.payload);
        } catch {
          const syntheticError = new YupValidationError(
            'Invalid JSON in payload field',
            request.body.payload,
            'payload'
          );
          throw syntheticError;
        }
      } else {
        body = request.body;
      }

      const data = object(schema).validateSync({
        body,
        params: request.params,
        query: request.query
      });
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
    super({
      name: error.name,
      message: error.message,
      status: constants.HTTP_STATUS_BAD_REQUEST,
      data: {
        ...error
      }
    });
  }
}

export default {
  validate
};
