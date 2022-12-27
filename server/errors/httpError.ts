export interface HttpError extends Error {
  status: number;
}

interface HttpErrorOptions {
  name: string;
  message: string;
  status: number;
}

export abstract class HttpError extends Error implements HttpError {
  status: number;

  protected constructor(options: HttpErrorOptions) {
    super(options.message);
    this.name = options.name;
    this.status = options.status;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
    };
  }
}

export function isHttpError(error: Error): error is HttpError {
  return 'status' in error;
}

export function isClientError(error: HttpError): boolean {
  return 400 <= error.status && error.status < 500;
}
