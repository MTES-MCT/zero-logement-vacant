import { createLogger } from '~/infra/logger';
import {
  Reporter,
  ReporterError
} from '~/scripts/import-lovac/infra/reporters/reporter';

class LoggerReporter<T> implements Reporter<T> {
  private readonly logger = createLogger('reporter');
  private pass = 0;
  private skip = 0;
  private fail = 0;

  passed(): void {
    this.pass++;
  }

  skipped(): void {
    this.skip++;
  }

  failed(data: T, error: ReporterError): void {
    this.fail++;
    this.logger.error('Failed', error);
  }

  report(): void | Promise<void> {
    this.logger.info('Report', {
      passed: this.pass,
      skipped: this.skip,
      failed: this.fail
    });
  }
}

export function createLoggerReporter<T>(): Reporter<T> {
  return new LoggerReporter<T>();
}
