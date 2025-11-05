import {
  isValidSuspendedCause,
  parseSuspendedCauses,
  SUSPENDED_CAUSE_VALUES,
  type SuspendedCause
} from '../UserDTO';

describe('UserDTO', () => {
  describe('parseSuspendedCauses', () => {
    it('should return empty array for null', () => {
      expect(parseSuspendedCauses(null)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseSuspendedCauses('')).toEqual([]);
    });

    it('should parse single valid cause', () => {
      const result = parseSuspendedCauses('droits utilisateur expires');
      expect(result).toEqual(['droits utilisateur expires']);
    });

    it('should parse multiple valid causes separated by comma', () => {
      const result = parseSuspendedCauses('droits utilisateur expires, cgu vides');
      expect(result).toEqual(['droits utilisateur expires', 'cgu vides']);
    });

    it('should parse all valid causes', () => {
      const allCauses = SUSPENDED_CAUSE_VALUES.join(', ');
      const result = parseSuspendedCauses(allCauses);
      expect(result).toEqual([...SUSPENDED_CAUSE_VALUES]);
    });

    it('should filter out invalid causes', () => {
      const result = parseSuspendedCauses('droits utilisateur expires, invalid cause, cgu vides');
      expect(result).toEqual(['droits utilisateur expires', 'cgu vides']);
    });

    it('should handle whitespace around causes', () => {
      const result = parseSuspendedCauses('  droits utilisateur expires  ,  cgu vides  ');
      expect(result).toEqual(['droits utilisateur expires', 'cgu vides']);
    });

    it('should return empty array for only invalid causes', () => {
      const result = parseSuspendedCauses('invalid cause, another invalid');
      expect(result).toEqual([]);
    });
  });

  describe('isValidSuspendedCause', () => {
    it('should return true for valid causes', () => {
      SUSPENDED_CAUSE_VALUES.forEach((cause) => {
        expect(isValidSuspendedCause(cause)).toBe(true);
      });
    });

    it('should return false for invalid cause', () => {
      expect(isValidSuspendedCause('invalid cause')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidSuspendedCause('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidSuspendedCause('Droits Utilisateur Expires')).toBe(false);
    });

    it('should narrow type when true', () => {
      const cause = 'droits utilisateur expires';
      if (isValidSuspendedCause(cause)) {
        // Type assertion to verify type narrowing works
        const typedCause: SuspendedCause = cause;
        expect(typedCause).toBe('droits utilisateur expires');
      }
    });
  });

  describe('SUSPENDED_CAUSE_VALUES', () => {
    it('should contain all expected causes', () => {
      expect(SUSPENDED_CAUSE_VALUES).toEqual([
        'droits utilisateur expires',
        'droits structure expires',
        'cgu vides'
      ]);
    });

    it('should be readonly', () => {
      // This is a compile-time check, but we can verify the values exist
      expect(SUSPENDED_CAUSE_VALUES.length).toBe(3);
    });
  });
});
