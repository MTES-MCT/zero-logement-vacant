import { describe, expect, it, vi } from 'vitest';

import { MemoryAdapter } from '../../memory-adapter';
import { createCampaignFactory } from '../campaign';
import { createEstablishmentFactory } from '../establishment';
import { createUserFactory } from '../user';

describe('createCampaignFactory', () => {
  it('builds a CampaignDTO with the provided user association', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const user = createUserFactory(adapter).build();
    const campaign = createCampaignFactory(adapter, establishment).build(
      {},
      { associations: { createdBy: user } }
    );

    expect(campaign.id).toBeDefined();
    expect(campaign.title).toBeDefined();
    expect(campaign.status).toBeDefined();
    expect(campaign.createdBy).toStrictEqual(user);
  });

  it('throws when createdBy association is not provided', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const factory = createCampaignFactory(adapter, establishment);

    expect(() => factory.build()).toThrow('createdBy association is required');
  });

  it('creates via the adapter with table "campaigns"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const establishment = createEstablishmentFactory(adapter).build();
    const user = createUserFactory(adapter).build();
    const campaign = await createCampaignFactory(adapter, establishment).create(
      {},
      { associations: { createdBy: user } }
    );

    expect(spy).toHaveBeenCalledWith(
      'campaigns',
      expect.objectContaining({ id: campaign.id }),
      { establishmentId: establishment.id }
    );
  });

  it('builds a list of campaigns', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const user = createUserFactory(adapter).build();
    const campaigns = createCampaignFactory(adapter, establishment).buildList(
      3,
      {},
      { associations: { createdBy: user } }
    );

    expect(campaigns).toHaveLength(3);
  });
});
