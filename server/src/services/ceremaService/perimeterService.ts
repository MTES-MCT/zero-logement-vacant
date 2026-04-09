import { CeremaPerimeter, CeremaGroup, CeremaUser } from './consultUserService';
import { logger } from '~/infra/logger';
import {
  getDepartmentFromCommune,
  geoAPI
} from '~/services/administrative-division/geo-api';

/**
 * Result of access rights verification
 */
export interface AccessRightsResult {
  isValid: boolean;
  errors: AccessRightsError[];
}

export type AccessRightsError =
  | 'niveau_acces_invalide'
  | 'perimetre_invalide'
  | 'groupe_manquant';

/**
 * Check if a commune is within the given perimeter
 */
async function isCommuneInPerimeter(
  communeCode: string,
  perimeter: CeremaPerimeter
): Promise<boolean> {
  // France entière = access to everything
  if (perimeter.fr_entiere) {
    return true;
  }

  // Direct commune match
  if (perimeter.comm.includes(communeCode)) {
    return true;
  }

  // Department match
  const departmentCode = getDepartmentFromCommune(communeCode);
  if (departmentCode && perimeter.dep.includes(departmentCode)) {
    return true;
  }

  // Region match — lazy fetch via GeoAPI, memoized per department code
  const department = await geoAPI.getDepartment(departmentCode);
  if (department?.region && perimeter.reg.includes(department.region)) {
    return true;
  }

  return false;
}

/**
 * Check if user has valid LOVAC access level
 */
function hasValidLovacAccessLevel(group: CeremaGroup): boolean {
  // Check niveau_acces field - must be 'lovac' for full access
  if (group.niveau_acces === 'lovac') {
    return true;
  }

  // Also check the lovac boolean flag
  if (group.lovac === true) {
    return true;
  }

  return false;
}

/**
 * Verify if user has valid access rights for the given establishment geo codes
 *
 * @param ceremaUser - User info from Portail DF
 * @param establishmentGeoCodes - All communes of the establishment
 * @param establishmentSiren - Optional SIREN of the establishment (for EPCI perimeter check)
 */
export async function verifyAccessRights(
  ceremaUser: CeremaUser,
  establishmentGeoCodes: string[],
  establishmentSiren?: string
): Promise<AccessRightsResult> {
  const errors: AccessRightsError[] = [];

  // Check if group info is available
  if (!ceremaUser.group) {
    logger.warn('User has no group info from Portail DF', {
      email: ceremaUser.email
    });
    // No group info means we cannot verify access level or perimeter
    // This is a soft error - we allow access but log it
    return { isValid: true, errors: [] };
  }

  // Check LOVAC access level
  if (!hasValidLovacAccessLevel(ceremaUser.group)) {
    logger.warn('User does not have LOVAC access level', {
      email: ceremaUser.email,
      niveauAcces: ceremaUser.group.niveau_acces,
      lovac: ceremaUser.group.lovac
    });
    errors.push('niveau_acces_invalide');
  }

  // Check perimeter
  if (ceremaUser.perimeter) {
    // Check if user has any commune/department/region restrictions
    const hasGeoCodesRestriction = ceremaUser.perimeter.comm && ceremaUser.perimeter.comm.length > 0;
    const hasDepartmentsRestriction = ceremaUser.perimeter.dep && ceremaUser.perimeter.dep.length > 0;
    const hasRegionsRestriction = ceremaUser.perimeter.reg && ceremaUser.perimeter.reg.length > 0;
    const hasGeoRestriction = hasGeoCodesRestriction || hasDepartmentsRestriction || hasRegionsRestriction;

    // Check EPCI perimeter - if establishment SIREN matches an EPCI in perimeter
    // AND no more restrictive geo constraints, access is valid
    // Note: Convert SIREN to string for comparison since epci array contains strings
    const sirenStr = String(establishmentSiren);
    const hasEpciAccess =
      !hasGeoRestriction &&
      establishmentSiren &&
      ceremaUser.perimeter.epci &&
      ceremaUser.perimeter.epci.length > 0 &&
      ceremaUser.perimeter.epci.includes(sirenStr);

    if (hasEpciAccess) {
      // EPCI match with no geo restriction - user has access to entire establishment
      logger.debug('User has EPCI perimeter matching establishment (no geo restriction)', {
        email: ceremaUser.email,
        establishmentSiren,
        perimeterEpci: ceremaUser.perimeter.epci
      });
    } else {
      // Check if at least one establishment commune is within the perimeter
      const hasValidPerimeter = (
        await Promise.all(
          establishmentGeoCodes.map((geoCode) =>
            isCommuneInPerimeter(geoCode, ceremaUser.perimeter!)
          )
        )
      ).some(Boolean);

      if (!hasValidPerimeter) {
        logger.warn('User perimeter does not cover establishment', {
          email: ceremaUser.email,
          establishmentSiren,
          establishmentGeoCodes: establishmentGeoCodes.slice(0, 10),
          perimeter: ceremaUser.perimeter,
          hasGeoRestriction
        });
        errors.push('perimetre_invalide');
      }
    }
  } else if (ceremaUser.group.perimetre) {
    // Group has a perimeter ID but we couldn't fetch it
    logger.warn('Could not fetch user perimeter from Portail DF', {
      email: ceremaUser.email,
      perimetreId: ceremaUser.group.perimetre
    });
    // This is a soft error - we allow access but log it
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Convert access rights errors to a suspension cause string
 */
export function accessErrorsToSuspensionCause(errors: AccessRightsError[]): string {
  return errors.join(', ');
}
