import {
  getDepartmentFromCommune,
  geoAPI
} from '~/services/administrative-division/geo-api';

/**
 * Minimal perimeter shape shared between CeremaPerimeter and UserPerimeterApi.
 * Use this as the input type for perimeter-checking utilities.
 */
export interface PerimeterShape {
  frEntiere: boolean;
  geoCodes: string[];
  departments: string[];
  regions: string[];
  epci: string[];
}

/**
 * User perimeter from Portail DF
 * Stored in database to filter housings/campaigns/groups by geographic scope
 */
export interface UserPerimeterApi extends PerimeterShape {
  userId: string;
  updatedAt: string;
}

export function hasGeoRestriction(perimeter: PerimeterShape): boolean {
  return (
    perimeter.geoCodes.length > 0 ||
    perimeter.departments.length > 0 ||
    perimeter.regions.length > 0
  );
}

export function hasEpciAccess(
  perimeter: PerimeterShape,
  siren?: string | number
): boolean {
  return (
    !hasGeoRestriction(perimeter) &&
    !!siren &&
    perimeter.epci.length > 0 &&
    perimeter.epci.includes(String(siren))
  );
}

export async function isCommuneInPerimeter(
  communeCode: string,
  perimeter: PerimeterShape
): Promise<boolean> {
  if (perimeter.frEntiere) {
    return true;
  }
  if (perimeter.geoCodes.includes(communeCode)) {
    return true;
  }
  const departmentCode = getDepartmentFromCommune(communeCode);
  if (departmentCode && perimeter.departments.includes(departmentCode)) {
    return true;
  }
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
 * @returns undefined if no restriction applies (no perimeter, fr_entiere=true, or EPCI match),
 *          or an array of filtered geoCodes (may be empty if no intersection)
 */
export async function filterGeoCodesByPerimeter(
  establishmentGeoCodes: string[],
  perimeter: PerimeterShape | null,
  establishmentSiren?: string | number
): Promise<string[] | undefined> {
  if (!perimeter) {
    return undefined;
  }
  if (perimeter.frEntiere) {
    return undefined;
  }
  if (hasEpciAccess(perimeter, establishmentSiren)) {
    return undefined;
  }
  const results = await Promise.all(
    establishmentGeoCodes.map((geoCode) => isCommuneInPerimeter(geoCode, perimeter))
  );
  return establishmentGeoCodes.filter((_, index) => results[index]);
}
