import 'express';
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File | undefined;
    files?: Express.Multer.File[] | undefined;
  }
}
