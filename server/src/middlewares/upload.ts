import { createS3 } from '@zerologementvacant/utils/node';
import { Predicate } from 'effect';
import { Request, RequestHandler } from 'express';
import mime from 'mime';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';

import BadRequestError from '~/errors/badRequestError';
import config from '~/infra/config';

export interface UploadOptions {
  /**
   * The accepted file extensions (without dot).
   * @default ['png', 'jpg', 'pdf']
   */
  accept?: string[];
  /**
   * Whether to accept multiple files.
   * @default false
   */
  multiple?: boolean;
}

const DEFAULT_ALLOWED_EXTENSIONS = ['png', 'jpg', 'pdf'];

export function upload(options?: UploadOptions): RequestHandler {
  const types: ReadonlyArray<string> = (
    options?.accept ?? DEFAULT_ALLOWED_EXTENSIONS
  )
    .map((ext) => mime.getType(ext))
    .filter(Predicate.isNotNull);

  const upload = multer({
    limits: {
      files: 1,
      fileSize: 1024 * 1024 * 5 // 5 MB
    },
    fileFilter(
      request: Request,
      file: Express.Multer.File,
      callback: multer.FileFilterCallback
    ) {
      if (!types.includes(file.mimetype)) {
        return callback(new BadRequestError());
      }
      return callback(null, true);
    },
    storage: multerS3({
      s3: createS3({
        endpoint: config.s3.endpoint,
        region: config.s3.region,
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey
      }),
      acl: 'authenticated-read',
      bucket: config.s3.bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata(request, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const id = uuidv4();
        cb(null, id);
      }
    })
  });

  return options?.multiple ? upload.array('files') : upload.single('file');
}
