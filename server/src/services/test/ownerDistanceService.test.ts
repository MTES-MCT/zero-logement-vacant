import { describe, it, expect } from 'vitest';

import {
  haversineDistance,
  getRegionFromDept,
  getRegionFromPostalCode,
  calculateGeographicClassification,
  calculateDistance
} from '../ownerDistanceService';
import { AddressKinds } from '@zerologementvacant/models';
import { AddressApi } from '~/models/AddressApi';

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
    it('should return same-commune for identical postal codes', () => {
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

    it('should calculate both distance and classification', () => {
      const ownerAddress = createMockAddress('75001', 48.8566, 2.3522);
      const housingAddress = createMockAddress('69001', 45.764, 4.8357);

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('metropolitan');
      expect(result.absoluteDistance).not.toBeNull();
      expect(result.absoluteDistance!).toBeGreaterThan(380000);
    });

    it('should return null distance if owner has no coordinates', () => {
      const ownerAddress = createMockAddress('75001');
      const housingAddress = createMockAddress('69001', 45.764, 4.8357);

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('metropolitan');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should return null distance if housing has no coordinates', () => {
      const ownerAddress = createMockAddress('75001', 48.8566, 2.3522);
      const housingAddress = createMockAddress('69001');

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('metropolitan');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should handle null addresses', () => {
      const result = calculateDistance(null, null);

      expect(result.relativeLocation).toBe('other');
      expect(result.absoluteDistance).toBeNull();
    });

    it('should return same-commune for same postal code', () => {
      const ownerAddress = createMockAddress('75001', 48.86, 2.35);
      const housingAddress = createMockAddress('75001', 48.86, 2.35);

      const result = calculateDistance(ownerAddress, housingAddress);

      expect(result.relativeLocation).toBe('same-commune');
      expect(result.absoluteDistance).toBe(0);
    });
  });
});
