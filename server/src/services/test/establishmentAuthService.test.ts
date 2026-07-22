import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import userEstablishmentRepository, {
  UsersEstablishments
} from '~/repositories/user-establishment-repository';
import userPerimeterRepository, {
  UserPerimeters
} from '~/repositories/userPerimeterRepository';
import userRepository, {
  toUserDBO,
  Users
} from '~/repositories/userRepository';
import type {
  CeremaGroup,
  CeremaPerimeter,
  CeremaUser
} from '~/services/ceremaService/consultUserService';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

const mocks = vi.hoisted(() => ({
  consultUsers: vi.fn()
}));

vi.mock('~/services/ceremaService', () => ({
  default: { consultUsers: mocks.consultUsers }
}));

import { refreshAuthorizedEstablishments } from '../establishmentAuthService';

const lovacGroup: CeremaGroup = {
  id_groupe: 1,
  nom: 'LOVAC',
  structure: 1,
  perimetre: 0,
  niveau_acces: 'lovac',
  df_ano: false,
  df_non_ano: false,
  lovac: true
};

const unrelatedCommunePerimeter: CeremaPerimeter = {
  perimetre_id: 2,
  origine: 'test',
  fr_entiere: false,
  reg: [],
  dep: [],
  epci: [],
  comm: ['99999']
};

function genCeremaUser(
  overrides: Partial<CeremaUser> &
    Pick<CeremaUser, 'email' | 'establishmentSiren'>
): CeremaUser {
  return {
    hasAccount: true,
    hasCommitment: true,
    cguValide: '2026-03-11T12:36:01.255000+01:00',
    userExpiresAt: null,
    structureAccessExpiresAt: '2028-01-15T09:16:31+01:00',
    structureHasLovac: true,
    groupHasLovac: true,
    group: lovacGroup,
    ...overrides
  };
}

