import { Reporter, ReporterError } from '~/scripts/import-lovac/infra';

class NoopReporter<T> implements Reporter<T> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  passed(data: T): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  skipped(data: T) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  failed(data: T, error: ReporterError): void {}

  report(): void | Promise<void> {
    return undefined;
  }
}

export function createNoopReporter<T>(): Reporter<T> {
  return new NoopReporter<T>();
}
