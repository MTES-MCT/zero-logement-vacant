import { v4 as uuidv4 } from 'uuid';

import { kysely } from '~/infra/database/kysely';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { UserApi } from '~/models/UserApi';
import userEstablishmentRepository from '~/repositories/user-establishment-repository';
import { factories } from '~/test/factories';

describe('user-establishment-repository', () => {
  let establishment: EstablishmentApi;
  let otherEstablishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    otherEstablishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('getAuthorizedEstablishments', () => {
    it('should return the establishments authorized for a user, oldest first', async () => {
      const older = new Date('2024-01-01');
      const newer = new Date('2024-06-01');
      await kysely
        .insertInto('usersEstablishments')
        .values([
          {
            userId: user.id,
            establishmentId: otherEstablishment.id,
            establishmentSiren: otherEstablishment.siren,
            hasCommitment: true,
            createdAt: newer,
            updatedAt: newer
          },
          {
            userId: user.id,
            establishmentId: establishment.id,
            establishmentSiren: establishment.siren,
            hasCommitment: false,
            createdAt: older,
            updatedAt: older
          }
        ])
        .execute();

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
      const anotherUser = await factories.user.create({
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: anotherUser.id,
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();

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

      const rows = await kysely
        .selectFrom('usersEstablishments')
        .selectAll('usersEstablishments')
        .where('userId', '=', anotherUser.id)
        .execute();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        establishmentId: otherEstablishment.id,
        hasCommitment: true
      });
    });

    it('should clear all authorized establishments when given an empty array', async () => {
      const anotherUser = await factories.user.create({
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: anotherUser.id,
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();

      await userEstablishmentRepository.setAuthorizedEstablishments(
        anotherUser.id,
        []
      );

      const rows = await kysely
        .selectFrom('usersEstablishments')
        .selectAll('usersEstablishments')
        .where('userId', '=', anotherUser.id)
        .execute();
      expect(rows).toHaveLength(0);
    });
  });

  describe('addAuthorizedEstablishment', () => {
    it('should insert a new authorized establishment', async () => {
      const anotherUser = await factories.user.create({
        establishmentId: establishment.id
      });

      await userEstablishmentRepository.addAuthorizedEstablishment(
        anotherUser.id,
        {
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: true
        }
      );

      const row = await kysely
        .selectFrom('usersEstablishments')
        .selectAll('usersEstablishments')
        .where('userId', '=', anotherUser.id)
        .where('establishmentId', '=', establishment.id)
        .executeTakeFirst();
      expect(row).toMatchObject({ hasCommitment: true });
    });

    it('should update has_commitment on conflict instead of duplicating', async () => {
      const anotherUser = await factories.user.create({
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: anotherUser.id,
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();

      await userEstablishmentRepository.addAuthorizedEstablishment(
        anotherUser.id,
        {
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: true
        }
      );

      const rows = await kysely
        .selectFrom('usersEstablishments')
        .selectAll('usersEstablishments')
        .where('userId', '=', anotherUser.id)
        .where('establishmentId', '=', establishment.id)
        .execute();
      expect(rows).toHaveLength(1);
      expect(rows[0].hasCommitment).toBe(true);
    });
  });

  describe('hasAccessToEstablishment', () => {
    it('should return true when the user has access', async () => {
      const anotherUser = await factories.user.create({
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: anotherUser.id,
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();

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
      const anotherUser = await factories.user.create({
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('usersEstablishments')
        .values([
          {
            userId: anotherUser.id,
            establishmentId: establishment.id,
            establishmentSiren: establishment.siren,
            hasCommitment: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            userId: anotherUser.id,
            establishmentId: otherEstablishment.id,
            establishmentSiren: otherEstablishment.siren,
            hasCommitment: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ])
        .execute();

      const actual = await userEstablishmentRepository.isMultiStructure(
        anotherUser.id
      );
      expect(actual).toBe(true);
    });

    it('should return false when the user has one or zero committed establishments', async () => {
      const anotherUser = await factories.user.create({
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: anotherUser.id,
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();

      const actual = await userEstablishmentRepository.isMultiStructure(
        anotherUser.id
      );
      expect(actual).toBe(false);
    });
  });
});
