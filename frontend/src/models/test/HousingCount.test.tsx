import { displayHousingCount } from '../HousingCount';

describe('HousingCount', () => {
  it('should return a waiting string if the total count is unavailable', () => {
    const actual = displayHousingCount({
      filteredHousingCount: 0,
      filteredOwnerCount: 0,
    });
    expect(actual).toBe('Comptage des logements...');
  });

  it('should return a string indicating a count of zero', () => {
    const actual = displayHousingCount({
      filteredHousingCount: 0,
      filteredOwnerCount: 0,
      totalCount: 0,
    });
    expect(actual).toBe('Aucun logement (aucun propriétaire)');
  });

  it('should return a singular string', () => {
    const actual = displayHousingCount({
      filteredHousingCount: 1,
      filteredOwnerCount: 1,
      totalCount: 1,
    });
    expect(actual).toBe('Un logement (un propriétaire)');
  });

  it('should return a plural string', () => {
    const actual = displayHousingCount({
      filteredHousingCount: 2,
      filteredOwnerCount: 3,
      totalCount: 2,
    });
    expect(actual).toBe('2 logements (3 propriétaires)');
  });

  it('should return a plural string with a filtered count', () => {
    const actual = displayHousingCount({
      filteredHousingCount: 2,
      filteredOwnerCount: 3,
      totalCount: 4,
    });
    expect(actual).toBe(
      '2 logements (3 propriétaires) filtrés sur un total de 4 logements'
    );
  });
});
