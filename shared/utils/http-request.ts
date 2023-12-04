import fp from 'lodash/fp';

export function createQuery(
  params: Record<string, string | null | undefined>
): string {
  if (fp.isEmpty(params)) {
    return '';
  }

  return fp.pipe(
    // Faster than fp.omitBy
    fp.pickBy((value) => !fp.isNil(value)),
    (params: Record<string, string>) => new URLSearchParams(params),
    (params) => (params.toString().length > 0 ? `?${params}` : '')
  )(params);
}
