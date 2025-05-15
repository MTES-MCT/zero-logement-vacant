declare namespace Express {
  export interface Request {
    file?: Express.MulterS3.File;
  }
}
