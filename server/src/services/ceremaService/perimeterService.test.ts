import nock from 'nock';
import { afterEach, describe, expect, it } from 'vitest';
import type { CeremaGroup, CeremaPerimeter, CeremaUser } from './consultUserService';
import { verifyAccessRights } from './perimeterService';

const GEO_API = 'https://geo.api.gouv.fr';

afterEach(() => {
  nock.cleanAll();
});

const lovacGroup: CeremaGroup = {
  id_groupe: 1,
  nom: 'LOVAC',
  structure: 1,
  perimetre: 1,
  niveau_acces: 'lovac',
  df_ano: false,
  df_non_ano: false,
  lovac: true
};

const nonLovacGroup: CeremaGroup = {
  ...lovacGroup,
  niveau_acces: 'df',
  lovac: false
};

const frEntierePerimeter: CeremaPerimeter = {
  perimetre_id: 1,
  origine: 'test',
  fr_entiere: true,
  reg: [],
  dep: [],
  epci: [],
  comm: []
};

const parisDeptPerimeter: CeremaPerimeter = {
  perimetre_id: 2,
  origine: 'test',
  fr_entiere: false,
  reg: [],
  dep: ['75'],
  epci: [],
  comm: []
};

const parisCommPerimeter: CeremaPerimeter = {
  perimetre_id: 3,
  origine: 'test',
  fr_entiere: false,
  reg: [],
  dep: [],
  epci: [],
  comm: ['75056']
};

const ileDeFrameRegionPerimeter: CeremaPerimeter = {
  perimetre_id: 4,
  origine: 'test',
  fr_entiere: false,
  reg: ['11'],
  dep: [],
  epci: [],
  comm: []
};

const epciPerimeter: CeremaPerimeter = {
  perimetre_id: 5,
  origine: 'test',
  fr_entiere: false,
  reg: [],
  dep: [],
  epci: ['123456789'],
  comm: []
};

function makeCeremaUser(
  overrides: Partial<CeremaUser> = {}
): CeremaUser {
  return {
    email: 'user@test.fr',
    establishmentSiren: '123456789',
    hasAccount: true,
    hasCommitment: true,
    group: lovacGroup,
    perimeter: frEntierePerimeter,
    ...overrides
  };
}

describe('verifyAccessRights', () => {
  describe('group validation', () => {
    it('returns valid when user has no group info', async () => {
      const user = makeCeremaUser({ group: undefined });

      const result = await verifyAccessRights(user, ['75056']);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns invalid with niveau_acces_invalide when user lacks LOVAC access', async () => {
      const user = makeCeremaUser({ group: nonLovacGroup, perimeter: frEntierePerimeter });

      const result = await verifyAccessRights(user, ['75056']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('niveau_acces_invalide');
    });
  });

  describe('perimeter validation', () => {
    it('returns valid when fr_entiere is set', async () => {
      const user = makeCeremaUser({ perimeter: frEntierePerimeter });

      const result = await verifyAccessRights(user, ['75056', '13055']);

      expect(result.isValid).toBe(true);
    });

    it('returns valid when commune matches', async () => {
      const user = makeCeremaUser({ perimeter: parisCommPerimeter });

      const result = await verifyAccessRights(user, ['75056', '13055']);

      expect(result.isValid).toBe(true);
    });

    it('returns valid when department matches at least one geoCode', async () => {
      const user = makeCeremaUser({ perimeter: parisDeptPerimeter });

      const result = await verifyAccessRights(user, ['75056', '13055']);

      expect(result.isValid).toBe(true);
    });

    it('returns valid when region matches at least one geoCode (fetches via GeoAPI)', async () => {
      nock(GEO_API)
        .get('/departements/75')
        .query({ fields: 'codeRegion' })
        .reply(200, { code: '75', nom: 'Paris', codeRegion: '11' });
      const user = makeCeremaUser({ perimeter: ileDeFrameRegionPerimeter });

      const result = await verifyAccessRights(user, ['75056']);

      expect(result.isValid).toBe(true);
    });

    it('returns invalid with perimetre_invalide when no geoCode is in perimeter', async () => {
      nock(GEO_API)
        .get('/departements/13')
        .query({ fields: 'codeRegion' })
        .reply(200, { code: '13', nom: 'Bouches-du-Rhône', codeRegion: '93' });
      const user = makeCeremaUser({ perimeter: ileDeFrameRegionPerimeter });

      const result = await verifyAccessRights(user, ['13055']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('perimetre_invalide');
    });

    it('returns valid when EPCI matches establishment siren and no geo restriction', async () => {
      const user = makeCeremaUser({ perimeter: epciPerimeter });

      const result = await verifyAccessRights(user, ['75056', '13055'], '123456789');

      expect(result.isValid).toBe(true);
    });

    it('returns valid when user has no perimeter', async () => {
      const user = makeCeremaUser({ perimeter: undefined });

      const result = await verifyAccessRights(user, ['75056']);

      expect(result.isValid).toBe(true);
    });
  });
});
