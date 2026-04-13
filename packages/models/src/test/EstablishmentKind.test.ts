import { Comparison } from '@zerologementvacant/utils';
import { byKind, byKindDesc, EstablishmentKind } from '../EstablishmentKind';

describe('EstablishmentKind', () => {
  describe('byKindDesc', () => {
    it('ranks broader scope (REG) before narrower scope (COM)', () => {
      expect(byKindDesc('REG', 'COM')).toBe(Comparison.B_GT_A);
      expect(byKindDesc('COM', 'REG')).toBe(Comparison.A_GT_B);
    });

    it('returns equal for same kind', () => {
      expect(byKindDesc('DEP', 'DEP')).toBe(Comparison.A_EQ_B);
    });

    it.each<[EstablishmentKind, EstablishmentKind]>([
      ['REG', 'TOM'],
      ['TOM', 'DEP'],
      ['DEP', 'METRO'],
      ['METRO', 'CU'],
      ['CU', 'CA'],
      ['CA', 'CC'],
      ['CC', 'EPT'],
      ['EPT', 'COM'],
      ['COM', 'COM-TOM'],
      ['COM-TOM', 'ARR']
    ])('ranks %s before %s in descending order', (broader, narrower) => {
      expect(byKindDesc(broader, narrower)).toBe(Comparison.B_GT_A);
    });
  });

  describe('byKind', () => {
    it('is the reverse of byKindDesc', () => {
      expect(byKind('REG', 'COM')).toBe(Comparison.A_GT_B);
      expect(byKind('COM', 'REG')).toBe(Comparison.B_GT_A);
    });

    it('returns equal for same kind', () => {
      expect(byKind('DEP', 'DEP')).toBe(Comparison.A_EQ_B);
    });

    it.each<[EstablishmentKind, EstablishmentKind]>([
      ['REG', 'TOM'],
      ['TOM', 'DEP'],
      ['DEP', 'METRO'],
      ['METRO', 'CU'],
      ['CU', 'CA'],
      ['CA', 'CC'],
      ['CC', 'EPT'],
      ['EPT', 'COM'],
      ['COM', 'COM-TOM'],
      ['COM-TOM', 'ARR']
    ])('ranks %s after %s (reversed)', (broader, narrower) => {
      expect(byKind(broader, narrower)).toBe(Comparison.A_GT_B);
    });
  });
});
