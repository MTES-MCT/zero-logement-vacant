import nock from 'nock';
import { afterEach, describe, expect, it } from 'vitest';
import {
  filterGeoCodesByPerimeter,
  hasEpciAccess,
  hasGeoRestriction,
  isCommuneInPerimeter,
  PerimeterShape
} from './UserPerimeterApi';

const GEO_API = 'https://geo.api.gouv.fr';

afterEach(() => {
  nock.cleanAll();
});

const emptyPerimeter: PerimeterShape = {
  frEntiere: false,
  geoCodes: [],
  departments: [],
  regions: [],
  epci: []
};

describe('hasGeoRestriction', () => {
  it('returns false when all arrays are empty', () => {
    const perimeter = emptyPerimeter;

    const result = hasGeoRestriction(perimeter);

    expect(result).toBe(false);
  });

  it('returns true when geoCodes is non-empty', () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, geoCodes: ['75056'] };

    const result = hasGeoRestriction(perimeter);

    expect(result).toBe(true);
  });

  it('returns true when departments is non-empty', () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, departments: ['75'] };

    const result = hasGeoRestriction(perimeter);

    expect(result).toBe(true);
  });

  it('returns true when regions is non-empty', () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, regions: ['11'] };

    const result = hasGeoRestriction(perimeter);

    expect(result).toBe(true);
  });
});

describe('hasEpciAccess', () => {
  it('returns true when no geo restriction and EPCI includes the siren', () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, epci: ['123456789'] };

    const result = hasEpciAccess(perimeter, '123456789');

    expect(result).toBe(true);
  });

  it('returns false when geo restriction exists even if EPCI matches', () => {
    const perimeter: PerimeterShape = {
      ...emptyPerimeter,
      departments: ['75'],
      epci: ['123456789']
    };

    const result = hasEpciAccess(perimeter, '123456789');

    expect(result).toBe(false);
  });

  it('returns false when no siren provided', () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, epci: ['123456789'] };

    const result = hasEpciAccess(perimeter);

    expect(result).toBe(false);
  });

  it('returns false when EPCI array is empty', () => {
    const result = hasEpciAccess(emptyPerimeter, '123456789');

    expect(result).toBe(false);
  });

  it('returns false when EPCI does not include the siren', () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, epci: ['999999999'] };

    const result = hasEpciAccess(perimeter, '123456789');

    expect(result).toBe(false);
  });
});

describe('isCommuneInPerimeter', () => {
  it('returns true when frEntiere is set', async () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, frEntiere: true };

    const result = await isCommuneInPerimeter('75056', perimeter);

    expect(result).toBe(true);
  });

  it('returns true when commune is in geoCodes', async () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, geoCodes: ['75056'] };

    const result = await isCommuneInPerimeter('75056', perimeter);

    expect(result).toBe(true);
  });

  it('returns true when department matches', async () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, departments: ['75'] };

    const result = await isCommuneInPerimeter('75056', perimeter);

    expect(result).toBe(true);
  });

  it('returns true when region matches (fetches via GeoAPI)', async () => {
    nock(GEO_API)
      .get('/departements/75')
      .query({ fields: 'codeRegion' })
      .reply(200, { code: '75', nom: 'Paris', codeRegion: '11' });
    const perimeter: PerimeterShape = { ...emptyPerimeter, regions: ['11'] };

    const result = await isCommuneInPerimeter('75056', perimeter);

    expect(result).toBe(true);
  });

  it('returns false when nothing matches', async () => {
    nock(GEO_API)
      .get('/departements/75')
      .query({ fields: 'codeRegion' })
      .reply(200, { code: '75', nom: 'Paris', codeRegion: '11' });
    const perimeter: PerimeterShape = { ...emptyPerimeter, regions: ['84'] };

    const result = await isCommuneInPerimeter('75056', perimeter);

    expect(result).toBe(false);
  });

  it('returns false when GeoAPI fails for region check', async () => {
    nock(GEO_API)
      .get('/departements/13')
      .query({ fields: 'codeRegion' })
      .reply(500);
    const perimeter: PerimeterShape = { ...emptyPerimeter, regions: ['93'] };

    const result = await isCommuneInPerimeter('13055', perimeter);

    expect(result).toBe(false);
  });
});

describe('filterGeoCodesByPerimeter', () => {
  it('returns undefined when perimeter is null', async () => {
    const result = await filterGeoCodesByPerimeter(['75056'], null);

    expect(result).toBeUndefined();
  });

  it('returns undefined when frEntiere is set', async () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, frEntiere: true };

    const result = await filterGeoCodesByPerimeter(['75056'], perimeter);

    expect(result).toBeUndefined();
  });

  it('returns undefined when EPCI matches and no geo restriction', async () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, epci: ['123456789'] };

    const result = await filterGeoCodesByPerimeter(
      ['75056', '13055'],
      perimeter,
      '123456789'
    );

    expect(result).toBeUndefined();
  });

  it('returns only matching geoCodes when department perimeter applies', async () => {
    const perimeter: PerimeterShape = { ...emptyPerimeter, departments: ['75'] };

    const result = await filterGeoCodesByPerimeter(['75056', '13055'], perimeter);

    expect(result).toEqual(['75056']);
  });

  it('returns empty array when no geoCode matches', async () => {
    nock(GEO_API)
      .get('/departements/13')
      .query({ fields: 'codeRegion' })
      .reply(200, { code: '13', nom: 'Bouches-du-Rhône', codeRegion: '93' });
    const perimeter: PerimeterShape = { ...emptyPerimeter, regions: ['11'] };

    const result = await filterGeoCodesByPerimeter(['13055'], perimeter);

    expect(result).toEqual([]);
  });

  it('does not bypass with EPCI when geo restriction also exists', async () => {
    const perimeter: PerimeterShape = {
      ...emptyPerimeter,
      departments: ['75'],
      epci: ['123456789']
    };

    const result = await filterGeoCodesByPerimeter(
      ['75056', '13055'],
      perimeter,
      '123456789'
    );

    expect(result).toEqual(['75056']);
  });
});
