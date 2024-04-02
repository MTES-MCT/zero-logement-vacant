import { Request } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';

import { createS3 } from '../../shared/utils/s3';
import config from '../utils/config';

export function upload() {
  const upload = multer({
    fileFilter(
      request: Request,
      file: Express.Multer.File,
      callback: multer.FileFilterCallback
    ) {
      // TODO: check file.mimetype
      return callback(null, true);
    },
    storage: multerS3({
      s3: createS3({
        endpoint: config.s3.endpoint,
        region: config.s3.region,
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
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
      },
    }),
  });

  return upload.single('file');
}
