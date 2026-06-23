import type { CampaignDTO, UserDTO } from '@zerologementvacant/models';
import { describe, expect, it } from 'vitest';

import { MemoryAdapter } from '../memory-adapter';

describe('MemoryAdapter', () => {
  it('creates an entity and returns it unchanged', async () => {
    const adapter = new MemoryAdapter();
    const user = {
      id: 'user-1',
      email: 'test@example.com'
    } as UserDTO;

    const result = await adapter.create('users', user);

    expect(result).toBe(user);
  });

  it('forwards establishment context for campaigns without mutating the entity', async () => {
    const adapter = new MemoryAdapter();
    const campaign = { id: 'campaign-1' } as unknown as CampaignDTO;

    const result = await adapter.create('campaigns', campaign, {
      establishmentId: 'establishment-1'
    });

    expect(result).toBe(campaign);
    expect(result).not.toHaveProperty('establishmentId');
  });
});
