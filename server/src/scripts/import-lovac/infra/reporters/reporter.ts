export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  durationMs: number;
}

export interface Reporter<T> {
  passed(data: T): void;
  skipped(data: T): void;
  failed(data: T, error: ReporterError): void;
  created(n: number): void;
  updated(n: number): void;
  getSummary(): ImportSummary;
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
  /**
   * If true, the reporter will stop on the first error.
   * @default false
   */
  abortEarly?: boolean;
}
