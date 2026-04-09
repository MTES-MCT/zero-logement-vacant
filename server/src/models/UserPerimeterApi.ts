import {
  getDepartmentFromCommune,
  geoAPI
} from '~/services/administrative-division/geo-api';

/**
 * User perimeter from Portail DF
 * Stored in database to filter housings/campaigns/groups by geographic scope
 */
export interface UserPerimeterApi {
  userId: string;
  geoCodes: string[];
  departments: string[];
  regions: string[];
  epci: string[];  // EPCI SIREN codes (9 chars) - for EPCI-level perimeters
  frEntiere: boolean;
  updatedAt: string;
}

/**
 * Check if a commune (by its INSEE code) is within the user's perimeter
 */
export async function isCommuneInUserPerimeter(
  communeCode: string,
  perimeter: UserPerimeterApi
): Promise<boolean> {
  // France entière = access to everything
  if (perimeter.frEntiere) {
    return true;
  }

  // Direct commune match
  if (perimeter.geoCodes.includes(communeCode)) {
    return true;
  }

  // Department match
  const departmentCode = getDepartmentFromCommune(communeCode);
  if (departmentCode && perimeter.departments.includes(departmentCode)) {
    return true;
  }

  // Region match — lazy fetch via GeoAPI, memoized per department code
  const department = await geoAPI.getDepartment(departmentCode);
  if (department?.region && perimeter.regions.includes(department.region)) {
    return true;
  }

  return false;
}

/**
 * Filter establishment geoCodes based on user perimeter.
 * Returns only the geoCodes that are within the user's perimeter.
 *
 * Priority of perimeter checks:
 * 1. fr_entiere = true → no restriction
 * 2. geoCodes (communes) not empty → filter by communes (most restrictive)
 * 3. departments not empty → filter by departments
 * 4. regions not empty → filter by regions
 * 5. epci matches establishment SIREN → no restriction (full EPCI access)
 *
 * @param establishmentGeoCodes - All geoCodes from the establishment
 * @param perimeter - User's perimeter from Portail DF (or null if not available)
 * @param establishmentSiren - Optional establishment SIREN for EPCI perimeter check
 * @returns undefined if no restriction applies (no perimeter, fr_entiere=true, or EPCI match with no commune restriction),
 *          or an array of filtered geoCodes (may be empty if no intersection)
 */
export async function filterGeoCodesByPerimeter(
  establishmentGeoCodes: string[],
  perimeter: UserPerimeterApi | null,
  establishmentSiren?: string | number
): Promise<string[] | undefined> {
  // If no perimeter, return undefined to indicate no restriction
  if (!perimeter) {
    return undefined;
  }

  // If user has fr_entiere, they can see all establishment geoCodes (no restriction)
  if (perimeter.frEntiere) {
    return undefined;
  }

  // Check if user has any commune/department/region restrictions
  const hasGeoCodesRestriction = perimeter.geoCodes && perimeter.geoCodes.length > 0;
  const hasDepartmentsRestriction = perimeter.departments && perimeter.departments.length > 0;
  const hasRegionsRestriction = perimeter.regions && perimeter.regions.length > 0;
  const hasGeoRestriction = hasGeoCodesRestriction || hasDepartmentsRestriction || hasRegionsRestriction;

  // If user has EPCI perimeter that matches the establishment SIREN,
  // AND no more restrictive geo constraints (communes/departments/regions),
  // they can see all establishment geoCodes (no restriction)
  // Note: Convert SIREN to string for comparison since epci array contains strings
  const sirenStr = String(establishmentSiren);
  if (
    !hasGeoRestriction &&
    establishmentSiren &&
    perimeter.epci &&
    perimeter.epci.length > 0 &&
    perimeter.epci.includes(sirenStr)
  ) {
    return undefined;
  }

  // Filter establishment geoCodes to only those within user's perimeter
  // May return empty array if no geoCodes match (user should see nothing)
  const results = await Promise.all(
    establishmentGeoCodes.map((geoCode) =>
      isCommuneInUserPerimeter(geoCode, perimeter)
    )
  );
  return establishmentGeoCodes.filter((_, index) => results[index]);
}
