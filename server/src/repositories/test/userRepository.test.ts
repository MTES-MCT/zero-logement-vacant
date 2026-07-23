import { faker } from '@faker-js/faker/locale/fr';

import { UserApi } from '~/models/UserApi';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import { UsersEstablishments } from '../user-establishment-repository';
import userRepository, { toUserDBO, Users } from '../userRepository';

describe('User repository', () => {
  describe('get', () => {
    it('should return the user matching the id', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));

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
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = {
        ...genUserApi(establishment.id),
        deletedAt: new Date().toJSON()
      };
      await Users().insert(toUserDBO(user));

      const actual = await userRepository.get(user.id);

      expect(actual).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should return the user matching the email, case-insensitively', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));

      const actual = await userRepository.getByEmail(user.email.toUpperCase());

      expect(actual).toMatchObject<Partial<UserApi>>({ id: user.id });
    });

    it('should return null if no user matches the email', async () => {
      const actual = await userRepository.getByEmail(faker.internet.email());

      expect(actual).toBeNull();
    });

    it('should not return a deleted user', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = {
        ...genUserApi(establishment.id),
        deletedAt: new Date().toJSON()
      };
      await Users().insert(toUserDBO(user));

      const actual = await userRepository.getByEmail(user.email);

      expect(actual).toBeNull();
    });
  });

  describe('getByEmailIncludingDeleted', () => {
    it('should return a deleted user', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = {
        ...genUserApi(establishment.id),
        deletedAt: new Date().toJSON()
      };
      await Users().insert(toUserDBO(user));

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
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));

      await userRepository.update({ ...user, firstName: 'Updated' });

      const actual = await userRepository.get(user.id);
      expect(actual?.firstName).toBe('Updated');
    });

    it('should not overwrite the account password from the legacy password field', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      const before = await Users().where({ id: user.id }).first();

      await userRepository.update({
        ...user,
        firstName: 'Updated',
        password: 'should-not-be-persisted'
      });

      const after = await Users().where({ id: user.id }).first();
      expect(after?.password).toBe(before?.password);
    });
  });

  describe('updateEstablishment', () => {
    it('should update the user establishment', async () => {
      const establishment = genEstablishmentApi();
      const otherEstablishment = genEstablishmentApi();
      await Establishments().insert(
        [establishment, otherEstablishment].map(formatEstablishmentApi)
      );
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));

      await userRepository.updateEstablishment(user.id, otherEstablishment.id);

      const actual = await userRepository.get(user.id);
      expect(actual?.establishmentId).toBe(otherEstablishment.id);
    });
  });

  describe('recordTwoFactorFailure', () => {
    it('should increment the failed attempts counter', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));

      await userRepository.recordTwoFactorFailure(user.id, 5, new Date());

      const row = await Users().where({ id: user.id }).first();
      expect(row?.two_factor_failed_attempts).toBe(1);
    });

    it('should lock the account once the maximum attempts is reached', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      const lockedUntil = new Date(Date.now() + 60_000);

      await userRepository.recordTwoFactorFailure(user.id, 1, lockedUntil);

      const row = await Users().where({ id: user.id }).first();
      expect(row?.two_factor_failed_attempts).toBe(1);
      expect(row?.two_factor_locked_until).not.toBeNull();
    });

    it('should not overwrite an existing lock once already set', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      const firstLock = new Date(Date.now() + 60_000);
      await userRepository.recordTwoFactorFailure(user.id, 1, firstLock);
      const afterFirst = await Users().where({ id: user.id }).first();

      const secondLock = new Date(Date.now() + 120_000);
      await userRepository.recordTwoFactorFailure(user.id, 1, secondLock);

      const afterSecond = await Users().where({ id: user.id }).first();
      expect(
        new Date(afterSecond?.two_factor_locked_until ?? 0).getTime()
      ).toBe(new Date(afterFirst?.two_factor_locked_until ?? 0).getTime());
    });
  });

  describe('insert', () => {
    it('should insert and return the user', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);

      const actual = await userRepository.insert(user);

      expect(actual).toMatchObject<Partial<UserApi>>({
        id: user.id,
        email: user.email
      });
      const row = await Users().where({ id: user.id }).first();
      expect(row).toBeDefined();
    });

    it('should round-trip the optional suspension and two-factor timestamps', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
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

      await userRepository.insert(user);
      const actual = await userRepository.get(user.id);

      expect(actual).toMatchObject<Partial<UserApi>>({
        suspendedCause: 'test'
      });
      expect(actual?.suspendedAt).not.toBeNull();
      expect(actual?.twoFactorEnabledAt).not.toBeNull();
      expect(actual?.twoFactorCodeGeneratedAt).not.toBeNull();
      expect(actual?.twoFactorLockedUntil).not.toBeNull();
    });
  });

  describe('find', () => {
    it('should return all non-deleted users by default (paginated to 50)', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      const deletedUser = {
        ...genUserApi(establishment.id),
        deletedAt: new Date().toJSON()
      };
      await Users().insert([user, deletedUser].map(toUserDBO));

      const actual = await userRepository.find();

      const ids = actual.map((u) => u.id);
      expect(ids).toContain(user.id);
      expect(ids).not.toContain(deletedUser.id);
    });

    it('should filter by establishments with commitment', async () => {
      const establishment = genEstablishmentApi();
      const otherEstablishment = genEstablishmentApi();
      await Establishments().insert(
        [establishment, otherEstablishment].map(formatEstablishmentApi)
      );
      const user = genUserApi(establishment.id);
      const otherUser = genUserApi(otherEstablishment.id);
      await Users().insert([user, otherUser].map(toUserDBO));
      await UsersEstablishments().insert({
        user_id: user.id,
        establishment_id: establishment.id,
        establishment_siren: establishment.siren,
        has_commitment: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      const actual = await userRepository.find({
        filters: { establishments: [establishment.id] }
      });

      const ids = actual.map((u) => u.id);
      expect(ids).toContain(user.id);
      expect(ids).not.toContain(otherUser.id);
    });

    it('should not duplicate users with multiple establishment commitments', async () => {
      const establishment = genEstablishmentApi();
      const otherEstablishment = genEstablishmentApi();
      await Establishments().insert(
        [establishment, otherEstablishment].map(formatEstablishmentApi)
      );
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await UsersEstablishments().insert([
        {
          user_id: user.id,
          establishment_id: establishment.id,
          establishment_siren: establishment.siren,
          has_commitment: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          user_id: user.id,
          establishment_id: otherEstablishment.id,
          establishment_siren: otherEstablishment.siren,
          has_commitment: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const actual = await userRepository.find({
        filters: { establishments: [establishment.id, otherEstablishment.id] }
      });

      expect(actual.filter((u) => u.id === user.id)).toHaveLength(1);
    });

    it('should disable pagination when requested', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const users = faker.helpers.multiple(() => genUserApi(establishment.id), {
        count: 3
      });
      await Users().insert(users.map(toUserDBO));

      const actual = await userRepository.find({
        pagination: { paginate: false }
      });

      expect(actual.length).toBeGreaterThanOrEqual(3);
    });

    it('should paginate explicitly', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const users = faker.helpers.multiple(() => genUserApi(establishment.id), {
        count: 3
      });
      await Users().insert(users.map(toUserDBO));

      const actual = await userRepository.find({
        pagination: { paginate: true, page: 1, perPage: 1 }
      });

      expect(actual).toBeArrayOfSize(1);
    });
  });

  describe('count', () => {
    it('should count non-deleted users', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      const deletedUser = {
        ...genUserApi(establishment.id),
        deletedAt: new Date().toJSON()
      };
      await Users().insert([user, deletedUser].map(toUserDBO));

      const before = await userRepository.count();
      await Users().insert(toUserDBO(genUserApi(establishment.id)));
      const after = await userRepository.count();

      expect(after).toBe(before + 1);
    });

    it('should count filtered by establishments with commitment', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await UsersEstablishments().insert({
        user_id: user.id,
        establishment_id: establishment.id,
        establishment_siren: establishment.siren,
        has_commitment: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      const actual = await userRepository.count({
        filters: { establishments: [establishment.id] }
      });

      expect(actual).toBe(1);
    });
  });

  describe('remove', () => {
    it('should soft-delete the user', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));

      await userRepository.remove(user.id);

      const row = await Users().where({ id: user.id }).first();
      expect(row?.deleted_at).not.toBeNull();
      const actual = await userRepository.get(user.id);
      expect(actual).toBeNull();
    });
  });
});
