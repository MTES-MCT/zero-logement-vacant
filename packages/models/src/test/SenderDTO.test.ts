import { isEmpty, SignatoryDTO } from '../SenderDTO';

describe('SenderDTO', () => {
  describe('isEmpty', () => {
    it('should return true if all fields are empty', () => {
      const signatory: SignatoryDTO = {
        firstName: null,
        lastName: null,
        role: null,
        file: null
      };

      const actual = isEmpty(signatory);

      expect(actual).toBeTrue();
    });

    it('should return false if one of them is not empty', () => {
      const signatory: SignatoryDTO = {
        firstName: 'John',
        lastName: null,
        role: null,
        file: null
      };

      const actual = isEmpty(signatory);

      expect(actual).toBeFalse();
    });
  });
});
