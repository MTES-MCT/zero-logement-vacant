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
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

const mocks = vi.hoisted(() => ({
  consultUsers: vi.fn()
}));

vi.mock('~/services/ceremaService', () => ({
  default: { consultUsers: mocks.consultUsers }
}));

import { refreshAuthorizedEstablishments } from './establishmentAuthService';

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
});
