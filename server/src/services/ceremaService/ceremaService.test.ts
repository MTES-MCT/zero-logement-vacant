import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import config from '~/infra/config';
import type { CeremaGroup, CeremaPerimeter } from './consultUserService';
import { CeremaService } from './ceremaService';

const BASE_URL = config.cerema.api;
const TOKEN = 'test-token';

const lovacGroup: CeremaGroup = {
  id_groupe: 1,
  nom: 'Test Group',
  structure: 10,
  perimetre: 20,
  niveau_acces: 'lovac',
  df_ano: false,
  df_non_ano: false,
  lovac: true
};

const frEntierePerimeter: CeremaPerimeter = {
  perimetre_id: 20,
  origine: 'test',
  fr_entiere: true,
  reg: [],
  dep: [],
  epci: [],
  comm: []
};

const futureDate = new Date(Date.now() + 86_400_000).toISOString();
const pastDate = new Date(Date.now() - 86_400_000).toISOString();

const structure = { siret: '12345678900001', acces_lovac: futureDate };

function interceptAuth() {
  nock(BASE_URL).post('/api/api-token-auth/').reply(200, { token: TOKEN });
}

function interceptUsers(email: string, users: object[]) {
  nock(BASE_URL)
    .get('/api/utilisateurs')
    .query({ email })
    .reply(200, { results: users });
}

function interceptStructure(id: number, body: object, status = 200) {
  nock(BASE_URL).get(`/api/structures/${id}`).reply(status, body);
}

function interceptGroup(id: number, body: object) {
  nock(BASE_URL).get(`/api/groupes/${id}/`).reply(200, body);
}

function interceptPerimeter(id: number, body: object) {
  nock(BASE_URL).get(`/api/perimetres/${id}/`).reply(200, body);
}

beforeEach(() => {
  nock.cleanAll();
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe('CeremaService', () => {
  describe('consultUsers', () => {
    it('returns [] when auth fails', async () => {
      nock(BASE_URL).post('/api/api-token-auth/').reply(401, 'Unauthorized');
      const service = new CeremaService();

      const result = await service.consultUsers('user@test.fr');

      expect(result).toEqual([]);
    });

    it('returns [] when users API returns non-200', async () => {
      interceptAuth();
      nock(BASE_URL)
        .get('/api/utilisateurs')
        .query({ email: 'user@test.fr' })
        .reply(403, { detail: 'Forbidden' });
      const service = new CeremaService();

      const result = await service.consultUsers('user@test.fr');

      expect(result).toEqual([]);
    });

    it('returns [] when structure API returns non-200', async () => {
      interceptAuth();
      interceptUsers('user@test.fr', [
        { email: 'user@test.fr', structure: 10, groupe: 0 }
      ]);
      interceptStructure(10, { detail: 'Not found' }, 404);
      const service = new CeremaService();

      const result = await service.consultUsers('user@test.fr');

      expect(result).toEqual([]);
    });

    it('returns user with hasCommitment false when user has no group', async () => {
      interceptAuth();
      interceptUsers('user@test.fr', [
        { email: 'user@test.fr', structure: 10, groupe: 0 }
      ]);
      interceptStructure(10, structure);
      const service = new CeremaService();

      const result = await service.consultUsers('user@test.fr');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        email: 'user@test.fr',
        establishmentSiren: '123456789',
        hasCommitment: false,
        group: undefined,
        perimeter: undefined
      });
    });

    it('returns user with hasCommitment true when structure has valid LOVAC and group has LOVAC access', async () => {
      interceptAuth();
      interceptUsers('user@test.fr', [
        { email: 'user@test.fr', structure: 10, groupe: 1 }
      ]);
      interceptStructure(10, structure);
      interceptGroup(1, lovacGroup);
      interceptPerimeter(20, frEntierePerimeter);
      const service = new CeremaService();

      const result = await service.consultUsers('user@test.fr');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        email: 'user@test.fr',
        establishmentSiren: '123456789',
        hasCommitment: true,
        group: lovacGroup,
        perimeter: frEntierePerimeter
      });
    });

    it('returns user with hasCommitment false when structure has expired LOVAC', async () => {
      interceptAuth();
      interceptUsers('user@test.fr', [
        { email: 'user@test.fr', structure: 10, groupe: 1 }
      ]);
      interceptStructure(10, { ...structure, acces_lovac: pastDate });
      interceptGroup(1, lovacGroup);
      interceptPerimeter(20, frEntierePerimeter);
      const service = new CeremaService();

      const result = await service.consultUsers('user@test.fr');

      expect(result[0].hasCommitment).toBe(false);
    });

    it('returns user with hasCommitment false when group lacks LOVAC access', async () => {
      const nonLovacGroup: CeremaGroup = {
        ...lovacGroup,
        niveau_acces: 'df',
        lovac: false
      };
      interceptAuth();
      interceptUsers('user@test.fr', [
        { email: 'user@test.fr', structure: 10, groupe: 1 }
      ]);
      interceptStructure(10, structure);
      interceptGroup(1, nonLovacGroup);
      interceptPerimeter(20, frEntierePerimeter);
      const service = new CeremaService();

      const result = await service.consultUsers('user@test.fr');

      expect(result[0].hasCommitment).toBe(false);
    });

    it('returns user with group but no perimeter when group has no perimetre', async () => {
      const groupWithoutPerimeter: CeremaGroup = { ...lovacGroup, perimetre: 0 };
      interceptAuth();
      interceptUsers('user@test.fr', [
        { email: 'user@test.fr', structure: 10, groupe: 1 }
      ]);
      interceptStructure(10, structure);
      interceptGroup(1, groupWithoutPerimeter);
      const service = new CeremaService();

      const result = await service.consultUsers('user@test.fr');

      expect(result[0].group).toEqual(groupWithoutPerimeter);
      expect(result[0].perimeter).toBeUndefined();
    });

    it('maps multiple users from results', async () => {
      const users = [
        { email: 'user1@test.fr', structure: 10, groupe: 0 },
        { email: 'user2@test.fr', structure: 11, groupe: 0 }
      ];
      interceptAuth();
      interceptUsers('user@test.fr', users);
      interceptStructure(10, structure);
      interceptStructure(11, { siret: '98765432100001', acces_lovac: futureDate });
      const service = new CeremaService();

      const result = await service.consultUsers('user@test.fr');

      expect(result).toHaveLength(2);
      expect(result.map((user) => user.email)).toEqual([
        'user1@test.fr',
        'user2@test.fr'
      ]);
    });
  });
});
