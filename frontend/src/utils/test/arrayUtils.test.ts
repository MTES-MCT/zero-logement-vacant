import { Identifiable } from '../../models/Identifiable';
import {
  exclude,
  include,
  includeExclude,
  includeExcludeWith,
  includeWith
} from '../arrayUtils';

describe('Array utils', () => {
  const items: Identifiable[] = [{ id: 'A', }, { id: 'B', }, { id: 'C', }];

  describe('#include', () => {
    it('should include only the given ids', () => {
      const actual = include(['B'])(items);

      expect(actual).toStrictEqual([{ id: 'B', }]);
    });

    it('should return everything if ids is empty', () => {
      const actual = include([])(items);

      expect(actual).toStrictEqual(items);
    });
  });

  describe('#includeWith', () => {
    it('should include only the given items using the given function', () => {
      const actual = includeWith<Identifiable, 'id'>(
        ['B'],
        (item) => item.id
      )(items);

      expect(actual).toStrictEqual([{ id: 'B', }]);
    });
  });

  describe('#exclude', () => {
    it('should exclude only the given ids', () => {
      const actual = exclude(['C'])(items);

      expect(actual).toStrictEqual([{ id: 'A', }, { id: 'B', }]);
    });
  });

  describe('#excludeWith', () => {
    it('should exclude only the given items using the given function', () => {
      const actual = includeWith<Identifiable, 'id'>(
        ['A'],
        (item) => item.id
      )(items);

      expect(actual).toStrictEqual([{ id: 'A', }]);
    });
  });

  describe('#includeExclude', () => {
    it('should include and exclude only the given ids', () => {
      const actual = includeExclude(['A', 'C'], ['C'])(items);

      expect(actual).toStrictEqual([{ id: 'A', }]);
    });
  });

  describe('#includeExcludeWith', () => {
    it('should include and exclude only the given items using the given function', () => {
      const actual = includeExcludeWith<Identifiable, 'id'>(
        ['A', 'C'],
        ['C'],
        (item) => item.id
      )(items);

      expect(actual).toStrictEqual([{ id: 'A', }]);
    });
  });
});
