import { Array, pipe } from 'effect';

import establishmentRepository from '~/repositories/establishmentRepository';

interface ResolveHousingGeoScopeOptions {
  /** Caller's own perimeter: `effectiveGeoCodes ?? establishment.geoCodes`. */
  ownGeoCodes: string[];
  /** True for ADMIN/VISITOR, who may query another establishment's data. */
  isAdminOrVisitor: boolean;
  /** Establishment(s) requested by the caller; only honored when `isAdminOrVisitor`. */
  establishmentIds?: string[];
  /** EPCI ids to narrow the perimeter to. `[]` narrows to no commune. */
  intercommunalities?: string[];
  /** Explicit communes to narrow the perimeter to. `[]` narrows to no commune. */
  localities?: string[];
}

async function geoCodesOf(establishmentIds: string[]): Promise<string[]> {
  const establishments = await establishmentRepository.find({
    filters: { id: establishmentIds }
  });
  return establishments.flatMap((establishment) => establishment.geoCodes);
}

/**
 * Resolve the commune-level perimeter a housing read or write is scoped to.
 *
 * Centralizes what `list`/`count`/`updateMany` and the group housing actions
 * each used to compute independently, so a fix to one can't drift from the
 * others: the base perimeter is the queried establishment(s)' geo codes
 * (admin/visitor only) or the caller's own perimeter, narrowed by any EPCI
 * filter and then by any explicit commune filter. `undefined` means "no
 * filter"; `[]` is an explicit selection of nothing and must narrow the
 * result to no commune, not be treated as absent.
 */
export async function resolveHousingGeoScope(
  options: ResolveHousingGeoScopeOptions
): Promise<string[]> {
  const [basePerimeter, intercommunalityGeoCodes] = await Promise.all([
    options.isAdminOrVisitor && options.establishmentIds?.length
      ? geoCodesOf(options.establishmentIds)
      : Promise.resolve(options.ownGeoCodes),
    options.intercommunalities !== undefined
      ? geoCodesOf(options.intercommunalities)
      : Promise.resolve(null)
  ]);

  return pipe(
    basePerimeter,
    (geoCodes) =>
      intercommunalityGeoCodes !== null
        ? Array.intersection(geoCodes, intercommunalityGeoCodes)
        : geoCodes,
    (geoCodes) =>
      options.localities !== undefined
        ? Array.intersection(geoCodes, options.localities)
        : geoCodes
  );
}
