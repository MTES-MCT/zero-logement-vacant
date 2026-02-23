import { AddressKinds, RelativeLocation } from '@zerologementvacant/models';
import { createLogger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import {
  HousingOwners,
  toRelativeLocationDBO
} from '~/repositories/housingOwnerRepository';

const logger = createLogger('ownerDistanceService');

// French department to region mapping (INSEE codes)
// Metropolitan regions: 11, 24, 27, 28, 32, 44, 52, 53, 75, 76, 84, 93, 94
// Overseas regions: 01, 02, 03, 04, 06
const DEPT_TO_REGION: Record<string, string> = {
  '01': '84', '02': '32', '03': '84', '04': '93', '05': '93', '06': '93', '07': '84', '08': '44',
  '09': '76', '10': '44', '11': '76', '12': '76', '13': '93', '14': '28', '15': '84', '16': '75',
  '17': '75', '18': '24', '19': '75', '20': '94', '2A': '94', '2B': '94', '21': '27', '22': '53',
  '23': '75', '24': '75', '25': '27', '26': '84', '27': '28', '28': '24', '29': '53', '30': '76',
  '31': '76', '32': '76', '33': '75', '34': '76', '35': '53', '36': '24', '37': '24', '38': '84',
  '39': '27', '40': '75', '41': '24', '42': '84', '43': '84', '44': '52', '45': '24', '46': '76',
  '47': '75', '48': '76', '49': '52', '50': '28', '51': '44', '52': '44', '53': '52', '54': '44',
  '55': '44', '56': '53', '57': '44', '58': '27', '59': '32', '60': '32', '61': '28', '62': '32',
  '63': '84', '64': '75', '65': '76', '66': '76', '67': '44', '68': '44', '69': '84', '70': '27',
  '71': '27', '72': '52', '73': '84', '74': '84', '75': '11', '76': '28', '77': '11', '78': '11',
  '79': '75', '80': '32', '81': '76', '82': '76', '83': '93', '84': '93', '85': '52', '86': '75',
  '87': '75', '88': '44', '89': '27', '90': '27', '91': '11', '92': '11', '93': '11', '94': '11',
  '95': '11', '971': '01', '972': '02', '973': '03', '974': '04', '976': '06'
};

const METRO_REGIONS = ['11', '24', '27', '28', '32', '44', '52', '53', '75', '76', '84', '93', '94'];
const OVERSEAS_REGIONS = ['01', '02', '03', '04', '06'];

/**
 * Calculate the Haversine distance between two coordinates.
 * @returns Distance in meters, or null if coordinates are invalid
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number | null {
  // Validate coordinates
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    return null;
  }
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    return null;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.sqrt(a));

  return Math.round(R * c);
}

/**
 * Get region code from department code.
 */
export function getRegionFromDept(dept: string): string | null {
  if (!dept) return null;
  return DEPT_TO_REGION[dept] ?? null;
}

/**
 * Get region code from postal code.
 * Handles DOM-TOM (3-digit dept codes) and metropolitan France (2-digit).
 */
export function getRegionFromPostalCode(postalCode: string | undefined): string | null {
  if (!postalCode || postalCode.length < 2) return null;

  // Try 3 digits first for DOM-TOM (971, 972, 973, 974, 976)
  if (postalCode.length >= 3) {
    const dept3 = postalCode.substring(0, 3);
    const region = getRegionFromDept(dept3);
    if (region) return region;
  }

  // Fallback to 2 digits for metropolitan France
  const dept = postalCode.substring(0, 2);
  return getRegionFromDept(dept);
}

// Threshold in meters to consider two addresses as "same address"
const SAME_ADDRESS_THRESHOLD_METERS = 50;

/**
 * Calculate geographic classification between owner and housing.
 *
 * Classifications:
 * - 0 (same-address): Same address (distance < 50m or same banId)
 * - 1 (same-commune): Same postal code
 * - 2 (same-department): Same department (first 2 digits of postal code)
 * - 3 (same-region): Same region
 * - 4 (metropolitan): Different regions, owner in metropolitan France
 * - 5 (overseas): Owner in DOM-TOM
 * - 6 (other): Unknown or incomplete data
 */
export function calculateGeographicClassification(
  ownerPostalCode: string | undefined,
  housingPostalCode: string | undefined,
  options?: {
    absoluteDistance?: number | null;
    ownerBanId?: string;
    housingBanId?: string;
  }
): RelativeLocation {
  // Missing data
  if (!ownerPostalCode || !housingPostalCode) {
    return 'other';
  }

  // Rule 0: Same address (same banId or very close distance)
  if (options?.ownerBanId && options?.housingBanId && options.ownerBanId === options.housingBanId) {
    return 'same-address';
  }
  if (options?.absoluteDistance !== null && options?.absoluteDistance !== undefined && options.absoluteDistance < SAME_ADDRESS_THRESHOLD_METERS) {
    return 'same-address';
  }

  // Rule 1: Same postal code (same commune)
  if (ownerPostalCode === housingPostalCode) {
    return 'same-commune';
  }

  // Rule 2: Same department
  const ownerDept = ownerPostalCode.substring(0, 2);
  const housingDept = housingPostalCode.substring(0, 2);
  if (ownerDept === housingDept) {
    return 'same-department';
  }

  // Rule 3: Same region
  const ownerRegion = getRegionFromPostalCode(ownerPostalCode);
  const housingRegion = getRegionFromPostalCode(housingPostalCode);
  if (ownerRegion && ownerRegion === housingRegion) {
    return 'same-region';
  }

  // Rule 4: Different regions, owner in metropolitan France
  if (ownerRegion && METRO_REGIONS.includes(ownerRegion)) {
    return 'metropolitan';
  }

  // Rule 5: Owner in DOM-TOM
  if (ownerRegion && OVERSEAS_REGIONS.includes(ownerRegion)) {
    return 'overseas';
  }

  // Rule 6: Default (unknown)
  return 'other';
}

export interface DistanceResult {
  relativeLocation: RelativeLocation;
  absoluteDistance: number | null;
}

/**
 * Calculate distance and classification between owner and housing addresses.
 */
export function calculateDistance(
  ownerAddress: AddressApi | null,
  housingAddress: AddressApi | null
): DistanceResult {
  // Calculate absolute distance if both have coordinates
  let absoluteDistance: number | null = null;
  if (
    ownerAddress?.latitude !== null &&
    ownerAddress?.latitude !== undefined &&
    ownerAddress?.longitude !== null &&
    ownerAddress?.longitude !== undefined &&
    housingAddress?.latitude !== null &&
    housingAddress?.latitude !== undefined &&
    housingAddress?.longitude !== null &&
    housingAddress?.longitude !== undefined
  ) {
    absoluteDistance = haversineDistance(
      ownerAddress.latitude,
      ownerAddress.longitude,
      housingAddress.latitude,
      housingAddress.longitude
    );
  }

  // Calculate geographic classification
  const relativeLocation = calculateGeographicClassification(
    ownerAddress?.postalCode,
    housingAddress?.postalCode,
    {
      absoluteDistance,
      ownerBanId: ownerAddress?.banId,
      housingBanId: housingAddress?.banId
    }
  );

  return { relativeLocation, absoluteDistance };
}

/**
 * Update distance values for all housings owned by an owner.
 * Called when an owner's address is updated.
 */
export async function updateOwnerHousingDistances(
  ownerId: string,
  ownerAddress: AddressApi | null
): Promise<number> {
  logger.info('Updating owner-housing distances', { ownerId });

  // Get all housing IDs for this owner
  const housingOwnerRecords = await HousingOwners()
    .select('housing_id', 'housing_geo_code')
    .where('owner_id', ownerId);

  if (housingOwnerRecords.length === 0) {
    logger.debug('No housings found for owner', { ownerId });
    return 0;
  }

  logger.debug(`Found ${housingOwnerRecords.length} housings for owner`, { ownerId });

  let updatedCount = 0;

  for (const record of housingOwnerRecords) {
    try {
      // Get housing BAN address
      const housingAddress = await banAddressesRepository.getByRefId(
        record.housing_id,
        AddressKinds.Housing
      );

      // Calculate distance
      const { relativeLocation, absoluteDistance } = calculateDistance(
        ownerAddress,
        housingAddress
      );

      // Update the owners_housing record
      await HousingOwners()
        .where({
          owner_id: ownerId,
          housing_id: record.housing_id,
          housing_geo_code: record.housing_geo_code
        })
        .update({
          locprop_relative_ban: toRelativeLocationDBO(relativeLocation),
          locprop_distance_ban: absoluteDistance
        });

      updatedCount++;
      logger.debug('Updated distance for housing', {
        ownerId,
        housingId: record.housing_id,
        relativeLocation,
        absoluteDistance
      });
    } catch (error) {
      logger.error('Failed to update distance for housing', {
        ownerId,
        housingId: record.housing_id,
        error
      });
    }
  }

  logger.info(`Updated distances for ${updatedCount}/${housingOwnerRecords.length} housings`, {
    ownerId
  });

  return updatedCount;
}

export default {
  haversineDistance,
  getRegionFromDept,
  getRegionFromPostalCode,
  calculateGeographicClassification,
  calculateDistance,
  updateOwnerHousingDistances
};
