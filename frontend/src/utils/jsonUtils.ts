/**
 * Arrays in GeoJSON features get stringified for some reason.
 * We need to parse them back to array.
 * @param obj
 */
export function deserialize(
  obj: Record<string, unknown>
): Record<string, unknown> {
  return Object.keys(obj).reduce<Record<string, unknown>>((acc, key) => {
    return {
      ...acc,
      [key]: parse(obj[key]),
    };
  }, {});
}

function parse(value: unknown): any {
  if (typeof value === 'string') {
    if (value.startsWith('[') || value.startsWith('{')) {
      return JSON.parse(value);
    }
  }
  return value;
}
