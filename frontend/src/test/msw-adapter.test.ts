import type {
  CampaignDTO,
  EstablishmentDTO,
  UserDTO
} from '@zerologementvacant/models';
import { afterEach, describe, expect, it } from 'vitest';

import data from '~/mocks/handlers/data';

import { MswAdapter } from './msw-adapter';

describe('MswAdapter', () => {
  afterEach(() => {
    data.reset();
  });

  it('pushes establishments into data.establishments', async () => {
    const adapter = new MswAdapter();
    const establishment = { id: 'establishment-1' } as EstablishmentDTO;

    const result = await adapter.create('establishments', establishment);

    expect(result).toBe(establishment);
    expect(data.establishments).toContain(establishment);
  });

  it('pushes users into data.users', async () => {
    const adapter = new MswAdapter();
    const user = { id: 'user-1' } as UserDTO;

    await adapter.create('users', user);

    expect(data.users).toContain(user);
  });

  it('pushes campaigns into data.campaigns and ignores the establishment context', async () => {
    const adapter = new MswAdapter();
    const campaign = { id: 'campaign-1' } as unknown as CampaignDTO;

    await adapter.create('campaigns', campaign, {
      establishmentId: 'establishment-1'
    });

    expect(data.campaigns).toContain(campaign);
    expect(campaign).not.toHaveProperty('establishmentId');
  });
});
