import { faker } from '@faker-js/faker/locale/fr';
import { beforeAll, describe, expect, it } from 'vitest';

import db from '~/infra/database';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import settingsRepository, {
  formatSettingsApi,
  parseSettingsApi
} from '~/repositories/settingsRepository';
import { genEstablishmentApi } from '~/test/testFixtures';

// Knex accessor for test setup/assertion only
const Settings = () =>
  db<{ id: string; establishment_id: string; inbox_enabled: boolean }>(
    'settings'
  );

describe('settingsRepository', () => {
  const establishment = genEstablishmentApi();

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
  });

  describe('findOne', () => {
    it('should return null when no settings exist for an establishment', async () => {
      const result = await settingsRepository.findOne({
        establishmentId: faker.string.uuid()
      });
      expect(result).toBeNull();
    });

    it('should return settings for an existing establishment', async () => {
      const row = {
        id: faker.string.uuid(),
        establishment_id: establishment.id,
        inbox_enabled: true
      };
      await Settings().insert(row);

      const result = await settingsRepository.findOne({
        establishmentId: establishment.id
      });

      expect(result).toMatchObject({
        id: row.id,
        establishmentId: establishment.id,
        inbox: { enabled: true }
      });
    });
  });

  describe('upsert', () => {
    it('should insert settings when they do not exist', async () => {
      const establishment2 = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment2));

      const settings = {
        id: faker.string.uuid(),
        establishmentId: establishment2.id,
        inbox: { enabled: false }
      };

      await settingsRepository.upsert(settings);

      const row = await Settings()
        .where('establishment_id', establishment2.id)
        .first();
      expect(row).toMatchObject({
        establishment_id: establishment2.id,
        inbox_enabled: false
      });
    });

    it('should update inbox_enabled when settings already exist', async () => {
      const establishment3 = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment3));

      const id = faker.string.uuid();
      await Settings().insert({
        id,
        establishment_id: establishment3.id,
        inbox_enabled: false
      });

      await settingsRepository.upsert({
        id,
        establishmentId: establishment3.id,
        inbox: { enabled: true }
      });

      const row = await Settings()
        .where('id', id)
        .first();
      expect(row?.inbox_enabled).toBe(true);
    });
  });

  describe('parseSettingsApi', () => {
    it('should map Kysely row to SettingsApi', () => {
      const row = {
        id: faker.string.uuid(),
        establishmentId: faker.string.uuid(),
        inboxEnabled: true
      };
      expect(parseSettingsApi(row)).toEqual({
        id: row.id,
        establishmentId: row.establishmentId,
        inbox: { enabled: true }
      });
    });
  });

  describe('formatSettingsApi', () => {
    it('should map SettingsApi to snake_case DBO for Knex', () => {
      const api = {
        id: faker.string.uuid(),
        establishmentId: faker.string.uuid(),
        inbox: { enabled: false }
      };
      expect(formatSettingsApi(api)).toEqual({
        id: api.id,
        establishment_id: api.establishmentId,
        inbox_enabled: false
      });
    });
  });
});
