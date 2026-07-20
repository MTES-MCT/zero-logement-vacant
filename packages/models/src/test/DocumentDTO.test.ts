import { canWriteDocument } from '../DocumentDTO';
import { UserRole } from '../UserRole';

describe('DocumentDTO', () => {
  describe('canWriteDocument', () => {
    it('should allow an admin regardless of establishment', () => {
      expect(canWriteDocument(UserRole.ADMIN, false)).toBe(true);
      expect(canWriteDocument(UserRole.ADMIN, true)).toBe(true);
    });

    it('should allow a usual user only in the same establishment', () => {
      expect(canWriteDocument(UserRole.USUAL, true)).toBe(true);
      expect(canWriteDocument(UserRole.USUAL, false)).toBe(false);
    });

    it('should never allow a visitor', () => {
      expect(canWriteDocument(UserRole.VISITOR, true)).toBe(false);
      expect(canWriteDocument(UserRole.VISITOR, false)).toBe(false);
    });
  });
});
