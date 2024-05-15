// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface HttpError extends Error {
  status: number;
}

interface HttpErrorOptions {
  name: string;
  message: string;
  status: number;
  data?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export abstract class HttpError extends Error implements HttpError {
  status: number;
  data?: Record<string, unknown>;

  protected constructor(options: HttpErrorOptions) {
    super(options.message);
    this.name = options.name;
    this.status = options.status;
    this.data = options.data;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      data: this.data,
    };
  }
}

export function isHttpError(error: Error): error is HttpError {
  return 'status' in error;
}

export function isClientError(error: HttpError): boolean {
  return 400 <= error.status && error.status < 500;
}
