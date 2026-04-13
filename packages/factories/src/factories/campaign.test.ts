import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createCampaignFactory } from './campaign';

describe('createCampaignFactory', () => {
  it('builds a CampaignDTO with required fields', () => {
    const factory = createCampaignFactory(new MemoryAdapter());
    const campaign = factory.build();

    expect(campaign.id).toBeDefined();
    expect(campaign.title).toBeDefined();
    expect(campaign.status).toBeDefined();
    expect(campaign.createdBy).toBeDefined();
    expect(campaign.createdBy.id).toBeDefined();
  });

  it('allows overriding the creator', () => {
    const factory = createCampaignFactory(new MemoryAdapter());
    const campaign = factory.build({ createdBy: { id: 'user-42' } as any });

    expect(campaign.createdBy.id).toBe('user-42');
  });

  it('creates via the adapter with table "campaigns"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createCampaignFactory(adapter);

    const campaign = await factory.create();

    expect(spy).toHaveBeenCalledWith('campaigns', expect.objectContaining({ id: campaign.id }));
  });

  it('builds a list of campaigns', () => {
    const factory = createCampaignFactory(new MemoryAdapter());
    const campaigns = factory.buildList(3);

    expect(campaigns).toHaveLength(3);
  });
});
