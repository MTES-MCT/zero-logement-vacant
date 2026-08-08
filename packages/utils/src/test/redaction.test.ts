import { describe, expect, it } from 'vitest';

import {
  FILTERED_VALUE,
  redactSensitiveData,
  redactSensitiveUrl
} from '../redaction';

describe('Sensitive data redaction', () => {
  it('should redact reset tokens and URL fragments', () => {
    const token = 'A'.repeat(100);
    const url = `https://example.test/reset-links/${token}?source=email#${token}`;

    const redacted = redactSensitiveUrl(url);

    expect(redacted).toBe(
      `https://example.test/reset-links/${FILTERED_VALUE}?source=email`
    );
    expect(redacted).not.toContain(token);
  });

  it('should preserve fragment-like text that is not a sensitive URL', () => {
    const breadcrumb = 'main#content button#submit-password';

    expect(redactSensitiveUrl(breadcrumb)).toBe(breadcrumb);
  });

  it('should recursively redact secret-bearing fields and URLs', () => {
    const token = 'B'.repeat(100);
    const password = 'MotDePasse123';

    const redacted = redactSensitiveData({
      request: {
        data: { key: token, password },
        url: `https://example.test/reset-links/${token}`
      },
      breadcrumbs: [
        {
          data: { authorization: `Bearer ${token}` }
        }
      ]
    });

    expect(JSON.stringify(redacted)).not.toContain(token);
    expect(JSON.stringify(redacted)).not.toContain(password);
    expect(redacted.request.data).toEqual({
      key: FILTERED_VALUE,
      password: FILTERED_VALUE
    });
  });

  it('should redact common API and secret key field names', () => {
    const value = 'SensitiveKeyValue';

    const redacted = redactSensitiveData({
      apiKey: value,
      secret: value,
      secretKey: value,
      sessionKey: value,
      'x-api-key': value
    });

    expect(redacted).toEqual({
      apiKey: FILTERED_VALUE,
      secret: FILTERED_VALUE,
      secretKey: FILTERED_VALUE,
      sessionKey: FILTERED_VALUE,
      'x-api-key': FILTERED_VALUE
    });
    expect(JSON.stringify(redacted)).not.toContain(value);
  });

  it('should redact every alias of an object also referenced by a sensitive field', () => {
    const value = 'AliasedSensitiveValue';
    const credentials = { value };

    const redacted = redactSensitiveData({
      publicAlias: credentials,
      password: credentials
    });

    expect(redacted).toEqual({
      publicAlias: FILTERED_VALUE,
      password: FILTERED_VALUE
    });
    expect(JSON.stringify(redacted)).not.toContain(value);
  });

  it('should preserve an own __proto__ key without mutating the clone prototype', () => {
    const input = JSON.parse(
      '{"__proto__":{"polluted":"yes"},"safe":"value"}'
    ) as Record<string, unknown>;

    const redacted = redactSensitiveData(input);

    expect(Object.hasOwn(redacted, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(redacted)).toBe(Object.prototype);
    expect(redacted['__proto__']).toEqual({ polluted: 'yes' });
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('should leave class instances untouched', () => {
    const error = new Error('Diagnostic context');

    expect(redactSensitiveData(error)).toBe(error);
  });
});
