import { readFileSync } from 'node:fs';

import { AddressKinds } from '@zerologementvacant/models';
import type { RelativeLocation } from '@zerologementvacant/models';
import { describe, it, expect } from 'vitest';

import { AddressApi } from '~/models/AddressApi';

import {
  haversineDistance,
  getRegionFromDept,
  getRegionFromPostalCode,
  calculateGeographicClassification,
  calculateDistance
} from '../ownerDistanceService';

interface DistanceContractAddress {
  banId?: string;
  label: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
}

interface DistanceContractCase {
  name: string;
  owner: DistanceContractAddress;
  housing: DistanceContractAddress;
  expectedRelativeLocation: RelativeLocation;
  expectedDatabaseValue: number;
}

const distanceContract = JSON.parse(
  readFileSync(
    new URL('../../test/owner-distance-contract.json', import.meta.url),
    'utf8'
  )
) as { cases: DistanceContractCase[] };

function contractAddress(
  address: DistanceContractAddress,
  addressKind: AddressKinds
): AddressApi {
  return {
    refId: `${addressKind.toLowerCase()}-id`,
    addressKind,
    city: '',
    ...address
  };
}

describe('Owner Distance Service', () => {
  describe('haversineDistance', () => {
    it('should return 0 for same location', () => {
      const distance = haversineDistance(48.8566, 2.3522, 48.8566, 2.3522);
      expect(distance).toBe(0);
    });

    it('should calculate Paris to Lyon distance (~390-400km)', () => {
      // Paris: 48.8566, 2.3522
      // Lyon: 45.7640, 4.8357
      const distance = haversineDistance(48.8566, 2.3522, 45.764, 4.8357);
      expect(distance).not.toBeNull();
      expect(distance!).toBeGreaterThan(380000);
      expect(distance!).toBeLessThan(410000);
    });

    it('should calculate Paris to Marseille distance (~660-680km)', () => {
      // Paris: 48.8566, 2.3522
      // Marseille: 43.2965, 5.3698
      const distance = haversineDistance(48.8566, 2.3522, 43.2965, 5.3698);
      expect(distance).not.toBeNull();
      expect(distance!).toBeGreaterThan(650000);
      expect(distance!).toBeLessThan(690000);
    });

    it('should return null for invalid latitude (>90)', () => {
      const distance = haversineDistance(91, 2.3522, 48.8566, 2.3522);
      expect(distance).toBeNull();
    });

    it('should return null for invalid latitude (<-90)', () => {
      const distance = haversineDistance(-91, 2.3522, 48.8566, 2.3522);
      expect(distance).toBeNull();
    });

    it('should return null for invalid longitude (>180)', () => {
      const distance = haversineDistance(48.8566, 181, 48.8566, 2.3522);
      expect(distance).toBeNull();
    });

    it('should return null for invalid longitude (<-180)', () => {
      const distance = haversineDistance(48.8566, -181, 48.8566, 2.3522);
      expect(distance).toBeNull();
    });
  });

  describe('getRegionFromDept', () => {
    it('should return region 11 for Paris (75)', () => {
      expect(getRegionFromDept('75')).toBe('11');
    });

    it('should return region 84 for Lyon (69)', () => {
      expect(getRegionFromDept('69')).toBe('84');
    });

    it('should return region 93 for Marseille (13)', () => {
      expect(getRegionFromDept('13')).toBe('93');
    });

    it('should return region 94 for Corsica (2A)', () => {
      expect(getRegionFromDept('2A')).toBe('94');
    });

    it('should return region 94 for Corsica (2B)', () => {
      expect(getRegionFromDept('2B')).toBe('94');
    });

    it('should return region 01 for Guadeloupe (971)', () => {
      expect(getRegionFromDept('971')).toBe('01');
    });

    it('should return region 02 for Martinique (972)', () => {
      expect(getRegionFromDept('972')).toBe('02');
    });

    it('should return region 04 for Réunion (974)', () => {
      expect(getRegionFromDept('974')).toBe('04');
    });

    it('should return null for unknown department', () => {
      expect(getRegionFromDept('99')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getRegionFromDept('')).toBeNull();
    });
  });

  describe('getRegionFromPostalCode', () => {
    it('should return region 11 for Paris postal codes', () => {
      expect(getRegionFromPostalCode('75001')).toBe('11');
      expect(getRegionFromPostalCode('75015')).toBe('11');
    });

    it('should handle DOM-TOM postal codes (3-digit dept)', () => {
      expect(getRegionFromPostalCode('97100')).toBe('01'); // Guadeloupe
      expect(getRegionFromPostalCode('97200')).toBe('02'); // Martinique
      expect(getRegionFromPostalCode('97400')).toBe('04'); // Réunion
    });

    it('should return null for undefined', () => {
      expect(getRegionFromPostalCode(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getRegionFromPostalCode('')).toBeNull();
    });

    it('should return null for too short postal code', () => {
      expect(getRegionFromPostalCode('7')).toBeNull();
    });
  });

  describe('calculateGeographicClassification', () => {
    it('should return same-address for same banId', () => {
      const result = calculateGeographicClassification('75001', '75001', {
        ownerBanId: 'ban-123',
        housingBanId: 'ban-123'
      });
      expect(result).toBe('same-address');
    });

    it('should return same-commune for very close distance without matching banIds', () => {
      const result = calculateGeographicClassification('75001', '75001', {
        absoluteDistance: 30
      });
      expect(result).toBe('same-commune');
    });

    it('should return same-commune for identical postal codes but distance >= 50m', () => {
      const result = calculateGeographicClassification('75001', '75001', {
        absoluteDistance: 100
      });
      expect(result).toBe('same-commune');
    });

    it('should return same-commune for identical postal codes (no options)', () => {
      const result = calculateGeographicClassification('75001', '75001');
      expect(result).toBe('same-commune');
    });

    it('should return same-department for same department, different commune', () => {
      const result = calculateGeographicClassification('75001', '75015');
      expect(result).toBe('same-department');
    });

    it('should return same-region for same region, different department', () => {
      // 75 (Paris) and 78 (Yvelines) are both in Ile-de-France (region 11)
      const result = calculateGeographicClassification('75001', '78000');
      expect(result).toBe('same-region');
    });

    it('should return metropolitan for different regions, owner in metro France', () => {
      // 75 (Paris, region 11) and 69 (Lyon, region 84)
      const result = calculateGeographicClassification('75001', '69001');
      expect(result).toBe('metropolitan');
    });

    it('should return overseas for owner in DOM-TOM', () => {
      // 97100 is Guadeloupe (region 01, overseas)
      const result = calculateGeographicClassification('97100', '75001');
      expect(result).toBe('overseas');
    });

    it('should return other for missing owner postal code', () => {
      const result = calculateGeographicClassification(undefined, '78000');
      expect(result).toBe('other');
    });

    it('should return other for missing housing postal code', () => {
      const result = calculateGeographicClassification('75001', undefined);
      expect(result).toBe('other');
    });

    it('should return other for both missing postal codes', () => {
      const result = calculateGeographicClassification(undefined, undefined);
      expect(result).toBe('other');
    });
  });

  describe('calculateDistance', () => {
    const createMockAddress = (
      postalCode: string,
      latitude?: number,
      longitude?: number
    ): AddressApi => ({
      refId: 'test-id',
      addressKind: AddressKinds.Owner,
      label: 'Test Address',
      postalCode,
      city: 'Test City',
      latitude,
      longitude
    });

    it.each(distanceContract.cases)(
      'follows the shared location contract: $name',
      ({ owner, housing, expectedRelativeLocation }) => {
        const result = calculateDistance(
          contractAddress(owner, AddressKinds.Owner),
          contractAddress(housing, AddressKinds.Housing)
        );

        expect(result.relativeLocation).toBe(expectedRelativeLocation);
      }
    );

    it('should calculate both distance and classification', () => {
      const ownerAddress = createMockAddress('75001', 48.8566, 2.3522);
      const housingAddress = createMockAddress('69001', 45.764, 4.8357);

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('metropolitan');
      expect(result.absoluteDistance).not.toBeNull();
      expect(result.absoluteDistance!).toBeGreaterThan(380000);
    });

    it('should leave owner unclassified when only its banId is available', () => {
      const ownerAddress: AddressApi = {
        ...createMockAddress('75001'),
        banId: 'owner-ban-id'
      };
      const housingAddress = createMockAddress('69001', 45.764, 4.8357);

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('other');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should leave an unverified foreign postal address unclassified', () => {
      const ownerAddress: AddressApi = {
        ...createMockAddress('10115'),
        label: '10115 Berlin'
      };
      const housingAddress: AddressApi = {
        ...createMockAddress('75015', 48.8422, 2.2996),
        banId: 'housing-ban-id'
      };

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('other');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should leave unverified French-looking address text unclassified', () => {
      const ownerAddress: AddressApi = {
        ...createMockAddress('75001'),
        label: '1 rue de la Paix 75001 Paris'
      };
      const housingAddress: AddressApi = {
        ...createMockAddress('69001', 45.764, 4.8357),
        banId: 'housing-ban-id'
      };

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('other');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should leave housing unclassified when only its banId is available', () => {
      const ownerAddress = createMockAddress('75001', 48.8566, 2.3522);
      const housingAddress: AddressApi = {
        ...createMockAddress('69001'),
        banId: 'housing-ban-id'
      };

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('other');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should handle null addresses', () => {
      const result = calculateDistance(null, null);

      expect(result.relativeLocation).toBe('other');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should return same-commune for identical coordinates without matching banIds', () => {
      const ownerAddress = createMockAddress('75001', 48.8566, 2.3522);
      const housingAddress = createMockAddress('75001', 48.8566, 2.3522);

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('same-commune');
      expect(result.absoluteDistance).toBe(0);
    });

    it('should return same-commune for same postal code but different location (>= 50m)', () => {
      // Two addresses in the same commune but different streets (~500m apart)
      const ownerAddress = createMockAddress('75001', 48.8566, 2.3522);
      const housingAddress = createMockAddress('75001', 48.861, 2.347);

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('same-commune');
      expect(result.absoluteDistance).not.toBeNull();
      expect(result.absoluteDistance!).toBeGreaterThanOrEqual(50);
    });

    it('should return same-address for same banId', () => {
      const ownerAddress: AddressApi = {
        ...createMockAddress('75001', 48.8566, 2.3522),
        banId: 'same-ban-id'
      };
      const housingAddress: AddressApi = {
        ...createMockAddress('75001', 48.861, 2.347),
        banId: 'same-ban-id'
      };

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('same-address');
    });

    it('should return same-address for same non-empty banId without coordinates', () => {
      const ownerAddress: AddressApi = {
        ...createMockAddress('75001'),
        banId: 'same-ban-id'
      };
      const housingAddress: AddressApi = {
        ...createMockAddress('75001'),
        banId: 'same-ban-id'
      };

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('same-address');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should not return same-address for nearby addresses with distinct banIds', () => {
      const ownerAddress: AddressApi = {
        ...createMockAddress('75001', 48.8566, 2.3522),
        banId: 'owner-ban-id'
      };
      const housingAddress: AddressApi = {
        ...createMockAddress('75001', 48.8567, 2.3523),
        banId: 'housing-ban-id'
      };

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('same-commune');
      expect(result.absoluteDistance).not.toBeNull();
      expect(result.absoluteDistance!).toBeLessThan(50);
    });

    it('should leave distinct banIds without coordinates unclassified', () => {
      const ownerAddress: AddressApi = {
        ...createMockAddress('75001'),
        banId: 'owner-ban-id'
      };
      const housingAddress: AddressApi = {
        ...createMockAddress('75001'),
        banId: 'housing-ban-id'
      };

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('other');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should leave addresses with invalid coordinates unclassified', () => {
      const ownerAddress = createMockAddress('75001', 91, 2.3522);
      const housingAddress = createMockAddress('69001', 45.764, 4.8357);

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('other');
      expect(result.absoluteDistance).toBeNull();
    });
  });
});
