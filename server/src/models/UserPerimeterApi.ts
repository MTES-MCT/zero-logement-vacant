/**
 * User perimeter from Portail DF
 * Stored in database to filter housings/campaigns/groups by geographic scope
 */
export interface UserPerimeterApi {
  userId: string;
  geoCodes: string[];
  departments: string[];
  regions: string[];
  frEntiere: boolean;
  updatedAt: string;
}

/**
 * Check if a commune (by its INSEE code) is within the user's perimeter
 */
export function isCommuneInUserPerimeter(
  communeCode: string,
  perimeter: UserPerimeterApi
): boolean {
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

  // Region match
  const regionCode = getRegionFromDepartment(departmentCode);
  if (regionCode && perimeter.regions.includes(regionCode)) {
    return true;
  }

  return false;
}

/**
 * Extract department code from a commune INSEE code
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
 */
function getRegionFromDepartment(departmentCode: string): string | null {
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
 * Filter establishment geoCodes based on user perimeter.
 * Returns only the geoCodes that are within the user's perimeter.
 *
 * @param establishmentGeoCodes - All geoCodes from the establishment
 * @param perimeter - User's perimeter from Portail DF (or null if not available)
 * @returns Filtered geoCodes that match both establishment and user perimeter
 */
export function filterGeoCodesByPerimeter(
  establishmentGeoCodes: string[],
  perimeter: UserPerimeterApi | null
): string[] {
  // If no perimeter, return all establishment geoCodes (no filtering)
  if (!perimeter) {
    return establishmentGeoCodes;
  }

  // If user has fr_entiere, they can see all establishment geoCodes
  if (perimeter.frEntiere) {
    return establishmentGeoCodes;
  }

  // Filter establishment geoCodes to only those within user's perimeter
  return establishmentGeoCodes.filter((geoCode) =>
    isCommuneInUserPerimeter(geoCode, perimeter)
  );
}
