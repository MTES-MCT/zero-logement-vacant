import { describe, expect, it } from 'vitest';
import { ReporterError } from '~/scripts/import-lovac/infra/reporters/reporter';
import { createLoggerReporter } from '~/scripts/import-lovac/infra/reporters/logger-reporter';

describe('LoggerReporter', () => {
  it('tracks created count via created(n)', () => {
    const reporter = createLoggerReporter<{ idpersonne: string }>();
    reporter.created(3);
    reporter.created(5);
    expect(reporter.getSummary().created).toBe(8);
  });

  it('tracks updated count via updated(n)', () => {
    const reporter = createLoggerReporter<{ idpersonne: string }>();
    reporter.updated(2);
    reporter.updated(7);
    expect(reporter.getSummary().updated).toBe(9);
  });

  it('tracks skipped count via skipped()', () => {
    const reporter = createLoggerReporter<{ idpersonne: string }>();
    reporter.skipped({ idpersonne: 'abc' });
    reporter.skipped({ idpersonne: 'def' });
    expect(reporter.getSummary().skipped).toBe(2);
  });

  it('tracks failed count via failed()', () => {
    const reporter = createLoggerReporter<{ idpersonne: string }>();
    reporter.failed({ idpersonne: 'abc' }, new ReporterError('bad'));
    expect(reporter.getSummary().failed).toBe(1);
  });

  it('getSummary includes durationMs >= 0', () => {
    const reporter = createLoggerReporter<{ idpersonne: string }>();
    const summary = reporter.getSummary();
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });
});
