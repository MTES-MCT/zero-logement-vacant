export function split(separator = ',') {
  return (value: unknown): string[] | unknown => {
    return typeof value === 'string' ? value.split(separator) : value;
  };
}

export const commaSeparatedString = split(',');

export function parseNull(value: unknown): string | null | typeof value {
  if (Array.isArray(value)) {
    return value.map((v) => (v === 'null' ? null : v));
  }

  return value;
}
