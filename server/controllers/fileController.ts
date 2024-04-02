import { Request, Response } from 'express';
import { constants } from 'http2';

import FileUploadError from '../errors/fileUploadError';

function create(request: Request, response: Response): void {
  const { file } = request;

  if (!file) {
    throw new FileUploadError();
  }

  response.status(constants.HTTP_STATUS_CREATED).json({
    id: file.key,
    type: file.contentType,
    url: file.location,
  });
}

export default {
  create,
};
