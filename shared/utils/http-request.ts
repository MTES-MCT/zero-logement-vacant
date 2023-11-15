import fp from 'lodash/fp';

export function createQuery(
  params: Record<string, string | null | undefined>
): string {
  return fp.pipe(
    // Faster than fp.omitBy
    fp.pickBy((value) => !fp.isNil(value)),
    (params: Record<string, string>) => new URLSearchParams(params),
    (params) => ([...params.keys()].length > 0 ? `?${params}` : '')
  )(params);
}
