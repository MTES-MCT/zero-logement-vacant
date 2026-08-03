// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface HttpError extends Error {
  status: number;
}

interface HttpErrorOptions {
  name: string;
  message: string;
  status: number;
  data?: Record<string, unknown>;
  headers?: Readonly<Record<string, string>>;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export abstract class HttpError extends Error implements HttpError {
  status: number;
  data?: Record<string, unknown>;
  headers?: Readonly<Record<string, string>>;

  protected constructor(options: HttpErrorOptions) {
    super(options.message);
    this.name = options.name;
    this.status = options.status;
    this.data = options.data;
    this.headers = options.headers;
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      data: this.data
    };
  }
}

export function isHttpError(error: Error): error is HttpError {
  return 'status' in error;
}
