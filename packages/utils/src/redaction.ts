export const FILTERED_VALUE = '[Filtered]';

export interface RedactionOptions {
  transformError?: (error: Error) => unknown;
}

const RESET_LINK_TOKEN_PATTERN = /(\/reset-links\/)[^/?#]+/g;
const SENSITIVE_FRAGMENT_URL_PATTERN =
  /\/(?:reset-links\/[^/?#]+|mot-de-passe\/nouveau)(?:[/?#]|$)/;

function isSensitiveKey(key: string): boolean {
  const segments = key.toLowerCase().split(/[-_]/);
  const normalized = segments.join('');
  return (
    ['password', 'token', 'authorization', 'cookie', 'resetlink'].some(
      (fragment) => normalized.includes(fragment)
    ) ||
    normalized.includes('secret') ||
    segments.includes('key') ||
    key.endsWith('Key')
  );
}

export function redactSensitiveUrl(value: string): string {
  const redacted = value.replace(
    RESET_LINK_TOKEN_PATTERN,
    `$1${FILTERED_VALUE}`
  );
  const fragmentIndex = redacted.indexOf('#');
  return SENSITIVE_FRAGMENT_URL_PATTERN.test(value) && fragmentIndex >= 0
    ? redacted.slice(0, fragmentIndex)
    : redacted;
}

export function redactSensitiveData<T>(
  value: T,
  options: RedactionOptions = {}
): T {
  const seen = new WeakMap<object, unknown>();
  const sensitiveObjects = new WeakSet<object>();
  const scanned = new WeakSet<object>();

  function markSensitiveSubtree(current: unknown): void {
    if (current === null || typeof current !== 'object') {
      return;
    }
    if (sensitiveObjects.has(current)) {
      return;
    }
    sensitiveObjects.add(current);
    if (Array.isArray(current)) {
      current.forEach(markSensitiveSubtree);
      return;
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype === Object.prototype || prototype === null) {
      Object.values(current).forEach(markSensitiveSubtree);
    }
  }

  function findSensitiveObjects(current: unknown): void {
    if (current === null || typeof current !== 'object') {
      return;
    }
    if (scanned.has(current)) {
      return;
    }
    scanned.add(current);
    if (Array.isArray(current)) {
      current.forEach(findSensitiveObjects);
      return;
    }
    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      return;
    }
    Object.entries(current).forEach(([entryKey, entryValue]) => {
      if (isSensitiveKey(entryKey)) {
        markSensitiveSubtree(entryValue);
      } else {
        findSensitiveObjects(entryValue);
      }
    });
  }

  findSensitiveObjects(value);

  function redact(current: unknown, key?: string): unknown {
    if (key && isSensitiveKey(key)) {
      return FILTERED_VALUE;
    }
    if (typeof current === 'string') {
      return redactSensitiveUrl(current);
    }
    if (current === null || typeof current !== 'object') {
      return current;
    }
    if (sensitiveObjects.has(current)) {
      return FILTERED_VALUE;
    }
    if (current instanceof Error) {
      return options.transformError?.(current) ?? current;
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
      Object.defineProperty(clone, entryKey, {
        configurable: true,
        enumerable: true,
        value: redact(entryValue, entryKey),
        writable: true
      });
    });
    return clone;
  }

  return redact(value) as T;
}
