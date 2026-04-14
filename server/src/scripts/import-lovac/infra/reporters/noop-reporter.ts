import { ImportSummary, Reporter, ReporterError } from '~/scripts/import-lovac/infra/reporters/reporter';

class NoopReporter<T> implements Reporter<T> {
  passed(_data: T): void {}

  skipped(_data: T) {}

  failed(_data: T, _error: ReporterError): void {}

  created(_n: number): void {}

  updated(_n: number): void {}

  getSummary(): ImportSummary {
    return { created: 0, updated: 0, skipped: 0, failed: 0, durationMs: 0 };
  }

  report(): void | Promise<void> {
    return undefined;
  }
}

export function createNoopReporter<T>(): Reporter<T> {
  return new NoopReporter<T>();
}
