import { phone, PHONE_REGEXP } from '../phone';

describe('Phone schema', () => {
  describe('PHONE_REGEXP', () => {
    const validPhones = [
      '+33123456789',
      '+33612345678',
      '+33712345678',
      '0123456789',
      '0612345678',
      '0712345678',
      '0987654321'
    ];

    const invalidPhones = [
      '+33',
      '+330123456789', // 0 after +33 is not allowed
      '+3312345678', // too short
      '+331234567890', // too long
      '123456789', // missing prefix
      '01234567890', // too long
      '012345678', // too short
      '+34123456789', // wrong country code
      'abcdefghij', // letters
      '+33 12 34 56 78 9', // spaces
      '+33-123-456-789' // dashes
    ];

    it.each(validPhones)('should match valid phone: %s', (phone) => {
      expect(PHONE_REGEXP.test(phone)).toBe(true);
    });

    it.each(invalidPhones)('should not match invalid phone: %s', (phone) => {
      expect(PHONE_REGEXP.test(phone)).toBe(false);
    });
  });

  describe('phone schema', () => {
    it('should validate +33123456789', () => {
      const result = phone.validateSync('+33123456789');
      expect(result).toBe('+33123456789');
    });

    it('should validate 0612345678', () => {
      const result = phone.validateSync('0612345678');
      expect(result).toBe('0612345678');
    });

    it('should trim whitespace', () => {
      const result = phone.validateSync('  +33123456789  ');
      expect(result).toBe('+33123456789');
    });

    it('should allow empty string', () => {
      const result = phone.validateSync('');
      expect(result).toBe('');
    });

    it('should reject invalid phone numbers', () => {
      expect(() => phone.validateSync('+33')).toThrow();
      expect(() => phone.validateSync('123456789')).toThrow();
      expect(() => phone.validateSync('+330123456789')).toThrow();
    });
  });
});
