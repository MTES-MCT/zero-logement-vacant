export interface Reporter<T> {
  passed(data: T): void;
  failed(data: T, error: ReporterError): void;
  report(): void | Promise<void>;
}

export class ReporterError extends Error implements Error {
  constructor(
    message?: string,
    private data?: unknown
  ) {
    super(message);
  }

  toJSON() {
    return {
      message: this.message,
      data: this.data
    };
  }
}

export interface ReporterOptions<T> {
  reporter: Reporter<T>;
}
