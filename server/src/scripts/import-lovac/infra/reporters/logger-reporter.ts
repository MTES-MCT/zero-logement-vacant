import { createLogger } from '~/infra/logger';
import {
  ImportSummary,
  Reporter,
  ReporterError
} from '~/scripts/import-lovac/infra/reporters/reporter';

class LoggerReporter<T> implements Reporter<T> {
  private readonly logger = createLogger('reporter');
  private readonly startTime = Date.now();
  private pass = 0;
  private skip = 0;
  private fail = 0;
  private create = 0;
  private update = 0;

  passed(): void {
    this.pass++;
  }

  skipped(): void {
    this.skip++;
  }

  failed(data: T, error: ReporterError): void {
    this.fail++;
    const idpersonne = (data as { idpersonne?: string }).idpersonne;
    this.logger.error('Failed', { idpersonne, error });
  }

  created(n: number): void {
    this.create += n;
  }

  updated(n: number): void {
    this.update += n;
  }

  getSummary(): ImportSummary {
    return {
      created: this.create,
      updated: this.update,
      skipped: this.skip,
      failed: this.fail,
      durationMs: Date.now() - this.startTime
    };
  }

  report(): void {
    this.logger.info('Report', this.getSummary());
  }
}

export function createLoggerReporter<T>(): Reporter<T> {
  return new LoggerReporter<T>();
}
