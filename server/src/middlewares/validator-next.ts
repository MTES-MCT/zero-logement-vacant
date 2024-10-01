import { NextFunction, Request, Response } from 'express';
import { constants } from 'http2';
import { AnyObject, Maybe, object, ObjectSchema } from 'yup';

type RequestSchema = Partial<{
  body: ObjectSchema<Maybe<AnyObject>>;
  params: ObjectSchema<Maybe<Record<string, string>>>;
  query: ObjectSchema<Maybe<AnyObject>>;
}>;

function validate(schema: RequestSchema) {
  return (request: Request, response: Response, next: NextFunction) => {
    try {
      const data = object(schema).validateSync({
        body: request.body,
        params: request.params,
        query: request.query
      });
      request.body = data.body;
      request.params = data.params as Record<string, string>;
      request.query = data.query as Record<string, string>;
      next();
    } catch (error) {
      response.status(constants.HTTP_STATUS_BAD_REQUEST).json(error);
    }
  };
}

export default {
  validate
};
