import { createdBy } from '../User';

describe('User', () => {
  describe('createdBy', () => {
    it('should return the first and last name if defined', () => {
      const actual = createdBy({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      });

      expect(actual).toBe('John Doe');
    });

    it('should return the email otherwise', () => {
      const actual = createdBy({
        email: 'john.doe@example.com'
      });

      expect(actual).toBe('john.doe@example.com');
    });
  });
});
