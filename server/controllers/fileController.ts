import { Request, Response } from 'express';
import { constants } from 'http2';

import FileUploadError from '../errors/fileUploadError';
import { FileUploadDTO } from '../../shared/models/FileUploadDTO';
import config from '../utils/config';

function create(request: Request, response: Response<FileUploadDTO>): void {
  const { file } = request;

  if (!file) {
    throw new FileUploadError();
  }

  const upload: FileUploadDTO = {
    id: file.key,
    type: file.contentType,
    url: isLocalhost(file.location)
      ? replaceLocalhost(file.location)
      : file.location,
  };
  response.status(constants.HTTP_STATUS_CREATED).json(upload);
}

function isLocalhost(location: string): boolean {
  return location.startsWith('http://localhost');
}

function replaceLocalhost(location: string): string {
  return location.replace('http://localhost', config.s3.endpoint);
}

export default {
  create,
};
