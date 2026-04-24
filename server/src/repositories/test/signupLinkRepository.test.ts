import { faker } from '@faker-js/faker/locale/fr';

import db from '~/infra/database';
import signupLinkRepository from '~/repositories/signupLinkRepository';

const SignupLinks = () =>
  db<{ id: string; prospect_email: string; expires_at: Date }>('signup_links');

function genSignupLinkApi() {
  return {
    id: faker.string.uuid(),
    prospectEmail: faker.internet.email(),
    expiresAt: new Date(Date.now() + 3_600_000)
  };
}

describe('signupLinkRepository', () => {
  describe('insert', () => {
    it('should insert a signup link', async () => {
      const link = genSignupLinkApi();
      await signupLinkRepository.insert(link);

      const row = await SignupLinks().where('id', link.id).first();
      expect(row).toMatchObject({ id: link.id, prospect_email: link.prospectEmail });
    });
  });

  describe('get', () => {
    it('should return null for a non-existent id', async () => {
      const result = await signupLinkRepository.get(faker.string.uuid());
      expect(result).toBeNull();
    });

    it('should return the signup link by id', async () => {
      const link = genSignupLinkApi();
      await SignupLinks().insert({
        id: link.id,
        prospect_email: link.prospectEmail,
        expires_at: link.expiresAt
      });

      const result = await signupLinkRepository.get(link.id);
      expect(result).toMatchObject({ id: link.id, prospectEmail: link.prospectEmail });
    });
  });

  describe('getByEmail', () => {
    it('should return null when no link exists for an email', async () => {
      const result = await signupLinkRepository.getByEmail(faker.internet.email());
      expect(result).toBeNull();
    });

    it('should return the signup link by prospect email', async () => {
      const link = genSignupLinkApi();
      await SignupLinks().insert({
        id: link.id,
        prospect_email: link.prospectEmail,
        expires_at: link.expiresAt
      });

      const result = await signupLinkRepository.getByEmail(link.prospectEmail);
      expect(result).toMatchObject({ id: link.id, prospectEmail: link.prospectEmail });
    });
  });

  describe('used', () => {
    it('should delete the signup link', async () => {
      const link = genSignupLinkApi();
      await SignupLinks().insert({
        id: link.id,
        prospect_email: link.prospectEmail,
        expires_at: link.expiresAt
      });

      await signupLinkRepository.used(link.id);

      const row = await SignupLinks().where('id', link.id).first();
      expect(row).toBeUndefined();
    });
  });
});
