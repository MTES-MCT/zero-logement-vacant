import { ImportSummary, Reporter } from '~/scripts/import-lovac/infra/reporters/reporter';

class NoopReporter<T> implements Reporter<T> {
  passed(): void {}

  skipped() {}

  failed(): void {}

  created(): void {}

  updated(): void {}

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
