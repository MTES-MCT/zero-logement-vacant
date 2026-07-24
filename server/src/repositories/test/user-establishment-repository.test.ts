import { v4 as uuidv4 } from 'uuid';

import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import userEstablishmentRepository, {
  UsersEstablishments
} from '~/repositories/user-establishment-repository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

describe('user-establishment-repository', () => {
  const establishment = genEstablishmentApi();
  const otherEstablishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, otherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(toUserDBO(user));
  });

  describe('getAuthorizedEstablishments', () => {
    it('should return the establishments authorized for a user, oldest first', async () => {
      const older = new Date('2024-01-01');
      const newer = new Date('2024-06-01');
      await UsersEstablishments().insert([
        {
          user_id: user.id,
          establishment_id: otherEstablishment.id,
          establishment_siren: otherEstablishment.siren,
          has_commitment: true,
          created_at: newer,
          updated_at: newer
        },
        {
          user_id: user.id,
          establishment_id: establishment.id,
          establishment_siren: establishment.siren,
          has_commitment: false,
          created_at: older,
          updated_at: older
        }
      ]);

      const actual =
        await userEstablishmentRepository.getAuthorizedEstablishments(user.id);

      expect(actual).toStrictEqual([
        {
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: false
        },
        {
          establishmentId: otherEstablishment.id,
          establishmentSiren: otherEstablishment.siren,
          hasCommitment: true
        }
      ]);
    });

    it('should return an empty array when the user has none', async () => {
      const actual =
        await userEstablishmentRepository.getAuthorizedEstablishments(uuidv4());
      expect(actual).toStrictEqual([]);
    });
  });

  describe('setAuthorizedEstablishments', () => {
    it('should replace the authorized establishments for a user', async () => {
      const anotherUser = genUserApi(establishment.id);
      await Users().insert(toUserDBO(anotherUser));
      await UsersEstablishments().insert({
        user_id: anotherUser.id,
        establishment_id: establishment.id,
        establishment_siren: establishment.siren,
        has_commitment: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      await userEstablishmentRepository.setAuthorizedEstablishments(
        anotherUser.id,
        [
          {
            establishmentId: otherEstablishment.id,
            establishmentSiren: otherEstablishment.siren,
            hasCommitment: true
          }
        ]
      );

      const rows = await UsersEstablishments().where({
        user_id: anotherUser.id
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        establishment_id: otherEstablishment.id,
        has_commitment: true
      });
    });

    it('should clear all authorized establishments when given an empty array', async () => {
      const anotherUser = genUserApi(establishment.id);
      await Users().insert(toUserDBO(anotherUser));
      await UsersEstablishments().insert({
        user_id: anotherUser.id,
        establishment_id: establishment.id,
        establishment_siren: establishment.siren,
        has_commitment: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      await userEstablishmentRepository.setAuthorizedEstablishments(
        anotherUser.id,
        []
      );

      const rows = await UsersEstablishments().where({
        user_id: anotherUser.id
      });
      expect(rows).toHaveLength(0);
    });
  });

  describe('addAuthorizedEstablishment', () => {
    it('should insert a new authorized establishment', async () => {
      const anotherUser = genUserApi(establishment.id);
      await Users().insert(toUserDBO(anotherUser));

      await userEstablishmentRepository.addAuthorizedEstablishment(
        anotherUser.id,
        {
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: true
        }
      );

      const row = await UsersEstablishments()
        .where({ user_id: anotherUser.id, establishment_id: establishment.id })
        .first();
      expect(row).toMatchObject({ has_commitment: true });
    });

    it('should update has_commitment on conflict instead of duplicating', async () => {
      const anotherUser = genUserApi(establishment.id);
      await Users().insert(toUserDBO(anotherUser));
      await UsersEstablishments().insert({
        user_id: anotherUser.id,
        establishment_id: establishment.id,
        establishment_siren: establishment.siren,
        has_commitment: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      await userEstablishmentRepository.addAuthorizedEstablishment(
        anotherUser.id,
        {
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: true
        }
      );

      const rows = await UsersEstablishments().where({
        user_id: anotherUser.id,
        establishment_id: establishment.id
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].has_commitment).toBe(true);
    });
  });

  describe('hasAccessToEstablishment', () => {
    it('should return true when the user has access', async () => {
      const anotherUser = genUserApi(establishment.id);
      await Users().insert(toUserDBO(anotherUser));
      await UsersEstablishments().insert({
        user_id: anotherUser.id,
        establishment_id: establishment.id,
        establishment_siren: establishment.siren,
        has_commitment: false,
        created_at: new Date(),
        updated_at: new Date()
      });

      const actual = await userEstablishmentRepository.hasAccessToEstablishment(
        anotherUser.id,
        establishment.id
      );
      expect(actual).toBe(true);
    });

    it('should return false when the user has no access', async () => {
      const actual = await userEstablishmentRepository.hasAccessToEstablishment(
        uuidv4(),
        establishment.id
      );
      expect(actual).toBe(false);
    });
  });

  describe('isMultiStructure', () => {
    it('should return true when the user has more than one committed establishment', async () => {
      const anotherUser = genUserApi(establishment.id);
      await Users().insert(toUserDBO(anotherUser));
      await UsersEstablishments().insert([
        {
          user_id: anotherUser.id,
          establishment_id: establishment.id,
          establishment_siren: establishment.siren,
          has_commitment: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          user_id: anotherUser.id,
          establishment_id: otherEstablishment.id,
          establishment_siren: otherEstablishment.siren,
          has_commitment: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const actual = await userEstablishmentRepository.isMultiStructure(
        anotherUser.id
      );
      expect(actual).toBe(true);
    });

    it('should return false when the user has one or zero committed establishments', async () => {
      const anotherUser = genUserApi(establishment.id);
      await Users().insert(toUserDBO(anotherUser));
      await UsersEstablishments().insert({
        user_id: anotherUser.id,
        establishment_id: establishment.id,
        establishment_siren: establishment.siren,
        has_commitment: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      const actual = await userEstablishmentRepository.isMultiStructure(
        anotherUser.id
      );
      expect(actual).toBe(false);
    });
  });
});
