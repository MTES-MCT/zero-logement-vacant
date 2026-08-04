export const FILTERED_VALUE = '[Filtered]';

const RESET_LINK_TOKEN_PATTERN = /(\/reset-links\/)[^/?#]+/g;
const SENSITIVE_KEY_PATTERN =
  /password|token|authorization|cookie|reset.?link|(^|_)key($|_)/i;

export function redactSensitiveUrl(value: string): string {
  return value
    .replace(RESET_LINK_TOKEN_PATTERN, `$1${FILTERED_VALUE}`)
    .replace(/#.*$/, '');
}

export function redactSensitiveData<T>(value: T): T {
  const seen = new WeakMap<object, unknown>();

  function redact(current: unknown, key?: string): unknown {
    if (key && SENSITIVE_KEY_PATTERN.test(key)) {
      return FILTERED_VALUE;
    }
    if (typeof current === 'string') {
      return redactSensitiveUrl(current);
    }
    if (current === null || typeof current !== 'object') {
      return current;
    }
    if (current instanceof Date) {
      return current;
    }

    const cached = seen.get(current);
    if (cached) {
      return cached;
    }
    if (Array.isArray(current)) {
      const clone: unknown[] = [];
      seen.set(current, clone);
      current.forEach((item) => clone.push(redact(item)));
      return clone;
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      return current;
    }

    const clone: Record<string, unknown> = {};
    seen.set(current, clone);
    Object.entries(current).forEach(([entryKey, entryValue]) => {
      clone[entryKey] = redact(entryValue, entryKey);
    });
    return clone;
  }

  return redact(value) as T;
}
