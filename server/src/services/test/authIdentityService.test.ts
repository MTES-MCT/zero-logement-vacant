import { randomUUID } from 'node:crypto';

import bcrypt from 'bcryptjs';

import db from '~/infra/database';
import { SALT_LENGTH, UserApi } from '~/models/UserApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import {
  insertUserWithAuthIdentity,
  updateCredentialPassword,
  updateUserWithAuthIdentity,
  verifyCredentialPassword
} from '~/services/authIdentityService';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

// account.user_id has a foreign key to auth_users.id — seed it before
// inserting directly into account in these tests.
async function insertAuthUser(user: UserApi): Promise<void> {
  await db('auth_users').insert({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email.toLowerCase(),
    email_verified: true
  });
}

describe('authIdentityService', () => {
  describe('insertUserWithAuthIdentity', () => {
    it('should atomically create the user, auth identity, and credential account', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      const passwordHash = await bcrypt.hash('Password123!', SALT_LENGTH);

      const created = await insertUserWithAuthIdentity(user, passwordHash);

      expect(created).toMatchObject<Partial<UserApi>>({
        id: user.id,
        email: user.email
      });
      const userRow = await Users().where({ id: user.id }).first();
      expect(userRow).toBeDefined();
      expect(userRow?.password).toBeNull();

      const authUser = await db('auth_users').where({ id: user.id }).first();
      expect(authUser).toMatchObject({
        email: user.email.toLowerCase(),
        email_verified: true
      });

      const account = await db('account')
        .where({ user_id: user.id, provider_id: 'credential' })
        .first();
      expect(account).toBeDefined();
      expect(account.password).toBe(passwordHash);
      expect(account.account_id).toBe(user.email.toLowerCase());
    });

    it('should use the name derived from first/last name, falling back to email', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = {
        ...genUserApi(establishment.id),
        firstName: null,
        lastName: null
      };

      await insertUserWithAuthIdentity(user, 'hash');

      const authUser = await db('auth_users').where({ id: user.id }).first();
      expect(authUser.name).toBe(user.email);
    });
  });

  describe('updateUserWithAuthIdentity', () => {
    it('should update user fields and sync the auth identity', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await db('auth_users').insert({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email.toLowerCase(),
        email_verified: true
      });

      const updated = { ...user, firstName: 'Updated' };
      await updateUserWithAuthIdentity(updated);

      const userRow = await Users().where({ id: user.id }).first();
      expect(userRow?.first_name).toBe('Updated');
      const authUser = await db('auth_users').where({ id: user.id }).first();
      expect(authUser.name).toBe(`Updated ${user.lastName}`.trim());
    });

    it('should never overwrite users.password from the legacy field', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await db('auth_users').insert({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email.toLowerCase(),
        email_verified: true
      });
      const before = await Users().where({ id: user.id }).first();

      await updateUserWithAuthIdentity({
        ...user,
        password: 'should-not-be-persisted'
      });

      const after = await Users().where({ id: user.id }).first();
      expect(after?.password).toBe(before?.password);
    });

    it('should upsert the credential account when a credentialHash is provided', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await db('auth_users').insert({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email.toLowerCase(),
        email_verified: true
      });
      const newHash = await bcrypt.hash('NewPassword123!', SALT_LENGTH);

      await updateUserWithAuthIdentity(user, { credentialHash: newHash });

      const account = await db('account')
        .where({ user_id: user.id, provider_id: 'credential' })
        .first();
      expect(account.password).toBe(newHash);
    });

    it('should not touch the credential account when no credentialHash is provided', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await db('auth_users').insert({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email.toLowerCase(),
        email_verified: true
      });

      await updateUserWithAuthIdentity(user);

      const account = await db('account')
        .where({ user_id: user.id, provider_id: 'credential' })
        .first();
      expect(account).toBeUndefined();
    });
  });

  describe('updateCredentialPassword', () => {
    it('should create the credential account when none exists', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await insertAuthUser(user);
      const passwordHash = await bcrypt.hash('Password123!', SALT_LENGTH);

      await updateCredentialPassword(user.id, user.email, passwordHash);

      const account = await db('account')
        .where({ user_id: user.id, provider_id: 'credential' })
        .first();
      expect(account).toBeDefined();
      expect(account.password).toBe(passwordHash);
      expect(account.account_id).toBe(user.email.toLowerCase());
    });

    it('should update the existing credential account', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await insertAuthUser(user);
      const accountId = randomUUID();
      await db('account').insert({
        id: accountId,
        account_id: user.email,
        provider_id: 'credential',
        user_id: user.id,
        password: 'old-hash'
      });
      const newHash = await bcrypt.hash('NewPassword123!', SALT_LENGTH);

      await updateCredentialPassword(user.id, user.email, newHash);

      const account = await db('account').where({ id: accountId }).first();
      expect(account.password).toBe(newHash);
    });
  });

  describe('verifyCredentialPassword', () => {
    it('should return true for a matching bcrypt password', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await insertAuthUser(user);
      const passwordHash = await bcrypt.hash('Password123!', SALT_LENGTH);
      await db('account').insert({
        id: randomUUID(),
        account_id: user.email,
        provider_id: 'credential',
        user_id: user.id,
        password: passwordHash
      });

      const actual = await verifyCredentialPassword(user.id, 'Password123!');

      expect(actual).toBe(true);
    });

    it('should return false for a non-matching password', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      await insertAuthUser(user);
      const passwordHash = await bcrypt.hash('Password123!', SALT_LENGTH);
      await db('account').insert({
        id: randomUUID(),
        account_id: user.email,
        provider_id: 'credential',
        user_id: user.id,
        password: passwordHash
      });

      const actual = await verifyCredentialPassword(user.id, 'WrongPassword!');

      expect(actual).toBe(false);
    });

    it('should return false when no credential account exists', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));

      const actual = await verifyCredentialPassword(user.id, 'Password123!');

      expect(actual).toBe(false);
    });
  });
});
