import nock from 'nock';
import { afterEach, describe, expect, it } from 'vitest';
import { createGeoAPI, getDepartmentFromCommune } from './geo-api';

const GEO_API = 'https://geo.api.gouv.fr';

afterEach(() => {
  nock.cleanAll();
});

describe('getDepartmentFromCommune', () => {
  it('returns first 2 digits for metropolitan France', () => {
    expect(getDepartmentFromCommune('75056')).toBe('75');
    expect(getDepartmentFromCommune('13055')).toBe('13');
    expect(getDepartmentFromCommune('33063')).toBe('33');
  });

  it('returns 3-digit code for DOM-TOM (97x)', () => {
    expect(getDepartmentFromCommune('97105')).toBe('971'); // Guadeloupe
    expect(getDepartmentFromCommune('97209')).toBe('972'); // Martinique
    expect(getDepartmentFromCommune('97302')).toBe('973'); // Guyane
    expect(getDepartmentFromCommune('97411')).toBe('974'); // La Réunion
    expect(getDepartmentFromCommune('97608')).toBe('976'); // Mayotte
  });

  it('returns 2-char code for Corsica', () => {
    expect(getDepartmentFromCommune('2A004')).toBe('2A');
    expect(getDepartmentFromCommune('2B033')).toBe('2B');
  });

  it('returns empty string for invalid input', () => {
    expect(getDepartmentFromCommune('')).toBe('');
    expect(getDepartmentFromCommune('7')).toBe('');
  });
});

describe('createGeoAPI', () => {
  it('returns the department with its region code', async () => {
    nock(GEO_API)
      .get('/departements/75')
      .query({ fields: 'codeRegion' })
      .reply(200, { code: '75', nom: 'Paris', codeRegion: '11' });

    const api = createGeoAPI();
    const dept = await api.getDepartment('75');

    expect(dept).toMatchObject({ code: '75', region: '11' });
    expect(nock.isDone()).toBe(true);
  });

  it('returns null when the API returns a 404', async () => {
    nock(GEO_API)
      .get('/departements/99')
      .query({ fields: 'codeRegion' })
      .reply(404);

    const api = createGeoAPI();
    const dept = await api.getDepartment('99');

    expect(dept).toBeNull();
  });

  it('makes only one HTTP request for repeated calls with the same code', async () => {
    // nock intercepts exactly once by default — if a second HTTP request were made,
    // nock would throw "Nock: No match for request" and the test would fail.
    nock(GEO_API)
      .get('/departements/75')
      .query({ fields: 'codeRegion' })
      .once()
      .reply(200, { code: '75', nom: 'Paris', codeRegion: '11' });

    const api = createGeoAPI();
    const first = await api.getDepartment('75');
    const second = await api.getDepartment('75'); // served from memoize cache

    expect(first).toMatchObject({ code: '75', region: '11' });
    expect(second).toMatchObject({ code: '75', region: '11' });
    expect(nock.isDone()).toBe(true); // only one HTTP call was made
  });

  it('makes one HTTP request per unique department code', async () => {
    nock(GEO_API)
      .get('/departements/75')
      .query({ fields: 'codeRegion' })
      .once()
      .reply(200, { code: '75', nom: 'Paris', codeRegion: '11' });
    nock(GEO_API)
      .get('/departements/69')
      .query({ fields: 'codeRegion' })
      .once()
      .reply(200, { code: '69', nom: 'Rhône', codeRegion: '84' });

    const api = createGeoAPI();
    await api.getDepartment('75');
    await api.getDepartment('69');
    await api.getDepartment('75'); // cached

    expect(nock.isDone()).toBe(true); // exactly 2 HTTP calls total
  });
});