describe('refreshAuthorizedEstablishments', () => {
  const establishment = genEstablishmentApi('75056');
  const secondEstablishment = genEstablishmentApi('69123');
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert([
      formatEstablishmentApi(establishment),
      formatEstablishmentApi(secondEstablishment)
    ]);
    await Users().insert(toUserDBO(user));
  });

  beforeEach(async () => {
    mocks.consultUsers.mockReset();
    await UsersEstablishments().where({ user_id: user.id }).delete();
    await UserPerimeters().where({ user_id: user.id }).delete();
    await Users().where({ id: user.id }).update({
      suspended_at: null,
      suspended_cause: null
    });
  });

  afterAll(async () => {
    await UsersEstablishments().where({ user_id: user.id }).delete();
    await UserPerimeters().where({ user_id: user.id }).delete();
    await Users().where({ id: user.id }).delete();
    await Establishments()
      .whereIn('id', [establishment.id, secondEstablishment.id])
      .delete();
  });

  it('synchronizes valid establishments and the current perimeter', async () => {
    mocks.consultUsers.mockResolvedValue([
      {
        email: user.email,
        establishmentSiren: establishment.siren,
        hasAccount: true,
        hasCommitment: true,
        group: {
          id_groupe: 1,
          nom: 'LOVAC',
          structure: 1,
          perimetre: 1,
          niveau_acces: 'lovac',
          df_ano: false,
          df_non_ano: false,
          lovac: true
        },
        perimeter: {
          perimetre_id: 1,
          origine: 'test',
          fr_entiere: false,
          reg: ['11'],
          dep: ['75'],
          epci: [],
          comm: ['75056']
        }
      }
    ]);

    await refreshAuthorizedEstablishments(user);

    await expect(
      userEstablishmentRepository.getAuthorizedEstablishments(user.id)
    ).resolves.toEqual([
      {
        establishmentId: establishment.id,
        establishmentSiren: establishment.siren,
        hasCommitment: true
      }
    ]);
    await expect(
      userPerimeterRepository.get(user.id, establishment.id)
    ).resolves.toMatchObject({
      userId: user.id,
      establishmentId: establishment.id,
      geoCodes: ['75056'],
      departments: ['75'],
      regions: ['11'],
      epci: [],
      frEntiere: false
    });
  });

  it('saves a distinct perimeter for every authorized establishment', async () => {
    mocks.consultUsers.mockResolvedValue([
      {
        email: user.email,
        establishmentSiren: establishment.siren,
        hasAccount: true,
        hasCommitment: true,
        group: {
          id_groupe: 1,
          nom: 'LOVAC',
          structure: 1,
          perimetre: 1,
          niveau_acces: 'lovac',
          df_ano: false,
          df_non_ano: false,
          lovac: true
        },
        perimeter: {
          perimetre_id: 1,
          origine: 'test',
          fr_entiere: false,
          reg: ['11'],
          dep: ['75'],
          epci: [],
          comm: ['75056']
        }
      },
      {
        email: user.email,
        establishmentSiren: secondEstablishment.siren,
        hasAccount: true,
        hasCommitment: true,
        group: {
          id_groupe: 2,
          nom: 'LOVAC',
          structure: 2,
          perimetre: 2,
          niveau_acces: 'lovac',
          df_ano: false,
          df_non_ano: false,
          lovac: true
        },
        perimeter: {
          perimetre_id: 2,
          origine: 'test',
          fr_entiere: false,
          reg: ['84'],
          dep: ['69'],
          epci: [],
          comm: ['69123']
        }
      }
    ]);

    await refreshAuthorizedEstablishments(user);

    await expect(
      userPerimeterRepository.get(user.id, secondEstablishment.id)
    ).resolves.toMatchObject({
      userId: user.id,
      establishmentId: secondEstablishment.id,
      geoCodes: ['69123'],
      departments: ['69'],
      regions: ['84'],
      epci: [],
      frEntiere: false
    });
  });

  it('suspends a user whose current establishment loses LOVAC access', async () => {
    mocks.consultUsers.mockResolvedValue([
      {
        email: user.email,
        establishmentSiren: establishment.siren,
        hasAccount: true,
        hasCommitment: true,
        group: {
          id_groupe: 1,
          nom: 'Data Foncier only',
          structure: 1,
          perimetre: 0,
          niveau_acces: 'df',
          df_ano: true,
          df_non_ano: false,
          lovac: false
        }
      }
    ]);

    await refreshAuthorizedEstablishments(user);

    await expect(userRepository.get(user.id)).resolves.toMatchObject({
      suspendedCause: 'niveau_acces_invalide'
    });
  });

  it('replaces an obsolete CGU suspension with the current Cerema structure expiration', async () => {
    const suspendedUser = {
      ...user,
      suspendedAt: new Date('2026-02-15T00:00:00.000Z').toJSON(),
      suspendedCause: 'cgu vides'
    };
    await Users().where({ id: user.id }).update({
      suspended_at: suspendedUser.suspendedAt,
      suspended_cause: suspendedUser.suspendedCause
    });
    mocks.consultUsers.mockResolvedValue([
      genCeremaUser({
        email: user.email,
        establishmentSiren: establishment.siren,
        hasCommitment: false,
        structureAccessExpiresAt: '2025-01-15T09:16:31+01:00',
        structureHasLovac: false
      })
    ]);

    await refreshAuthorizedEstablishments(suspendedUser);

    await expect(userRepository.get(user.id)).resolves.toMatchObject({
      suspendedAt: expect.any(String),
      suspendedCause: 'droits structure expires'
    });
  });

  it('clears an obsolete Cerema suspension when current rights are valid', async () => {
    const suspendedUser = {
      ...user,
      suspendedAt: new Date('2026-02-15T00:00:00.000Z').toJSON(),
      suspendedCause: 'cgu vides'
    };
    await Users().where({ id: user.id }).update({
      suspended_at: suspendedUser.suspendedAt,
      suspended_cause: suspendedUser.suspendedCause
    });
    mocks.consultUsers.mockResolvedValue([
      genCeremaUser({
        email: user.email,
        establishmentSiren: establishment.siren
      })
    ]);

    await refreshAuthorizedEstablishments(suspendedUser);

    await expect(userRepository.get(user.id)).resolves.toMatchObject({
      suspendedAt: null,
      suspendedCause: null
    });
  });

  it('preserves a manual suspension while clearing an obsolete Cerema cause', async () => {
    const suspendedUser = {
      ...user,
      suspendedAt: new Date('2026-02-15T00:00:00.000Z').toJSON(),
      suspendedCause: 'suspension manuelle, cgu vides'
    };
    await Users().where({ id: user.id }).update({
      suspended_at: suspendedUser.suspendedAt,
      suspended_cause: suspendedUser.suspendedCause
    });
    mocks.consultUsers.mockResolvedValue([
      genCeremaUser({
        email: user.email,
        establishmentSiren: establishment.siren
      })
    ]);

    await refreshAuthorizedEstablishments(suspendedUser);

    await expect(userRepository.get(user.id)).resolves.toMatchObject({
      suspendedAt: expect.any(String),
      suspendedCause: 'suspension manuelle'
    });
  });

  it('does not apply access errors from another establishment to the selected one', async () => {
    mocks.consultUsers.mockResolvedValue([
      genCeremaUser({
        email: user.email,
        establishmentSiren: establishment.siren
      }),
      genCeremaUser({
        email: user.email,
        establishmentSiren: secondEstablishment.siren,
        perimeter: unrelatedCommunePerimeter
      })
    ]);

    await refreshAuthorizedEstablishments(user, {
      establishmentId: establishment.id
    });

    await expect(userRepository.get(user.id)).resolves.toMatchObject({
      suspendedAt: null,
      suspendedCause: null
    });
  });

  it('updates the selected suspension without replacing links when another establishment is incomplete', async () => {
    const suspendedUser = {
      ...user,
      suspendedAt: new Date('2026-02-15T00:00:00.000Z').toJSON(),
      suspendedCause: 'cgu vides'
    };
    await Users().where({ id: user.id }).update({
      suspended_at: suspendedUser.suspendedAt,
      suspended_cause: suspendedUser.suspendedCause
    });
    await UsersEstablishments().insert({
      user_id: user.id,
      establishment_id: secondEstablishment.id,
      establishment_siren: secondEstablishment.siren,
      has_commitment: true
    });
    mocks.consultUsers.mockResolvedValue([
      genCeremaUser({
        email: user.email,
        establishmentSiren: establishment.siren
      }),
      genCeremaUser({
        email: user.email,
        establishmentSiren: secondEstablishment.siren,
        group: undefined,
        groupHasLovac: undefined,
        groupFetchFailed: true
      })
    ]);

    await refreshAuthorizedEstablishments(suspendedUser, {
      establishmentId: establishment.id
    });

    await expect(userRepository.get(user.id)).resolves.toMatchObject({
      suspendedAt: null,
      suspendedCause: null
    });
    await expect(
      userEstablishmentRepository.getAuthorizedEstablishments(user.id)
    ).resolves.toEqual([
      {
        establishmentId: secondEstablishment.id,
        establishmentSiren: secondEstablishment.siren,
        hasCommitment: true
      }
    ]);
  });

  it('rejects an authoritative refresh when the Cerema response is partial', async () => {
    mocks.consultUsers.mockResolvedValue([
      genCeremaUser({
        email: user.email,
        establishmentSiren: establishment.siren
      }),
      genCeremaUser({
        email: user.email,
        establishmentSiren: secondEstablishment.siren,
        group: undefined,
        groupHasLovac: undefined,
        groupFetchFailed: true
      })
    ]);

    await expect(
      refreshAuthorizedEstablishments(user, {
        authoritative: true,
        establishmentId: establishment.id
      })
    ).rejects.toThrow('Portail DF is temporarily unavailable.');
  });

  it('keeps the current suspension when selected Cerema details are incomplete', async () => {
    const suspendedUser = {
      ...user,
      suspendedAt: new Date('2026-02-15T00:00:00.000Z').toJSON(),
      suspendedCause: 'cgu vides'
    };
    await Users().where({ id: user.id }).update({
      suspended_at: suspendedUser.suspendedAt,
      suspended_cause: suspendedUser.suspendedCause
    });
    mocks.consultUsers.mockResolvedValue([
      genCeremaUser({
        email: user.email,
        establishmentSiren: establishment.siren,
        group: undefined,
        groupHasLovac: undefined,
        groupFetchFailed: true
      })
    ]);

    await refreshAuthorizedEstablishments(suspendedUser, {
      establishmentId: establishment.id
    });

    await expect(userRepository.get(user.id)).resolves.toMatchObject({
      suspendedAt: suspendedUser.suspendedAt,
      suspendedCause: suspendedUser.suspendedCause
    });
  });
});
