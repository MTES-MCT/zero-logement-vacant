import { Request, Response } from 'express';
import { constants } from 'http2';

import { FileUploadDTO } from '@zerologementvacant/models';
import FileUploadError from '~/errors/fileUploadError';

function create(request: Request, response: Response<FileUploadDTO>): void {
  const file = request.file as Express.MulterS3.File;

  if (!file) {
    throw new FileUploadError();
  }

  const upload: FileUploadDTO = {
    id: file.key,
    type: file.contentType,
    url: file.key,
  };
  response.status(constants.HTTP_STATUS_CREATED).json(upload);
}

export default {
  create,
};