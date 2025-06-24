import * as yup from 'yup';
import { ObjectShape } from 'yup/lib/object';

import { entriesDeep, keysDeep } from '../useForm.tsx';

describe('useForm', () => {
  describe('keysDeep', () => {
    it('should return the keys of a single-level object', () => {
      const schema: ObjectShape = {
        a: yup.number(),
        b: yup.string()
      };

      const actual = keysDeep(schema);

      expect(actual).toStrictEqual(['a', 'b']);
    });

    it('should return the keys of a multi-level object', () => {
      const schema: ObjectShape = {
        a: yup.number(),
        b: yup.object({
          c: yup.string()
        })
      };

      const actual = keysDeep(schema);

      expect(actual).toStrictEqual(['a', 'b.c']);
    });
  });

  describe('entriesDeep', () => {
    it('should return the entries of a single-level object', () => {
      const record = {
        a: 1,
        b: '2'
      };

      const actual = entriesDeep(record);

      expect(actual).toStrictEqual([
        ['a', record.a],
        ['b', record.b]
      ]);
    });

    it('should return the entries of a multi-level object', () => {
      const record = {
        a: 1,
        b: {
          c: '2'
        }
      };

      const actual = entriesDeep(record);

      expect(actual).toStrictEqual([
        ['a', record.a],
        ['b.c', record.b.c]
      ]);
    });
  });
});
