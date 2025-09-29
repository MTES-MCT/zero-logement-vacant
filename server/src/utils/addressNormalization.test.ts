import { normalizeAddressQuery, createArrayAddressSearchCondition } from './addressNormalization';

describe('addressNormalization', () => {
  describe('normalizeAddressQuery', () => {
    it('should normalize avenue to av and vice versa', () => {
      const variations1 = normalizeAddressQuery('avenue de la République');
      expect(variations1).toContain('avenue de la republique');
      expect(variations1).toContain('av de la republique');
      expect(variations1).toContain('ave de la republique');

      const variations2 = normalizeAddressQuery('av Victor Hugo');
      expect(variations2).toContain('av victor hugo');
      expect(variations2).toContain('avenue victor hugo');
    });

    it('should normalize boulevard to bd', () => {
      const variations = normalizeAddressQuery('boulevard Saint-Michel');
      expect(variations).toContain('boulevard saint-michel');
      expect(variations).toContain('bd saint-michel');
      expect(variations).toContain('boul saint-michel');
      expect(variations).toContain('blvd saint-michel');
    });

    it('should normalize place to pl', () => {
      const variations = normalizeAddressQuery('place de la Bastille');
      expect(variations).toContain('place de la bastille');
      expect(variations).toContain('pl de la bastille');
    });

    it('should normalize passage to pass', () => {
      const variations = normalizeAddressQuery('passage des Panoramas');
      expect(variations).toContain('passage des panoramas');
      expect(variations).toContain('pass des panoramas');
      expect(variations).toContain('psg des panoramas');
    });

    it('should handle multiple abbreviations in the same address', () => {
      const variations = normalizeAddressQuery('av du bd Saint-Germain');
      expect(variations.length).toBeGreaterThan(2);
      expect(variations).toContain('avenue du boulevard saint-germain');
      expect(variations).toContain('av du bd saint-germain');
    });

    it('should handle empty or short queries', () => {
      expect(normalizeAddressQuery('')).toEqual(['']);
      expect(normalizeAddressQuery('a')).toEqual(['a']);
      expect(normalizeAddressQuery('av')).toContain('av');
      expect(normalizeAddressQuery('av')).toContain('avenue');
    });

    it('should remove punctuation and normalize spaces', () => {
      const variations = normalizeAddressQuery('avenue  de  la  République,  75011');
      expect(variations.some(v => v.includes('avenue de la republique'))).toBe(true);
    });
  });

  describe('createArrayAddressSearchCondition', () => {
    it('should create SQL condition with parameters for single variation', () => {
      const result = createArrayAddressSearchCondition(
        'housing.address', 
        '%', 
        'rue', 
        'test'
      );

      expect(result.condition).toContain('array_to_string(housing.address');
      expect(result.condition).toContain('upper(unaccent(');
      expect(result.parameters).toHaveProperty('test_0');
      expect(result.parameters.test_0).toBe('rue');
    });

    it('should create SQL condition with multiple variations', () => {
      const result = createArrayAddressSearchCondition(
        'housing.address', 
        '%', 
        'avenue République', 
        'test'
      );

      expect(result.condition).toContain('OR');
      expect(Object.keys(result.parameters).length).toBeGreaterThan(1);
      expect(result.parameters).toHaveProperty('test_0');
      expect(result.parameters).toHaveProperty('test_1');
    });
  });
});

// Exemples d'utilisation pratique
describe('Real world examples', () => {
  it('should handle common French address searches', () => {
    const testCases = [
      { input: 'av des Champs', expectedIncludes: ['avenue des champs'] },
      { input: 'bd Haussmann', expectedIncludes: ['boulevard haussmann'] },
      { input: 'pl Vendôme', expectedIncludes: ['place vendome'] },
      { input: 'pass Brady', expectedIncludes: ['passage brady'] },
      { input: 'ch de la Muette', expectedIncludes: ['chemin de la muette'] },
      { input: 'imp Mozart', expectedIncludes: ['impasse mozart'] }
    ];

    testCases.forEach(({ input, expectedIncludes }) => {
      const variations = normalizeAddressQuery(input);
      expectedIncludes.forEach(expected => {
        expect(variations.some(v => v.includes(expected))).toBe(true);
      });
    });
  });

  it('should improve search for typical address abbreviations', () => {
    const searchTerms = [
      'avenue',
      'av',
      'boulevard', 
      'bd',
      'place',
      'pl',
      'passage',
      'pass'
    ];

    searchTerms.forEach(term => {
      const variations = normalizeAddressQuery(term);
      expect(variations.length).toBeGreaterThan(1);
    });
  });
});
