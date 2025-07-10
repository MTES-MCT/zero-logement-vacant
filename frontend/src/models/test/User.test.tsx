import { createdBy, formatAuthor } from '../User';

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
        email: 'john.doe@example.com',
        firstName: null,
        lastName: null
      });

      expect(actual).toBe('john.doe@example.com');
    });
  });

  describe('formatAuthor', () => {
    it('should return the user first and last name only', () => {
      const user = {
        email: 'test@test.test',
        firstName: 'John',
        lastName: 'Doe'
      };
      const establishment = null;

      const actual = formatAuthor(user, establishment);

      expect(actual).toBe('John Doe');
    });

    it('should return the email if the first or last name is not defined', () => {
      const user = {
        email: 'test@test.test',
        firstName: null,
        lastName: null
      };
      const establishment = null;

      const actual = formatAuthor(user, establishment);

      expect(actual).toBe('test@test.test');
    });

    it('should append the establishment name if available', () => {
      const user = {
        email: 'test@test.test',
        firstName: null,
        lastName: null
      };
      const establishment = {
        name: 'Eurométropole de Strasbourg'
      };

      const actual = formatAuthor(user, establishment);

      expect(actual).toBe('test@test.test (Eurométropole de Strasbourg)');
    });
  });
});
