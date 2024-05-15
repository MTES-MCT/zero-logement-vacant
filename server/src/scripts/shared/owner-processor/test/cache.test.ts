import cache from '../cache';

describe('Owner cache', () => {
  const a = 'A';
  const b = 'B';

  beforeEach(() => {
    cache.clear();
  });

  describe('has', () => {
    it('should return true if A and B have already been compared', () => {
      cache.add(a, b);

      const actual = cache.has(a, b);

      expect(actual).toBeTrue();
    });

    it('should return true whatever the order', () => {
      cache.add(a, b);

      const actual = cache.has(b, a);

      expect(actual).toBeTrue();
    });

    it('should return false if A and B have not been compared yet', () => {
      const actual = cache.has(a, b);

      expect(actual).toBeFalse();
    });
  });
});
