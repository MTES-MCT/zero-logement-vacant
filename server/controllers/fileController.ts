import { Request, Response } from 'express';
import { constants } from 'http2';

import FileUploadError from '../errors/fileUploadError';
import { FileUploadDTO } from '../../shared/models/FileUploadDTO';

function create(request: Request, response: Response<FileUploadDTO>): void {
  const { file } = request;

  if (!file) {
    throw new FileUploadError();
  }

  const upload: FileUploadDTO = {
    id: file.key,
    type: file.contentType,
    url: file.location,
  };
  response.status(constants.HTTP_STATUS_CREATED).json(upload);
}

export default {
  create,
};
