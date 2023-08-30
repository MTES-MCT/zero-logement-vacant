import ownerCache from '../owner-cache';

describe('Owner cache', () => {
  const a = 'A';
  const b = 'B';

  beforeEach(() => {
    ownerCache.clear();
  });

  describe('has', () => {
    it('should return true if A and B have already been compared', () => {
      ownerCache.add(a, b);

      const actual = ownerCache.has(a, b);

      expect(actual).toBeTrue();
    });

    it('should return true whatever the order', () => {
      ownerCache.add(a, b);

      const actual = ownerCache.has(b, a);

      expect(actual).toBeTrue();
    });

    it('should return false if A and B have not been compared yet', () => {
      const actual = ownerCache.has(a, b);

      expect(actual).toBeFalse();
    });
  });
});
