import { CeremaPerimeter, CeremaGroup, CeremaUser } from './consultUserService';
import { logger } from '~/infra/logger';

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
 * Extract department code from a commune INSEE code
 * INSEE codes are 5 digits: first 2 (or 3 for DOM-TOM) are department code
 * Examples:
 * - 75056 (Paris) -> 75
 * - 13055 (Marseille) -> 13
 * - 97105 (Basse-Terre, Guadeloupe) -> 971
 */
function getDepartmentFromCommune(communeCode: string): string {
  if (!communeCode || communeCode.length < 2) {
    return '';
  }

  // DOM-TOM departments start with 97 and have 3-digit codes
  if (communeCode.startsWith('97')) {
    return communeCode.substring(0, 3);
  }

  // Corsica: 2A and 2B
  if (communeCode.startsWith('2A') || communeCode.startsWith('2B')) {
    return communeCode.substring(0, 2);
  }

  // Metropolitan France: 2-digit department codes
  return communeCode.substring(0, 2);
}

/**
 * Extract region code from a department code
 * This is a simplified mapping - in a real scenario, you might want to use a lookup table
 */
function getRegionFromDepartment(departmentCode: string): string | null {
  // Map of department to region codes
  // Source: https://www.insee.fr/fr/information/2028040
  const departmentToRegion: Record<string, string> = {
    // Auvergne-Rhône-Alpes (84)
    '01': '84', '03': '84', '07': '84', '15': '84', '26': '84', '38': '84',
    '42': '84', '43': '84', '63': '84', '69': '84', '73': '84', '74': '84',
    // Bourgogne-Franche-Comté (27)
    '21': '27', '25': '27', '39': '27', '58': '27', '70': '27', '71': '27',
    '89': '27', '90': '27',
    // Bretagne (53)
    '22': '53', '29': '53', '35': '53', '56': '53',
    // Centre-Val de Loire (24)
    '18': '24', '28': '24', '36': '24', '37': '24', '41': '24', '45': '24',
    // Corse (94)
    '2A': '94', '2B': '94',
    // Grand Est (44)
    '08': '44', '10': '44', '51': '44', '52': '44', '54': '44', '55': '44',
    '57': '44', '67': '44', '68': '44', '88': '44',
    // Hauts-de-France (32)
    '02': '32', '59': '32', '60': '32', '62': '32', '80': '32',
    // Île-de-France (11)
    '75': '11', '77': '11', '78': '11', '91': '11', '92': '11', '93': '11',
    '94': '11', '95': '11',
    // Normandie (28)
    '14': '28', '27': '28', '50': '28', '61': '28', '76': '28',
    // Nouvelle-Aquitaine (75)
    '16': '75', '17': '75', '19': '75', '23': '75', '24': '75', '33': '75',
    '40': '75', '47': '75', '64': '75', '79': '75', '86': '75', '87': '75',
    // Occitanie (76)
    '09': '76', '11': '76', '12': '76', '30': '76', '31': '76', '32': '76',
    '34': '76', '46': '76', '48': '76', '65': '76', '66': '76', '81': '76', '82': '76',
    // Pays de la Loire (52)
    '44': '52', '49': '52', '53': '52', '72': '52', '85': '52',
    // Provence-Alpes-Côte d'Azur (93)
    '04': '93', '05': '93', '06': '93', '13': '93', '83': '93', '84': '93',
    // DOM-TOM
    '971': '01', // Guadeloupe
    '972': '02', // Martinique
    '973': '03', // Guyane
    '974': '04', // La Réunion
    '976': '06', // Mayotte
  };

  return departmentToRegion[departmentCode] || null;
}

/**
 * Check if a commune is within the given perimeter
 */
function isCommuneInPerimeter(
  communeCode: string,
  perimeter: CeremaPerimeter
): boolean {
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

  // Region match
  const regionCode = getRegionFromDepartment(departmentCode);
  if (regionCode && perimeter.reg.includes(regionCode)) {
    return true;
  }

  // EPCI match - EPCI codes in perimeter are SIREN codes (9 digits)
  // We cannot match EPCI directly with commune code without a mapping table
  // For now, we'll skip EPCI matching as it requires additional data
  // The EPCI check will be considered as "not blocking" if other checks pass

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
export function verifyAccessRights(
  ceremaUser: CeremaUser,
  establishmentGeoCodes: string[],
  establishmentSiren?: string
): AccessRightsResult {
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
      const hasValidPerimeter = establishmentGeoCodes.some((geoCode) =>
        isCommuneInPerimeter(geoCode, ceremaUser.perimeter!)
      );

      if (!hasValidPerimeter) {
        logger.warn('User perimeter does not cover establishment', {
          email: ceremaUser.email,
          establishmentSiren,
          establishmentGeoCodes: establishmentGeoCodes.slice(0, 10), // Log first 10 for brevity
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
