import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createCampaignFactory } from './campaign';
import { createUserFactory } from './user';

describe('createCampaignFactory', () => {
  it('builds a CampaignDTO with the provided user association', () => {
    const adapter = new MemoryAdapter();
    const user = createUserFactory(adapter).build();
    const campaign = createCampaignFactory(adapter).build({}, { associations: { createdBy: user } });

    expect(campaign.id).toBeDefined();
    expect(campaign.title).toBeDefined();
    expect(campaign.status).toBeDefined();
    expect(campaign.createdBy).toStrictEqual(user);
  });

  it('throws when createdBy association is not provided', () => {
    const factory = createCampaignFactory(new MemoryAdapter());

    expect(() => factory.build()).toThrow('createdBy association is required');
  });

  it('creates via the adapter with table "campaigns"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const user = createUserFactory(adapter).build();
    const campaign = await createCampaignFactory(adapter).create({}, { associations: { createdBy: user } });

    expect(spy).toHaveBeenCalledWith('campaigns', expect.objectContaining({ id: campaign.id }));
  });

  it('builds a list of campaigns', () => {
    const adapter = new MemoryAdapter();
    const user = createUserFactory(adapter).build();
    const campaigns = createCampaignFactory(adapter).buildList(3, {}, { associations: { createdBy: user } });

    expect(campaigns).toHaveLength(3);
  });
});
