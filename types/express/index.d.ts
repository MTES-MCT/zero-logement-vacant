import 'express';
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.MulterS3.File | undefined;
  }
}
