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

  it('should leave class instances untouched', () => {
    const error = new Error('Diagnostic context');

    expect(redactSensitiveData(error)).toBe(error);
  });
});
