import { faker } from '@faker-js/faker/locale/fr';

import { kysely } from '~/infra/database/kysely';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { genUserApi } from '~/test/testFixtures';

import userRepository from '../userRepository';

describe('User repository', () => {
  describe('get', () => {
    it('should return the user matching the id', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });

      const actual = await userRepository.get(user.id);

      expect(actual).toMatchObject<Partial<UserApi>>({
        id: user.id,
        email: user.email
      });
    });

    it('should return null if no user matches the id', async () => {
      const actual = await userRepository.get(faker.string.uuid());

      expect(actual).toBeNull();
    });

    it('should not return a deleted user', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id,
        deletedAt: new Date().toJSON()
      });

      const actual = await userRepository.get(user.id);

      expect(actual).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should return the user matching the email, case-insensitively', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });

      const actual = await userRepository.getByEmail(user.email.toUpperCase());

      expect(actual).toMatchObject<Partial<UserApi>>({ id: user.id });
    });

    it('should return null if no user matches the email', async () => {
      const actual = await userRepository.getByEmail(faker.internet.email());

      expect(actual).toBeNull();
    });

    it('should not return a deleted user', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id,
        deletedAt: new Date().toJSON()
      });

      const actual = await userRepository.getByEmail(user.email);

      expect(actual).toBeNull();
    });
  });

  describe('getByEmailIncludingDeleted', () => {
    it('should return a deleted user', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id,
        deletedAt: new Date().toJSON()
      });

      const actual = await userRepository.getByEmailIncludingDeleted(
        user.email
      );

      expect(actual).toMatchObject<Partial<UserApi>>({ id: user.id });
    });

    it('should return null if no user matches the email', async () => {
      const actual = await userRepository.getByEmailIncludingDeleted(
        faker.internet.email()
      );

      expect(actual).toBeNull();
    });
  });

  describe('update', () => {
    it('should update the user fields', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });

      await userRepository.update({ ...user, firstName: 'Updated' });

      const actual = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();
      expect(actual?.firstName).toBe('Updated');
    });

    it('should not overwrite the account password from the legacy password field', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });

      await userRepository.update({
        ...user,
        firstName: 'Updated',
        password: 'should-not-be-persisted'
      });

      const after = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();
      expect(after?.password).toBe(user.password);
    });
  });

  describe('updateEstablishment', () => {
    it('should update the user establishment', async () => {
      const establishment = await factories.establishment.create();
      const otherEstablishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });

      await userRepository.updateEstablishment(user.id, otherEstablishment.id);

      const actual = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();
      expect(actual?.establishmentId).toBe(otherEstablishment.id);
    });
  });

  describe('recordTwoFactorFailure', () => {
    it('should increment the failed attempts counter', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });

      await userRepository.recordTwoFactorFailure(user.id, 5, new Date());

      const row = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();
      expect(row?.twoFactorFailedAttempts).toBe(1);
    });

    it('should lock the account once the maximum attempts is reached', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const lockedUntil = new Date(Date.now() + 60_000);

      await userRepository.recordTwoFactorFailure(user.id, 1, lockedUntil);

      const row = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();
      expect(row?.twoFactorFailedAttempts).toBe(1);
      expect(row?.twoFactorLockedUntil).not.toBeNull();
    });

    it('should not overwrite an existing lock once already set', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const firstLock = new Date(Date.now() + 60_000);
      await userRepository.recordTwoFactorFailure(user.id, 1, firstLock);
      const afterFirst = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();

      const secondLock = new Date(Date.now() + 120_000);
      await userRepository.recordTwoFactorFailure(user.id, 1, secondLock);

      const afterSecond = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();
      expect(new Date(afterSecond?.twoFactorLockedUntil ?? 0).getTime()).toBe(
        new Date(afterFirst?.twoFactorLockedUntil ?? 0).getTime()
      );
    });
  });

  describe('insert', () => {
    it('should insert and return the user', async () => {
      const establishment = await factories.establishment.create();
      const user = genUserApi(establishment.id);

      const actual = await userRepository.insert(user);

      expect(actual).toMatchObject<Partial<UserApi>>({
        id: user.id,
        email: user.email
      });
      const row = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();
      expect(row).toBeDefined();
    });

    it('should round-trip the optional suspension and two-factor timestamps', async () => {
      const establishment = await factories.establishment.create();
      const now = new Date().toJSON();
      const user: UserApi = {
        ...genUserApi(establishment.id),
        lastAuthenticatedAt: now,
        suspendedAt: now,
        suspendedCause: 'test',
        twoFactorEnabledAt: now,
        twoFactorCodeGeneratedAt: now,
        twoFactorLockedUntil: now
      };

      const actual = await userRepository.insert(user);

      expect(actual).toMatchObject<Partial<UserApi>>({
        suspendedCause: 'test'
      });
      expect(actual.suspendedAt).not.toBeNull();
      expect(actual.twoFactorEnabledAt).not.toBeNull();
      expect(actual.twoFactorCodeGeneratedAt).not.toBeNull();
      expect(actual.twoFactorLockedUntil).not.toBeNull();
    });
  });

  describe('find', () => {
    it('should return all non-deleted users by default (paginated to 50)', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const deletedUser = await factories.user.create({
        establishmentId: establishment.id,
        deletedAt: new Date().toJSON()
      });

      const actual = await userRepository.find();

      const ids = actual.map((u) => u.id);
      expect(ids).toContain(user.id);
      expect(ids).not.toContain(deletedUser.id);
    });

    it('should filter by establishments with commitment', async () => {
      const establishment = await factories.establishment.create();
      const otherEstablishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const otherUser = await factories.user.create({
        establishmentId: otherEstablishment.id
      });
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: user.id,
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();

      const actual = await userRepository.find({
        filters: { establishments: [establishment.id] }
      });

      const ids = actual.map((u) => u.id);
      expect(ids).toContain(user.id);
      expect(ids).not.toContain(otherUser.id);
    });

    it('should not duplicate users with multiple establishment commitments', async () => {
      const establishment = await factories.establishment.create();
      const otherEstablishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('usersEstablishments')
        .values([
          {
            userId: user.id,
            establishmentId: establishment.id,
            establishmentSiren: establishment.siren,
            hasCommitment: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            userId: user.id,
            establishmentId: otherEstablishment.id,
            establishmentSiren: otherEstablishment.siren,
            hasCommitment: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ])
        .execute();

      const actual = await userRepository.find({
        filters: { establishments: [establishment.id, otherEstablishment.id] }
      });

      expect(actual.filter((u) => u.id === user.id)).toHaveLength(1);
    });

    it('should disable pagination when requested', async () => {
      const establishment = await factories.establishment.create();
      await factories.user.createList(3, { establishmentId: establishment.id });

      const actual = await userRepository.find({
        pagination: { paginate: false }
      });

      expect(actual.length).toBeGreaterThanOrEqual(3);
    });

    it('should paginate explicitly', async () => {
      const establishment = await factories.establishment.create();
      await factories.user.createList(3, { establishmentId: establishment.id });

      const actual = await userRepository.find({
        pagination: { paginate: true, page: 1, perPage: 1 }
      });

      expect(actual).toBeArrayOfSize(1);
    });
  });

  describe('count', () => {
    it('should count non-deleted users', async () => {
      const establishment = await factories.establishment.create();
      await factories.user.create({ establishmentId: establishment.id });
      await factories.user.create({
        establishmentId: establishment.id,
        deletedAt: new Date().toJSON()
      });

      const before = await userRepository.count();
      await factories.user.create({ establishmentId: establishment.id });
      const after = await userRepository.count();

      expect(after).toBe(before + 1);
    });

    it('should count filtered by establishments with commitment', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('usersEstablishments')
        .values({
          userId: user.id,
          establishmentId: establishment.id,
          establishmentSiren: establishment.siren,
          hasCommitment: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .execute();

      const actual = await userRepository.count({
        filters: { establishments: [establishment.id] }
      });

      expect(actual).toBe(1);
    });
  });

  describe('remove', () => {
    it('should soft-delete the user', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });

      await userRepository.remove(user.id);

      const row = await kysely
        .selectFrom('users')
        .selectAll('users')
        .where('id', '=', user.id)
        .executeTakeFirst();
      expect(row?.deletedAt).not.toBeNull();
    });
  });
});
