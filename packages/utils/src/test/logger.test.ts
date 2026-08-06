import { setImmediate } from 'node:timers/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { LogLevel } from '../log-level';
import { createLogger } from '../logger';

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts structured secrets at the shared logger seam', async () => {
    const secret = 'SharedLoggerSecret';
    const chunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      chunks.push(String(chunk));
      return true;
    });
    const logger = createLogger('redaction-test', { isProduction: true });

    logger.info('Sensitive request', {
      apiKey: secret,
      breadcrumb: 'main#content button#submit',
      nested: { password: secret },
      safe: 'visible'
    });
    await setImmediate();

    const output = chunks.join('');
    expect(output).not.toContain(secret);
    expect(output).toContain('[Filtered]');
    expect(output).toContain('main#content button#submit');
    expect(output).toContain('visible');
  });

  it('does not serialize a raw Error message that may contain a secret', async () => {
    const secret = 'RawErrorSecret';
    const chunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      chunks.push(String(chunk));
      return true;
    });
    const logger = createLogger('error-redaction-test', { isProduction: true });

    logger.error(new Error(`Authentication failed\n${secret}`));
    await setImmediate();

    const output = chunks.join('');
    expect(output).not.toContain(secret);
    expect(output).toContain('Error');
  });

  it('does not serialize secret messages from nested errors', async () => {
    const secret = 'NestedErrorSecret';
    const chunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      chunks.push(String(chunk));
      return true;
    });
    const logger = createLogger('nested-error-redaction-test', {
      isProduction: true
    });

    logger.error('Nested failure', {
      err: new Error(`Authentication failed\n${secret}`)
    });
    await setImmediate();

    const output = chunks.join('');
    expect(output).not.toContain(secret);
    expect(output).toContain('Error');
  });

  it('does not traverse payloads for disabled log levels', () => {
    const payload = {};
    Object.defineProperty(payload, 'password', {
      enumerable: true,
      get() {
        throw new Error('Disabled log payload should not be read');
      }
    });
    const logger = createLogger('disabled-level-test', {
      isProduction: true,
      level: LogLevel.INFO
    });

    expect(() => logger.debug('Disabled debug log', payload)).not.toThrow();
  });
});
