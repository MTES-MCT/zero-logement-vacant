import { combineAll, Comparison, DEFAULT_ORDER, Ord } from '../compare';

describe('Compare', () => {
  describe('combineAll', () => {
    interface User {
      name: string;
      age: number;
    }

    const ords: ReadonlyArray<Ord<User>> = [
      (first, second) => DEFAULT_ORDER(first.name, second.name),
      (first, second) => DEFAULT_ORDER(first.age, second.age)
    ];

    it('should return the first order if it returns an inequality', () => {
      const first: User = { name: 'Jean', age: 10 };
      const second: User = { name: 'Michel', age: 10 };

      const actual = combineAll(ords)(first, second);

      expect(actual).toStrictEqual(Comparison.B_GT_A);
    });

    it('should return the second order if the first returns an equality', () => {
      const first: User = { name: 'Jean', age: 10 };
      const second: User = { name: 'Jean', age: 5 };

      const actual = combineAll(ords)(first, second);

      expect(actual).toStrictEqual(Comparison.A_GT_B);
    });
  });
});
