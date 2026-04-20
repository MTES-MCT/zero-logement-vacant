import { CeremaPerimeter, CeremaGroup, CeremaUser } from './consultUserService';
import { logger } from '~/infra/logger';
import {
  filterGeoCodesByPerimeter,
  PerimeterShape
} from '~/models/UserPerimeterApi';

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

function toPerimeterShape(perimeter: CeremaPerimeter): PerimeterShape {
  return {
    frEntiere: perimeter.fr_entiere,
    geoCodes: perimeter.comm ?? [],
    departments: perimeter.dep ?? [],
    regions: perimeter.reg ?? [],
    epci: perimeter.epci ?? []
  };
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
    const perimeter = toPerimeterShape(ceremaUser.perimeter);
    const filtered = await filterGeoCodesByPerimeter(
      establishmentGeoCodes,
      perimeter,
      establishmentSiren
    );
    const hasValidPerimeter = filtered === undefined || filtered.length > 0;

    if (!hasValidPerimeter) {
      logger.warn('User perimeter does not cover establishment', {
        email: ceremaUser.email,
        establishmentSiren,
        establishmentGeoCodes: establishmentGeoCodes.slice(0, 10),
        perimeter: ceremaUser.perimeter
      });
      errors.push('perimetre_invalide');
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
